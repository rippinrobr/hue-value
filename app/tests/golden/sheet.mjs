// Draws the painting sheet with today's app and with the port, then compares every pixel.
// Run from app/ with: npm run golden:sheet
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { openTodaysApp } from './harness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '../..');

const bundled = await build({
	configFile: false,
	logLevel: 'error',
	root: appRoot,
	build: {
		write: false,
		minify: false,
		lib: {
			entry: path.join(appRoot, 'src/lib/engine/index.ts'),
			name: 'Engine',
			formats: ['iife'],
			fileName: () => 'engine.js'
		}
	}
});
const engine = bundled.output?.[0].code ?? bundled[0].output[0].code;

const brighten = { x: 0.4, y: 0.5, r: 0.2 };
const CASES = [
	{ name: 'mono-default', settings: { palette: 'mono' } },
	{ name: 'mono-complement', settings: { palette: 'mono', darks: 'comp' } },
	{ name: 'mono-tones-9-even', settings: { palette: 'mono', n: 9, mode: 'even' } },
	{ name: 'mono-cobra-acrylic', settings: { palette: 'mono', brand: 'cobra', med: 'acrylic' } },
	{ name: 'mono-map-colors', settings: { palette: 'mono', show: 'map' } },
	{ name: 'mono-brighten', settings: { palette: 'mono' }, brighten },
	{ name: 'zorn', settings: { palette: 'zorn' } },
	{ name: 'primary-cobra-map', settings: { palette: 'primary', brand: 'cobra', show: 'map' } },
	{ name: 'warmcool-brighten', settings: { palette: 'warmcool' }, brighten }
];

const { browser, page, problems } = await openTodaysApp({ fixedTime: '2026-11-05T12:00:00' });
await page.addScriptTag({ content: engine });

let failed = 0;
for (const name of ['app-sample', 'still-life', 'color-field']) {
	const file = path.join(here, 'images', `${name}.png`);
	const png = (await readFile(file)).toString('base64');
	const results = await page.evaluate(
		async ({ png, CASES }) => {
			const image = new Image();
			image.src = `data:image/png;base64,${png}`;
			await image.decode();
			const { width, height } = image;
			const flat = document.createElement('canvas');
			flat.width = width;
			flat.height = height;
			const fg = flat.getContext('2d');
			fg.drawImage(image, 0, 0);
			const pixels = fg.getImageData(0, 0, width, height).data;
			const read = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height);
			const out = [];
			for (const c of CASES) {
				window.__golden.run(image, c);
				const before = await window.__golden.buildSheet();
				const settings = {
					...window.Engine.DEFAULT_SETTINGS,
					label: 'case',
					...c.settings
				};
				const channels = window.Engine.imageChannels(pixels, width, height);
				if (c.brighten) {
					const b = c.brighten;
					for (let y = 0; y < height; y++)
						for (let x = 0; x < width; x++)
							if (Math.hypot(x - b.x * width, y - b.y * height) < b.r * width)
								channels.mask[y * width + x] = 1;
				}
				const study = window.Engine.analyze(channels, settings);
				const after = await window.Engine.drawSheet({
					source: image,
					sourceWidth: width,
					sourceHeight: height,
					channels,
					study,
					settings,
					date: new Date()
				});
				const a = read(before).data;
				const b = read(after).data;
				let different = 0;
				if (a.length === b.length)
					for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) different++;
				out.push({
					name: c.name,
					before: [before.width, before.height],
					after: [after.width, after.height],
					different,
					bytes: a.length
				});
			}
			return out;
		},
		{ png, CASES }
	);
	for (const r of results) {
		const same = r.before.join() === r.after.join() && r.different === 0;
		if (!same) failed++;
		console.log(
			`${same ? 'same' : 'DIFF'}  ${name} ${r.name} ${r.after.join('×')} (${r.different} differ)`
		);
	}
}
await browser.close();
if (problems.length) console.error(problems);
if (failed || problems.length) process.exit(1);
console.log('Every sheet matches, pixel for pixel.');
