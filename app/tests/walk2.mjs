import { chromium } from '@playwright/test';
const out = process.argv[2];
const browser = await chromium.launch();
const problems = [];
const say = (...a) => console.log(...a);
async function open(options) {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		...options
	});
	const page = await context.newPage();
	page.on('pageerror', (e) => problems.push('pageerror ' + e.message));
	page.on('console', (m) => {
		if (m.type() === 'error') problems.push('console ' + m.text());
	});
	await page.goto('http://127.0.0.1:4173/');
	await page.waitForSelector('text=What are you painting today?');
	return page;
}
const overflow = async (page, n) => {
	const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
	if (o > 0) problems.push(`${n} overflows sideways by ${o}px`);
};
const IMAGE = 'tests/golden/images/still-life.png';

let page = await open({});
await page
	.locator('input[type=file]')
	.first()
	.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
await page.waitForSelector('text=That file is not an image');
say('non-image refused');
await page.locator('input[type=file]').first().setInputFiles(IMAGE);
await page.waitForSelector('text=Which paints will you use?');
await page.getByRole('button', { name: /Zorn/ }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/20-zorn-open.png`, fullPage: true });
await page.getByRole('button', { name: 'See my values' }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/21-portrait-values.png` });
await overflow(page, 'values');
for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'More colors' }).click();
await page.waitForTimeout(1500);
say(
	'colors:',
	await page.locator('output').first().textContent(),
	'more disabled:',
	await page.getByRole('button', { name: 'More colors' }).isDisabled()
);
await page.getByRole('button', { name: 'Show me the mixes' }).click();
await page.waitForTimeout(300);
say('rows:', await page.locator('.mix').count());
await page.screenshot({ path: `${out}/22-portrait-mix.png` });
await page.reload();
await page.waitForSelector('text=What are you painting today?');
say('reload returns to start');

await page.getByRole('link', { name: 'Settings' }).click();
await page.getByRole('switch').click();
await page.getByRole('button', { name: 'Cobra' }).click();
await page.getByRole('button', { name: 'Acrylic' }).click();
await page.getByRole('button', { name: 'Done' }).click();
await page.waitForTimeout(100);
await page.reload();
await page.waitForSelector('text=What are you painting today?');
await page.locator('input[type=file]').first().setInputFiles(IMAGE);
await page.waitForSelector('text=Does this look right?', { timeout: 5000 });
say('remember skipped the palette step');
await page.getByRole('button', { name: 'Show me the mixes' }).click();
await page.waitForTimeout(800);
say('remembered:', await page.locator('main .muted').first().textContent());
await page.getByRole('button', { name: 'Save painting sheet' }).click();
await page.waitForSelector('text=Painting sheet ·', { timeout: 20000 });
const download = page.waitForEvent('download');
await page.getByRole('button', { name: 'Save image' }).click();
say('saved file:', (await download).suggestedFilename());
const seen = [];
for (let i = 0; i < 8; i++) {
	await page.keyboard.press('Tab');
	seen.push(
		await page.evaluate(() =>
			document.activeElement.closest('[inert]')
				? 'BEHIND'
				: document.activeElement.textContent.trim()
		)
	);
}
say('tab stops in panel:', [...new Set(seen)]);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
say('escape closed panel:', (await page.getByRole('dialog').count()) === 0);

page = await open({ colorScheme: 'dark' });
await page.getByRole('button', { name: 'Try it with the example' }).click();
await page.waitForSelector('text=Does this look right?');
await page.getByRole('button', { name: 'Show me the mixes' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/23-dark-mix.png` });

page = await open({ viewport: { width: 320, height: 568 } });
await overflow(page, 'small start');
await page.getByRole('button', { name: 'Try it with the example' }).click();
await page.waitForSelector('text=Does this look right?');
await page.waitForTimeout(400);
await overflow(page, 'small values');
await page.screenshot({ path: `${out}/24-small-values.png` });
await page.getByRole('button', { name: 'Show me the mixes' }).click();
await page.waitForTimeout(300);
await overflow(page, 'small mix');

page = await open({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await page.getByRole('button', { name: 'Try it with the example' }).click();
await page.waitForSelector('text=Does this look right?');
await page.getByRole('button', { name: 'Show me the mixes' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/25-laptop-mix.png` });

say('problems:', problems.length ? problems : 'none');
await browser.close();
