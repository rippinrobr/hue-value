// Records what today's app produces, so the TypeScript port can be held to it.
// Run from app/ with: npm run golden:capture
//
// It opens today's index.html in Chromium and injects a read-only hook while the page
// loads. Nothing in the repo's app files changes. Sample images are saved as PNGs and
// each settings case is written to cases/<image>.json.
import { openTodaysApp } from './harness.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const base = { palette: 'mono' };
const MONO = [
	['default', {}],
	['tones-3', { n: 3 }],
	['tones-9', { n: 9 }],
	['even-steps', { mode: 'even' }],
	['contrast-soft', { contrast: 'soft' }],
	['contrast-punchy', { contrast: 'punchy' }],
	['contrast-bold', { contrast: 'bold' }],
	['key-darker', { key: 'darker' }],
	['key-brighter', { key: 'brighter' }],
	['darks-complement', { darks: 'comp' }],
	['acrylic', { med: 'acrylic' }],
	['red', { pig: 'red' }],
	['orange', { pig: 'orange' }],
	['phthalo-blue', { pig: 'pblue' }],
	['phthalo-green', { pig: 'green' }],
	['burnt-umber', { pig: 'burnt-umber' }],
	['cobra', { brand: 'cobra' }],
	['cobra-light-green', { brand: 'cobra', pig: 'lgreen' }]
].map(([name, settings]) => ({ name: `mono-${name}`, settings: { ...base, ...settings } }));

const LIMITED = ['zorn', 'primary', 'warmcool'].flatMap((palette) =>
	['artisan', 'cobra'].map((brand) => ({
		name: `${palette}-${brand}`,
		settings: { palette, brand }
	}))
);

const CASES = [
	...MONO,
	{ name: 'mono-brighten-area', settings: base, brighten: { x: 0.4, y: 0.5, r: 0.2 } },
	...LIMITED,
	{ name: 'zorn-colors-3', settings: { palette: 'zorn', nColors: 3 } },
	{ name: 'zorn-colors-12', settings: { palette: 'zorn', nColors: 12 } },
	{ name: 'primary-punchy', settings: { palette: 'primary', contrast: 'punchy' } },
	{ name: 'warmcool-acrylic', settings: { palette: 'warmcool', med: 'acrylic' } },
	{
		name: 'zorn-brighten-area',
		settings: { palette: 'zorn' },
		brighten: { x: 0.4, y: 0.5, r: 0.2 }
	}
];

const { browser, page, problems } = await openTodaysApp();

const images = path.join(here, 'images');
const cases = path.join(here, 'cases');
await mkdir(images, { recursive: true });
await mkdir(cases, { recursive: true });

// Sample images, drawn once and kept as PNGs so later runs read identical pixels.
const svg = await readFile(path.join(here, 'still-life.svg'), 'utf8');
const painters = {
	'app-sample': `(async()=>window.__golden.sample())()`,
	'still-life': `(async()=>{const i=new Image();i.src='data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}';
		await i.decode();const c=document.createElement('canvas');c.width=416;c.height=520;c.getContext('2d').drawImage(i,0,0,416,520);return c})()`,
	'color-field': `(async()=>{const c=document.createElement('canvas');c.width=320;c.height=400;const g=c.getContext('2d');let s=7;
		const r=()=>(s=(s*16807)%2147483647)/2147483647;
		for(let y=0;y<400;y+=20)for(let x=0;x<320;x+=20){g.fillStyle='rgb('+Math.floor(r()*256)+','+Math.floor(r()*256)+','+Math.floor(r()*256)+')';g.fillRect(x,y,20,20)}
		return c})()`
};

const pixelHash = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const [name, painter] of Object.entries(painters)) {
	const file = path.join(images, `${name}.png`);
	if (!existsSync(file)) {
		const dataUrl = await page.evaluate(`${painter}.then(c=>c.toDataURL('image/png'))`);
		await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
	}
	const png = (await readFile(file)).toString('base64');
	const results = await page.evaluate(
		async ({ png, CASES }) => {
			const image = new Image();
			image.src = `data:image/png;base64,${png}`;
			await image.decode();
			return CASES.map((c) => ({ ...c, ...window.__golden.run(image, c) }));
		},
		{ png, CASES }
	);
	const output = {
		image: `${name}.png`,
		cases: results.map(({ assign, ...rest }) => ({
			...rest,
			assignHash: pixelHash(Buffer.from(Uint8Array.from(assign)))
		}))
	};
	await writeFile(path.join(cases, `${name}.json`), `${JSON.stringify(output, null, '\t')}\n`);
	console.log(`${name}: ${output.cases.length} cases`);
}

const QUERIES = [
	'',
	'blue',
	'phthalo',
	'PB29',
	'pb15 pg7',
	'PB29,PG7',
	'PR101+PY42',
	'phthalo PB15',
	'P Bk 9',
	'PBk9',
	'pbr7',
	'ultramarine and PB29',
	'PV19 PB15 PY154',
	'zzzz',
	'PZ999'
];
const searches = await page.evaluate(
	(QUERIES) =>
		['artisan', 'cobra'].flatMap((brand) => QUERIES.map((q) => window.__golden.search(q, brand))),
	QUERIES
);
await writeFile(path.join(cases, 'search.json'), `${JSON.stringify(searches, null, '\t')}\n`);
console.log(`search: ${searches.length} cases`);

await browser.close();
if (problems.length) {
	console.error(problems);
	process.exit(1);
}
