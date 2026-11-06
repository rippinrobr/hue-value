import { expect, test } from '@playwright/test';
import {
	choosePhoto,
	openExample,
	recipes,
	shownRecipes,
	start,
	stillLife,
	toMixes
} from './helpers';

test.beforeEach(async ({ page }) => {
	page.on('pageerror', (error) => {
		throw error;
	});
});

test("the example gives the same recipes as today's app", async ({ page }) => {
	await openExample(page);
	await toMixes(page);
	await expect(shownRecipes(page)).toHaveText(recipes('app-sample', 'mono-default'));
});

test("a photo gives the same recipes as today's app", async ({ page }) => {
	await choosePhoto(page);
	await page.getByRole('button', { name: 'See my values' }).click();
	await toMixes(page);
	await expect(shownRecipes(page)).toHaveText(recipes('still-life', 'mono-default'));
});

test("a limited palette gives the same recipes as today's app", async ({ page }) => {
	await choosePhoto(page);
	await page.getByRole('button', { name: /^Zorn/ }).click();
	await page.getByRole('button', { name: 'See my values' }).click();
	await toMixes(page);
	await expect(shownRecipes(page)).toHaveText(recipes('still-life', 'zorn-artisan'));
});

test('moving on before a slow analysis finishes shows matching results', async ({ page }) => {
	// Holds each analysis back, like a slow phone does.
	await page.addInitScript(() => {
		const post = Worker.prototype.postMessage as (...args: unknown[]) => void;
		Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
			const message = args[0] as { type?: string };
			if (message.type === 'analyze') setTimeout(() => post.apply(this, args), 600);
			else post.apply(this, args);
		};
	});
	await choosePhoto(page);
	await page.getByRole('button', { name: /^Zorn/ }).click();
	await page.getByRole('button', { name: 'See my values' }).click();
	await toMixes(page);
	await page.getByRole('button', { name: 'Paints to set out' }).click();
	await page.getByRole('button', { name: 'Back to my mixes' }).click();
	await expect(shownRecipes(page)).toHaveText(recipes('still-life', 'zorn-artisan'));

	// And the other way, from a limited palette back to one color.
	await page.getByRole('button', { name: 'Palette', exact: true }).click();
	await page.getByRole('button', { name: /^One color/ }).click();
	await page.getByRole('button', { name: 'See my values' }).click();
	await toMixes(page);
	await expect(shownRecipes(page)).toHaveText(recipes('still-life', 'mono-default'));
});

test('darks can switch to the complement', async ({ page }) => {
	await openExample(page);
	await toMixes(page);
	await page.getByRole('button', { name: 'Complement' }).click();
	await expect(shownRecipes(page)).toHaveText(recipes('app-sample', 'mono-darks-complement'));
});

test('tone count stops at its limits', async ({ page }) => {
	await openExample(page);
	const more = page.getByRole('button', { name: 'More tones' });
	for (let i = 0; i < 4; i++) await more.click();
	await expect(more).toBeDisabled();
	await toMixes(page);
	await expect(shownRecipes(page)).toHaveText(recipes('app-sample', 'mono-tones-9'));
});

test('a file that is not an image is refused', async ({ page }) => {
	await start(page);
	await page
		.locator('input[type=file]')
		.first()
		.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
	await expect(page.getByRole('alert')).toHaveText(/not an image/);
});

test('brushing brightens an area, and it can be cleared', async ({ page }) => {
	await openExample(page);
	await page.getByRole('button', { name: 'Brightness, brushing and more' }).click();
	await page.getByRole('button', { name: 'Paint on picture' }).click();
	const box = await page.getByLabel('Your photo or its value map').last().boundingBox();
	if (!box) throw new Error('No picture');
	await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 6 });
	await page.mouse.up();
	const clear = page.getByRole('button', { name: 'Clear brightened area' });
	await clear.click();
	await expect(clear).toBeHidden();
});

test('search finds a paint in the other brand and switches to it', async ({ page }) => {
	await choosePhoto(page);
	await page.getByRole('button', { name: /French Ultramarine/ }).click();
	await page.getByRole('searchbox').fill('PB15 phthalo');
	await page.getByRole('button', { name: /Phthalo Blue 570/ }).click();
	await expect(page.getByRole('button', { name: /Phthalo Blue 570/ })).toBeVisible();
	await page.getByRole('button', { name: 'See my values' }).click();
	await toMixes(page);
	await expect(page.getByText('Phthalo Blue 570 and Titanium White 105')).toBeVisible();
});

test('Settings stick, and Remember my palette skips the step', async ({ page }) => {
	await choosePhoto(page);
	await page.getByRole('button', { name: /^Zorn/ }).click();
	await page.getByRole('button', { name: 'See my values' }).click();
	await page.getByRole('heading', { name: 'Does this look right?' }).waitFor();
	await page.goto('/settings');
	await page.getByRole('switch').click();
	await page.getByRole('button', { name: 'Acrylic' }).click();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Acrylic' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await page.goto('/');
	await page.locator('input[type=file]').first().setInputFiles(stillLife);
	await page.getByRole('heading', { name: 'Does this look right?' }).waitFor();
	await toMixes(page);
	await expect(shownRecipes(page).first()).toContainText(/Ivory Black|Yellow Ochre|Cadmium/);
});

test('the painting sheet saves as an image', async ({ page }) => {
	await openExample(page);
	await toMixes(page);
	await page.getByRole('button', { name: 'Save sheet' }).click();
	await page.getByRole('heading', { name: /^Painting sheet/ }).waitFor();
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Save image' }).click();
	expect((await download).suggestedFilename()).toMatch(/^painting-sheet-ultramarine-.*\.png$/);
	await expect(page.getByRole('status')).toHaveText(/^Saved painting-sheet/);
});

test('the picture can be enlarged and closed', async ({ page }) => {
	await openExample(page);
	await page.getByRole('button', { name: 'Enlarge the picture' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();
});

test('the keyboard stays inside an open panel', async ({ page }) => {
	await openExample(page);
	await toMixes(page);
	await page.getByRole('button', { name: 'Paints to set out' }).click();
	await page.getByRole('dialog').waitFor();
	for (let i = 0; i < 6; i++) {
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => !!document.activeElement?.closest('[inert]'))).toBe(false);
	}
});

test('back and forward move between steps and panels', async ({ page }) => {
	const heading = page.getByRole('heading', { level: 1 }).first();
	await openExample(page);
	await toMixes(page);
	await page.getByRole('button', { name: 'Paints to set out' }).click();
	await page.getByRole('dialog').waitFor();
	await page.goBack();
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(heading).toHaveText('Your mixes');
	await page.goBack();
	await expect(heading).toHaveText('Does this look right?');
	await page.goForward();
	await expect(heading).toHaveText('Your mixes');
});

test('a reload starts again, because photos are never stored', async ({ page }) => {
	await openExample(page);
	await page.reload();
	await page.getByRole('heading', { name: 'See it in values. Mix it with confidence.' }).waitFor();
});

for (const [name, size, colorScheme] of [
	['a small phone', { width: 320, height: 568 }, 'light'],
	['dark mode', { width: 390, height: 844 }, 'dark'],
	['a laptop', { width: 1280, height: 800 }, 'light']
] as const) {
	test(`nothing runs off the side on ${name}`, async ({ browser, baseURL }) => {
		const context = await browser.newContext({ viewport: size, colorScheme, baseURL });
		const page = await context.newPage();
		const fits = async () =>
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		await openExample(page);
		await fits();
		await toMixes(page);
		await shownRecipes(page).first().waitFor();
		await fits();
		await context.close();
	});
}
