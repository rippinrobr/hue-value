// Runs the engine in a real browser worker, with large photos, against today's app.
// Run from app/ with: npm run test:worker
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { openTodaysApp } from '../golden/harness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = await mkdtemp(path.join(tmpdir(), 'hue-value-worker-'));
await build({
	configFile: false,
	logLevel: 'error',
	root: here,
	build: { outDir, emptyOutDir: true, minify: false },
	worker: { format: 'es' }
});

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (request, response) => {
	const pathname = new URL(request.url, 'http://x').pathname;
	const file = path.join(outDir, pathname === '/' ? 'index.html' : pathname);
	try {
		const body = await readFile(file);
		response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'text/plain' });
		response.end(body);
	} catch {
		response.writeHead(404).end();
	}
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const brighten = { x: 0.4, y: 0.5, r: 0.2 };
const CASES = [
	{ name: 'mono-default', settings: { palette: 'mono' } },
	{ name: 'mono-complement', settings: { palette: 'mono', darks: 'comp', n: 9 } },
	{ name: 'mono-brighten', settings: { palette: 'mono' }, brighten },
	{ name: 'zorn', settings: { palette: 'zorn' } },
	{ name: 'primary-cobra-12', settings: { palette: 'primary', brand: 'cobra', nColors: 12 } },
	{ name: 'warmcool-brighten', settings: { palette: 'warmcool' }, brighten }
];
// Sizes like a phone photo: both orientations, and one small enough to stay as it is.
const PHOTOS = [
	{ image: 'still-life', width: 3024, height: 3780 },
	{ image: 'app-sample', width: 4032, height: 3024 },
	{ image: 'color-field', width: 320, height: 400 }
];

const { browser, page, problems } = await openTodaysApp();
const test = await page.context().newPage();
test.on('pageerror', (e) => problems.push(e.message));
await test.goto(`${origin}/`);
await test.waitForFunction(() => window.workerTest);

let failed = 0;
const report = (ok, message) => {
	if (!ok) failed++;
	console.log(`${ok ? 'same' : 'DIFF'}  ${message}`);
};
let largest;
for (const photo of PHOTOS) {
	const source = (
		await readFile(path.join(here, '../golden/images', `${photo.image}.png`))
	).toString('base64');
	const png = await page.evaluate(
		async ({ source, width, height }) => {
			const image = new Image();
			image.src = `data:image/png;base64,${source}`;
			await image.decode();
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			canvas.getContext('2d').drawImage(image, 0, 0, width, height);
			return canvas.toDataURL('image/png');
		},
		{ source, width: photo.width, height: photo.height }
	);
	largest = png.length > (largest?.length ?? 0) ? png : largest;
	const before = await page.evaluate(
		async ({ png, CASES }) => {
			const image = new Image();
			image.src = png;
			await image.decode();
			return CASES.map((c) => ({ name: c.name, ...window.__golden.run(image, c) }));
		},
		{ png, CASES }
	);
	const after = await test.evaluate(({ png, CASES }) => window.workerTest.run(png, CASES), {
		png,
		CASES
	});
	before.forEach((old, i) => {
		const now = after[i];
		const keys = ['width', 'height', 'assign', 'zones', 'sheet'];
		const bad = keys.filter(
			(k) => JSON.stringify(JSON.parse(JSON.stringify(old[k]))) !== JSON.stringify(now[k])
		);
		report(
			!bad.length,
			`${photo.width}×${photo.height} ${old.name}, read at ${now.width}×${now.height}${bad.length ? ` (${bad.join(', ')})` : ''}`
		);
	});
}

const burst = await test.evaluate((png) => window.workerTest.burst(png), largest);
report(
	burst.answered === 1 && burst.lastTones === 7,
	`12 quick changes: ${burst.answered} answered, the last one`
);
const freeze = await test.evaluate((png) => window.workerTest.freeze(png), largest);
report(
	freeze.worker < 50 && freeze.worker * 3 < freeze.screen,
	`Longest freeze on the slowest analysis: ${freeze.worker} ms in the worker, ${freeze.screen} ms without it`
);

await browser.close();
server.close();
await rm(outDir, { recursive: true });
if (problems.length) console.error(problems);
if (failed || problems.length) process.exit(1);
console.log("The worker matches today's app.");
