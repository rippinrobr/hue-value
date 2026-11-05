import { chromium } from '@playwright/test';
const out = process.argv[2];
const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	hasTouch: true
});
const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror ' + e.message));
page.on('console', (m) => {
	if (m.type() === 'error') problems.push('console ' + m.text());
});
page.on('requestfailed', (r) => problems.push('failed ' + r.url()));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const overflow = async (n) => {
	const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
	if (o > 0) problems.push(`${n} overflows sideways by ${o}px`);
};
const say = (...a) => console.log(...a);

await page.goto('http://127.0.0.1:4173/');
await page.waitForSelector('text=What are you painting today?');
await shot('01-start');
await overflow('start');

await page.getByRole('link', { name: 'Settings' }).click();
await shot('02-settings');
await page.getByRole('button', { name: 'Done' }).click();

await page.getByRole('button', { name: 'Try it with the example' }).click();
await page.waitForSelector('text=Does this look right?');
await page.waitForTimeout(400);
await shot('03-values');
await overflow('values');

await page.getByRole('button', { name: 'Contrast, brightness and more' }).click();
await page.waitForSelector('text=Fine-tune your values');
await shot('04-tune');
await page.getByRole('button', { name: 'Paint on picture' }).click();
const box = await page.locator('canvas').last().boundingBox();
await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(300);
await shot('05-brush');
await page.getByRole('button', { name: 'Clear brightened area' }).waitFor();
await page.getByRole('button', { name: 'Clear brightened area' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Done' }).click();

await page.getByRole('button', { name: 'Show me the mixes' }).click();
await page.waitForSelector('text=Your mixes');
await page.waitForTimeout(200);
await shot('06-mix');
await overflow('mix');
say('first recipe:', await page.locator('.recipe').first().textContent());
say('recipes:', await page.locator('.recipe').count());
await page.locator('.mix').nth(2).click();
await page.waitForTimeout(150);
await shot('07-mix-selected');
await page.getByRole('button', { name: 'Complement' }).click();
await page.waitForTimeout(250);
say('complement recipe:', await page.locator('.recipe').first().textContent());
await page.getByRole('button', { name: 'Same family' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Paints to set out' }).click();
await page.waitForSelector('text=Before you paint');
await shot('08-paints');
await page.getByRole('button', { name: 'Back to my mixes' }).click();

await page.getByRole('button', { name: 'Save painting sheet' }).click();
await page.waitForSelector('text=Painting sheet ·', { timeout: 20000 });
await page.waitForTimeout(300);
await shot('09-sheet');
const fonts = await page.evaluate(() =>
	[...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`)
);
say('fonts loaded:', fonts.join(', '));
await page.getByRole('button', { name: 'Close' }).click();

await page.getByRole('button', { name: 'Enlarge the picture' }).click();
await page.waitForTimeout(400);
await shot('10-enlarged');
await page.getByRole('button', { name: 'Close' }).click();

await page.goBack();
await page.waitForTimeout(200);
say('after back:', await page.locator('h1').first().textContent());

await page.getByRole('button', { name: 'Palette' }).click();
await page.waitForSelector('text=Which paints will you use?');
await page.waitForTimeout(200);
await shot('11-palette');
await overflow('palette');
await page.getByRole('button', { name: /French Ultramarine/ }).click();
await page.waitForSelector('text=Choose a color');
await page.getByRole('searchbox').fill('PB15 phthalo');
await page.waitForTimeout(150);
await shot('12-picker');
await page.getByRole('button', { name: /Phthalo Blue 570/ }).click();
await page.waitForTimeout(300);
await shot('13-palette-cobra');
await page.getByRole('button', { name: /Zorn/ }).click();
await page.waitForTimeout(300);
await shot('14-zorn');
await page.getByRole('button', { name: 'See my values' }).click();
await page.waitForTimeout(900);
await shot('15-zorn-values');
await page.getByRole('button', { name: 'Show me the mixes' }).click();
await page.waitForTimeout(200);
await shot('16-zorn-mix');

say('problems:', problems.length ? problems : 'none');
await browser.close();
