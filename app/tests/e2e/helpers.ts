import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

export const golden = path.resolve(import.meta.dirname, '../golden');
export const stillLife = path.join(golden, 'images/still-life.png');

interface GoldenCase {
	name: string;
	zones: { text: { main: string } }[];
}

/** The recipes today's app gave for this image and settings case. */
export function recipes(image: string, name: string) {
	const file = readFileSync(path.join(golden, `cases/${image}.json`), 'utf8');
	const { cases } = JSON.parse(file) as { cases: GoldenCase[] };
	const found = cases.find((c) => c.name === name);
	if (!found) throw new Error(`No golden case ${name}`);
	return found.zones.map((z) => z.text.main);
}

export async function start(page: Page) {
	await page.goto('/');
	await page.getByRole('heading', { name: 'See it in values. Mix it with confidence.' }).waitFor();
}

export async function openExample(page: Page) {
	await start(page);
	await page.getByRole('button', { name: 'Try it with the example' }).click();
	await page.getByRole('heading', { name: 'Does this look right?' }).waitFor();
}

export async function choosePhoto(page: Page) {
	await start(page);
	await page.locator('input[type=file]').first().setInputFiles(stillLife);
}

export const toMixes = (page: Page) =>
	page.getByRole('button', { name: 'Show me the mixes' }).click();

export const shownRecipes = (page: Page) => page.locator('.recipe');
