import { chromium } from '@playwright/test';
const base = process.argv[2];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror ' + e.message));
page.on('console', (m) => {
	if (['error', 'warning'].includes(m.type()) && !/404/.test(m.text())) problems.push(m.text());
});
const h1 = async () => (await page.locator('h1').allTextContents()).join(' / ');
for (const path of ['/', '/settings', '/palettes', '/palettes/123', '/inventory', '/nope/here']) {
	const response = await page.goto(base + path);
	await page.waitForSelector('h1');
	console.log(path.padEnd(16), response.status(), '|', await page.title(), '|', await h1());
}
await page.goto(base + '/settings');
await page.waitForSelector('h1');
await page.getByRole('button', { name: 'Done' }).click();
await page.waitForSelector('text=What are you painting today?');
console.log('Done from a direct link goes to', new URL(page.url()).pathname);

await page.getByRole('link', { name: 'Settings' }).click();
await page.waitForSelector('text=Remember my palette');
console.log('settings address', new URL(page.url()).pathname);
await page.keyboard.press('Escape');
await page.waitForSelector('text=What are you painting today?');
console.log('escape returns to', new URL(page.url()).pathname);

await page.getByRole('button', { name: 'Try it with the example' }).click();
await page.waitForSelector('text=Does this look right?');
console.log('address during a study', new URL(page.url()).pathname);
await page.getByRole('button', { name: 'Show me the mixes' }).click();
await page.waitForSelector('text=Your mixes');
await page.getByRole('button', { name: 'Paints to set out' }).click();
await page.waitForSelector('text=Before you paint');
await page.goBack();
await page.waitForTimeout(150);
console.log('back from panel:', await h1());
await page.goBack();
await page.waitForTimeout(150);
console.log('back a step:', await h1());
await page.goForward();
await page.waitForTimeout(150);
console.log('forward:', await h1());
await page.getByRole('button', { name: 'Photo', exact: true }).first().click();
await page.waitForTimeout(150);
console.log('stepper Photo:', await h1());
await page.getByRole('link', { name: 'Settings' }).click();
await page.waitForSelector('text=Remember my palette');
await page.getByRole('button', { name: 'Done' }).click();
await page.waitForTimeout(200);
await page.goBack();
await page.waitForTimeout(200);
console.log('study kept after settings, back:', await h1());
console.log('problems:', problems.length ? problems : 'none');
await browser.close();
