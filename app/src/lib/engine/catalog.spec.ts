import { describe, expect, it } from 'vitest';
import pigments from '../../../../data/pigments.json';
import { BRANDS, FAMILIES, LIMITED_PALETTES } from './catalog';
import { ks, rFromKs } from './color';
import type { BrandId, Paint } from './types';

const library = pigments as Record<string, { rgb: number[]; s: number }>;
const brandIds = Object.keys(BRANDS) as BrandId[];
const everyPaint = brandIds.flatMap((brand) => BRANDS[brand].paints.map((p) => ({ brand, p })));

// The blend in paints.js, to prove the exported pigments rebuild each paint.
function blended(recipe: [string, number][]) {
	let weight = 0;
	const K = [0, 0, 0];
	for (const [code, parts] of recipe) {
		const pigment = library[code];
		const e = parts * pigment.s;
		weight += e;
		for (let i = 0; i < 3; i++) K[i] += e * ks(pigment.rgb[i]);
	}
	const total = recipe.reduce((sum, [, parts]) => sum + parts, 0);
	return { rgb: K.map((k) => rFromKs(k / weight)), s: weight / total };
}

describe('catalog', () => {
	it('has both full ranges', () => {
		expect(BRANDS.artisan.paints).toHaveLength(36);
		expect(BRANDS.cobra.paints).toHaveLength(92);
	});

	it('keeps paint ids unique within a brand', () => {
		for (const brand of brandIds) {
			const ids = BRANDS[brand].paints.map((p) => p.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	it('uses only known families', () => {
		const families: string[] = FAMILIES.map(([id]) => id);
		for (const { p } of everyPaint) expect(families).toContain(p.family);
	});

	it('points partners at paints in the same brand', () => {
		for (const { brand, p } of everyPaint) {
			for (const id of [p.near, p.comp]) {
				if (id !== null) expect(BRANDS[brand].paints.some((x: Paint) => x.id === id)).toBe(true);
			}
		}
	});

	it('finds every tube the limited palettes use', () => {
		for (const palette of Object.values(LIMITED_PALETTES)) {
			for (const brand of brandIds) {
				for (const id of palette.tubes[brand]) {
					expect(BRANDS[brand].paints.some((p) => p.id === id)).toBe(true);
				}
				expect(palette.roles.length).toBeGreaterThanOrEqual(palette.tubes[brand].length);
			}
		}
	});

	it('rebuilds every paint exactly from its pigments', () => {
		const withRecipes = everyPaint.filter(({ p }) => p.recipe);
		expect(withRecipes.length).toBeGreaterThan(100);
		for (const { p } of withRecipes) {
			const rebuilt = blended(p.recipe as [string, number][]);
			expect(rebuilt.rgb).toEqual(p.rgb);
			expect(rebuilt.s).toBe(p.s);
		}
	});

	it('sets a color by hand on every paint without a recipe', () => {
		for (const { p } of everyPaint.filter(({ p }) => !p.recipe)) {
			expect(p.fav).toBe(1);
			expect(p.rgb).toHaveLength(3);
		}
	});
});
