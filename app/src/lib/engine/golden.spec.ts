// Holds the port to what today's app produced. See tests/golden/capture.mjs.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { analyze, imageChannels } from './analysis';
import { hex } from './color';
import { sheetText, zoneRecipe } from './text';
import { searchPaints } from './search';
import { DEFAULT_SETTINGS, type StudySettings } from './types';

const root = path.resolve(import.meta.dirname, '../../../tests/golden');
const read = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const round = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * 1e6) / 1e6);

interface GoldenCase {
	name: string;
	settings: Partial<StudySettings>;
	brighten?: { x: number; y: number; r: number };
	assignHash: string;
	sheet: string;
	zones: Record<string, unknown>[];
}

for (const name of ['app-sample', 'still-life', 'color-field']) {
	describe(`golden: ${name}`, () => {
		const golden = read(`cases/${name}.json`) as { image: string; cases: GoldenCase[] };
		const png = PNG.sync.read(readFileSync(path.join(root, 'images', golden.image)));

		it.each(golden.cases.map((c) => [c.name, c] as const))('%s', (_, c) => {
			const settings: StudySettings = { ...DEFAULT_SETTINGS, label: 'case', ...c.settings };
			const channels = imageChannels(png.data, png.width, png.height);
			if (c.brighten) {
				const { x, y, r } = c.brighten;
				for (let py = 0; py < png.height; py++) {
					for (let px = 0; px < png.width; px++) {
						if (Math.hypot(px - x * png.width, py - y * png.height) < r * png.width) {
							channels.mask[py * png.width + px] = 1;
						}
					}
				}
			}
			const study = analyze(channels, settings);
			const zones = study.zones.map((z) => ({
				L: round(z.L),
				area: round(z.area),
				a: round(z.a),
				b: round(z.b),
				c: round(z.c),
				lim: z.lim,
				deep: round(z.deep),
				partner: z.partner,
				short: z.short,
				w: z.w?.map((v) => round(v)),
				err: round(z.err),
				mix: hex(z.mix),
				text: zoneRecipe(z, settings)
			}));
			expect(JSON.parse(JSON.stringify(zones))).toEqual(c.zones);
			expect(createHash('sha256').update(study.assign).digest('hex')).toBe(c.assignHash);
			expect(sheetText(study, channels, settings)).toBe(c.sheet);
		});
	});
}

describe('golden: search', () => {
	const golden = read('cases/search.json') as {
		query: string;
		brand: 'artisan' | 'cobra';
		intro: string;
		groups: { title: string; items: { name: string; brand: string; meta: string }[] }[];
	}[];

	it.each(golden.map((c) => [`${c.brand}: "${c.query}"`, c] as const))('%s', (_, c) => {
		const result = searchPaints(c.query, c.brand);
		expect(result.intro).toBe(c.intro);
		expect(
			result.groups.map((g) => ({
				title: g.title,
				items: g.items.map((item) => ({
					name: item.paint.name,
					brand: item.showBrand ? item.brand : '',
					meta: item.meta
				}))
			}))
		).toEqual(c.groups);
	});
});
