// Opens today's index.html in Chromium with a read-only hook, for golden tests.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const legacy = existsSync(path.join(repo, 'legacy/index.html')) ? 'legacy' : '.';
const ORIGIN = 'http://golden.test';

// Exposes the app's private functions to this script. Runs just before its first image loads.
const HOOK = `
window.__golden={
  sample,
  buildSheet,
  run(image,c){
    Object.assign(state,{picked:true,sel:-1,palette:'mono',nColors:8,darks:'near',contrast:'natural',key:'natural',
      lift:12,brand:'artisan',n:5,mode:'fit',pig:'blue',med:'oil',show:'values'},c.settings);
    PIGMENTS=PALETTES[state.brand].paints;
    if(!byId(state.pig))throw new Error('No paint '+state.pig+' in '+state.brand);
    loadImage(image,'case');
    if(c.brighten){const b=c.brighten;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(Math.hypot(x-b.x*W,y-b.y*H)<b.r*W)mask[y*W+x]=1;
      adjust();}
    const mono=isMono(),round=v=>Math.round(v*1e6)/1e6,list=v=>v&&Array.from(v,round);
    return{
      width:W,height:H,assign:Array.from(assign),
      zones:zones.map(z=>({L:round(z.L),area:round(z.area),a:z.a===undefined?undefined:round(z.a),b:z.b===undefined?undefined:round(z.b),
        c:z.c===undefined?undefined:round(z.c),lim:z.lim,deep:z.deep===undefined?undefined:round(z.deep),partner:z.partner,short:z.short,
        w:list(z.w),err:z.err===undefined?undefined:round(z.err),mix:hex(z.mix),
        text:mono?ratioText(z,byId(state.pig)):recipeText(z)})),
      sheet:sheetText()
    };
  },
  search(query,brand){
    state.brand=brand;PIGMENTS=PALETTES[brand].paints;
    $('pickSearch').value=query;renderPicker();
    const box=$('pickList');
    return{query,brand,intro:box.querySelector('.pickempty')?.textContent??'',
      groups:[...box.querySelectorAll('.pickgroup')].map(g=>({title:g.querySelector('h4').textContent,
        items:[...g.querySelectorAll('.pickitem')].map(i=>({name:i.querySelector('.pn').textContent,
          brand:i.querySelector('.brandtag')?(Object.keys(PALETTES).find(b=>PALETTES[b].brand===i.querySelector('.brandtag').textContent)):'',
          meta:i.querySelector('.pm').textContent}))}))};
  }
};
`;

export async function openTodaysApp({ fixedTime } = {}) {
	const browser = await chromium.launch();
	const context = await browser.newContext({ serviceWorkers: 'block' });
	const page = await context.newPage();
	const problems = [];
	page.on('pageerror', (e) => problems.push(e.message));

	await page.route('**/*', async (route) => {
		const url = new URL(route.request().url());
		if (url.origin !== ORIGIN) return route.abort();
		const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
		const full = path.join(repo, legacy, file);
		if (file !== 'index.html') return route.fulfill({ path: full });
		const html = await readFile(full, 'utf8');
		const marker = "loadImage(sample(),'Example still life');";
		if (html.split(marker).length !== 2) throw new Error('The hook marker was not found once');
		return route.fulfill({ contentType: 'text/html', body: html.replace(marker, HOOK + marker) });
	});
	if (fixedTime) await page.clock.setFixedTime(fixedTime);
	await page.goto(`${ORIGIN}/`);
	return { browser, page, problems };
}
