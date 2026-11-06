import { expect, test } from '@playwright/test';
import { start } from './helpers';

for (const [address, heading, title] of [
	['/', 'What are you painting today?', 'Hue & Value'],
	['/settings', 'Settings', 'Settings · Hue & Value'],
	['/palettes', 'My palettes', 'My palettes · Hue & Value'],
	['/palettes/123', 'Palette', 'Palette · Hue & Value'],
	['/inventory', 'Art supplies', 'Art supplies · Hue & Value'],
	['/nope/here', 'Page not found', 'Page not found · Hue & Value']
]) {
	test(`${address} opens directly`, async ({ page }) => {
		await page.goto(address);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
		await expect(page).toHaveTitle(title);
	});
}

test('/index.html lands on the app', async ({ page }) => {
	await page.goto('/index.html');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('What are you painting today?');
});

test('Done goes home when Settings was opened directly', async ({ page }) => {
	await page.goto('/settings');
	await page.getByRole('button', { name: 'Done' }).click();
	await page.getByRole('heading', { name: 'What are you painting today?' }).waitFor();
	await expect(page).toHaveURL(/\/$/);
});

test('Escape closes Settings', async ({ page }) => {
	await start(page);
	await page.getByRole('link', { name: 'Settings' }).click();
	await page.getByRole('heading', { name: 'Settings' }).waitFor();
	await page.keyboard.press('Escape');
	await page.getByRole('heading', { name: 'What are you painting today?' }).waitFor();
});

test('the holding pages lead home', async ({ page }) => {
	await page.goto('/palettes');
	await page.getByRole('link', { name: 'Back to my study' }).click();
	await page.getByRole('heading', { name: 'What are you painting today?' }).waitFor();
});
