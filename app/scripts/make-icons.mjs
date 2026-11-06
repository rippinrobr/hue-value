// Draws the app icons as PNGs from static/icons/icon.svg, in Chromium.
// Run from app/ with: npm run icons
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const icons = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../static/icons');
const svg = await readFile(path.join(icons, 'icon.svg'), 'utf8');
const square = svg.replace(' rx="104"', '');

// Maskable icons are cropped by the phone, so they fill the square with no rounded corners.
// The Apple icon has no transparency, because iOS rounds it itself.
const OUTPUT = [
	{ file: 'icon-192.png', size: 192, source: svg, transparent: true },
	{ file: 'icon-512.png', size: 512, source: svg, transparent: true },
	{ file: 'icon-maskable-512.png', size: 512, source: square, transparent: false },
	{ file: 'apple-touch-icon.png', size: 180, source: square, transparent: false }
];

const browser = await chromium.launch();
for (const { file, size, source, transparent } of OUTPUT) {
	const page = await browser.newPage({ viewport: { width: size, height: size } });
	await page.setContent(
		`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`
	);
	const png = await page.screenshot({ omitBackground: transparent });
	await writeFile(path.join(icons, file), png);
	await page.close();
}
await browser.close();
console.log(`Wrote ${OUTPUT.length} icons`);
