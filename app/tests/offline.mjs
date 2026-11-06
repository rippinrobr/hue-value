// Tests install, offline use, updates and the upgrade from today's app, against a server
// that behaves like the Cloudflare Worker. Run from app/ after a build: npm run test:offline
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './worker-like-server.mjs';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = { root: path.join(app, 'dist'), swExtra: '' };
const repo = path.resolve(app, '..');
const legacyRoot = existsSync(path.join(repo, 'legacy/index.html'))
	? path.join(repo, 'legacy')
	: repo;

const { server, origin } = await serve(site);

// Stops a stuck run rather than waiting forever.
setTimeout(() => {
	console.log('FAIL  timed out');
	process.exit(1);
}, 150000).unref();

const browser = await chromium.launch();
let failed = 0;
const check = (ok, message) => {
	if (!ok) failed++;
	console.log(`${ok ? 'pass' : 'FAIL'}  ${message}`);
};

async function open() {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
	const page = await context.newPage();
	page.problems = [];
	page.on('pageerror', (e) => page.problems.push(e.message));
	return { context, page };
}
const ready = (page) => page.waitForFunction(() => navigator.serviceWorker.controller);
const controlled = async (page) => {
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	await ready(page);
};

// Nested addresses have to find their files, on a first visit and once installed.
async function nestedAddresses(page, when) {
	for (const [address, heading] of [
		['/palettes/123', 'Palette'],
		['/nope/here', 'Page not found']
	]) {
		await page.goto(origin + address);
		await page.waitForSelector(`h1:has-text("${heading}")`, { timeout: 8000 });
		check(true, `${address} shows "${heading}" ${when}`);
	}
}

// Install
{
	const { context, page } = await open();
	await nestedAddresses(page, 'on a first visit');
	await page.goto(origin);
	await page.waitForSelector('text=What are you painting today?');
	const manifest = await (await page.request.get(`${origin}/manifest.webmanifest`)).json();
	check(
		manifest.display === 'standalone' && manifest.start_url === '/',
		'manifest opens full screen at /'
	);
	for (const icon of manifest.icons) {
		const r = await page.request.get(`${origin}/${icon.src}`);
		check(r.ok(), `icon ${icon.src}${icon.purpose ? ` (${icon.purpose})` : ''}`);
	}
	check(
		(await page.request.get(`${origin}/icons/apple-touch-icon.png`)).ok(),
		'Apple home-screen icon'
	);
	await controlled(page);
	const cached = await page.evaluate(async () => {
		const names = await caches.keys();
		const urls = [];
		for (const n of names) urls.push(...(await (await caches.open(n)).keys()).map((r) => r.url));
		return urls;
	});
	check(
		cached.some((u) => /worker/.test(u)),
		'the analysis worker is cached'
	);
	check(cached.filter((u) => /woff2/.test(u)).length >= 7, 'the fonts are cached');
	check(!cached.some((u) => /cyrillic|greek|vietnamese/.test(u)), 'unused alphabets are left out');
	console.log(`      ${cached.length} files cached`);

	// Offline
	await context.setOffline(true);
	await page.reload();
	await page.waitForSelector('text=What are you painting today?');
	check(true, 'opens offline');
	await nestedAddresses(page, 'offline');
	await page.goto(`${origin}/settings`);
	await page.waitForSelector('text=Remember my palette');
	check(true, 'a direct address opens offline');
	await page.goto(origin);
	await page.waitForSelector('text=What are you painting today?');
	await page
		.locator('input[type=file]')
		.first()
		.setInputFiles(path.join(app, 'tests/golden/images/still-life.png'));
	await page.waitForSelector('text=Which paints will you use?');
	await page.getByRole('button', { name: 'See my values' }).click();
	await page.waitForSelector('text=Does this look right?');
	await page.getByRole('button', { name: 'Show me the mixes' }).click();
	await page.waitForSelector('.recipe');
	check(
		(await page.locator('.recipe').count()) === 5,
		'a photo gets its mixes offline, through the worker'
	);
	await page.getByRole('button', { name: 'Save painting sheet' }).click();
	await page.waitForSelector('text=Painting sheet ·', { timeout: 20000 });
	const fonts = await page.evaluate(() =>
		[...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
	);
	check(
		fonts.some((f) => f.includes('Bricolage')) && fonts.some((f) => f.includes('Plex Mono')),
		'the sheet draws offline with its fonts'
	);
	await context.setOffline(false);
	check(!page.problems.length, `no page errors offline ${page.problems}`);

	// Updates
	await page.goto(origin);
	await page.waitForSelector('text=What are you painting today?');
	await ready(page);
	site.swExtra = '\n// a new release\n';
	await page.reload();
	await page.waitForSelector('text=A new version is ready', { timeout: 15000 });
	check(true, 'a new release shows the update prompt');
	await page.getByRole('button', { name: 'Later' }).click();
	check(await page.locator('text=A new version is ready').isHidden(), 'Later dismisses it');
	await page.reload();
	await page.waitForSelector('text=A new version is ready', { timeout: 15000 });
	await Promise.all([
		page.waitForEvent('load'),
		page.getByRole('button', { name: 'Update' }).click()
	]);
	await page.waitForSelector('text=What are you painting today?');
	await page.waitForTimeout(1000);
	check(
		await page.locator('text=A new version is ready').isHidden(),
		'Update reloads into the new version'
	);
	site.swExtra = '';
	await context.close();
}

// The upgrade from today's app, as an installed phone will see it
{
	site.root = legacyRoot;
	const { context, page } = await open();
	await page.goto(origin);
	await page.waitForSelector('#mainC');
	await page.evaluate(() =>
		localStorage.setItem('valuemix.prefs', '{"brand":"cobra","med":"acrylic"}')
	);
	await ready(page);
	check(
		(await page.evaluate(() => caches.keys())).includes('hue-value-v17'),
		"today's app is installed"
	);
	site.root = path.join(app, 'dist');
	await page.reload();
	await page.waitForSelector('text=What are you painting today?', { timeout: 15000 });
	check(true, 'the new app loads over the old install');
	await page.waitForSelector('text=A new version is ready', { timeout: 15000 });
	await Promise.all([
		page.waitForEvent('load'),
		page.getByRole('button', { name: 'Update' }).click()
	]);
	await page.waitForSelector('text=What are you painting today?');
	await page.waitForTimeout(1000);
	await page.getByRole('link', { name: 'Settings' }).click();
	await page.waitForSelector('text=Remember my palette');
	const pressed = await page.locator('[aria-pressed="true"]').allTextContents();
	check(pressed.join() === 'Acrylic,Cobra', `saved settings carry over: ${pressed.join(', ')}`);
	await page.goto(origin);
	await page.waitForFunction(() => navigator.serviceWorker.controller);
	await context.setOffline(true);
	await page.reload();
	await page.waitForSelector('text=What are you painting today?');
	check(true, 'the upgraded install works offline');
	check(!page.problems.length, `no page errors in the upgrade ${page.problems}`);
	await context.close();
}

await browser.close();
server.close();
if (failed) process.exit(1);
console.log('Install, offline, updates and the upgrade all work.');
