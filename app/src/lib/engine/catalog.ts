import data from '../../../../data/paints.json';
import { WHITE } from './mixing';
import type { BrandId, LimitedPaletteId, Paint, PaletteId, Pigment } from './types';

const catalog = data as unknown as Record<BrandId, Paint[]>;

export const BRANDS: Record<BrandId, { brand: string; white: string; paints: Paint[] }> = {
	artisan: { brand: 'Winsor & Newton Artisan', white: 'Titanium White', paints: catalog.artisan },
	cobra: { brand: 'Cobra', white: 'Titanium White 105', paints: catalog.cobra }
};

export const FAMILIES = [
	['blue', 'Blues'],
	['green', 'Greens'],
	['yellow', 'Yellows'],
	['orange', 'Oranges'],
	['red', 'Reds'],
	['pink', 'Pinks and magentas'],
	['violet', 'Violets'],
	['earth', 'Earths'],
	['gray', 'Grays and blacks']
] as const;

export const WHITE_TUBE: Pigment = WHITE;

interface LimitedPalette {
	name: string;
	title: string;
	about: string;
	tubes: Record<BrandId, string[]>;
	roles: string[];
	note?: Partial<Record<BrandId, string>>;
	link?: string;
}

export const LIMITED_PALETTES: Record<LimitedPaletteId, LimitedPalette> = {
	zorn: {
		name: 'Zorn',
		title: 'Zorn palette',
		about:
			"Anders Zorn's four-paint palette: an earth yellow, a warm red, black and white. Black stands in for blue, so the color stays warm and harmonious.",
		tubes: {
			artisan: ['yellow-ochre', 'cadmium-red-light', 'ivory-black'],
			cobra: ['yellow-ochre-227', 'cadmium-red-light-303', 'ivory-black-701']
		},
		roles: [
			"The palette's yellow. With black it makes muted olive greens.",
			"The palette's red. Warms skin, lips and shadows.",
			'Stands in for blue. With white it reads as a cool blue-gray next to the warm paints.'
		]
	},
	primary: {
		name: 'Primary colors',
		title: 'Primary palette',
		about:
			'A yellow, a magenta-leaning red and a cyan-leaning blue, plus white. The widest range of the four: greens, violets and oranges all mix from these.',
		tubes: {
			artisan: ['cadmium-yellow-light', 'permanent-rose', 'pblue'],
			cobra: ['primary-yellow-275', 'primary-magenta-369', 'primary-cyan-572']
		},
		roles: [
			'Primary yellow. With the blue it makes greens; with the red, oranges.',
			'Primary red, leaning magenta. With the blue it makes violets.',
			'Primary blue, leaning cyan. Very strong, so add it in small amounts.'
		]
	},
	warmcool: {
		name: 'Warm & cool',
		title: 'Warm & cool palette',
		about:
			"Anna Wakitsch's warm & cool palette: transparent red oxide, ivory black and white. A warm string of red-oranges and a cool string of grays combine into skin tones.",
		tubes: {
			artisan: ['burnt-sienna', 'ivory-black'],
			cobra: ['transparent-oxide-red-378', 'ivory-black-701']
		},
		roles: [
			'The warm string. Makes the red-oranges and, mixed with the grays, the skin tones.',
			'The cool string. With white it makes the cool grays.'
		],
		note: {
			artisan:
				'Artisan has no transparent red oxide, so this uses Burnt Sienna (PR101), the substitute Wakitsch suggests.'
		},
		link: 'https://static1.squarespace.com/static/58b31bad8419c27c671d830e/t/621bc4370dbe0161563501be/1645986887818/Mixing_the_warm_cool_palette_Anna_Wakitsch.pdf'
	}
};

export const paintById = (brand: BrandId, id: string | null | undefined) =>
	BRANDS[brand].paints.find((p) => p.id === id);

export function requirePaint(brand: BrandId, id: string): Paint {
	const paint = paintById(brand, id);
	if (!paint) throw new Error(`No paint ${id} in ${brand}`);
	return paint;
}

export const limitedDef = (palette: PaletteId) => {
	if (palette === 'mono') throw new Error('Monochrome has no limited palette definition');
	return LIMITED_PALETTES[palette];
};

export const paletteTubes = (palette: PaletteId, brand: BrandId) =>
	limitedDef(palette).tubes[brand].map((id) => requirePaint(brand, id));
