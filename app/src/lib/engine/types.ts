export type RGB = [number, number, number];
export type BrandId = 'artisan' | 'cobra';
export type PaletteId = 'mono' | 'zorn' | 'primary' | 'warmcool';
export type LimitedPaletteId = Exclude<PaletteId, 'mono'>;
export type Darks = 'near' | 'comp';
export type Contrast = 'soft' | 'natural' | 'punchy' | 'bold';
export type Key = 'darker' | 'natural' | 'brighter';
export type ToneMode = 'fit' | 'even';
export type Medium = 'oil' | 'acrylic';
export type MapView = 'photo' | 'values' | 'map';

export interface Paint {
	id: string;
	name: string;
	family: string;
	code: string;
	rgb: number[];
	s: number;
	label: string;
	pureL: number;
	hue: number;
	chroma: number;
	near: string | null;
	comp: string | null;
	fav?: number;
	note?: string;
}

/** Anything the Kubelka–Munk model can mix: a paint from the catalog, or white. */
export interface Pigment {
	id: string;
	name: string;
	rgb: number[];
	s: number;
}

export interface StudySettings {
	palette: PaletteId;
	nColors: number;
	darks: Darks;
	contrast: Contrast;
	key: Key;
	lift: number;
	brand: BrandId;
	n: number;
	mode: ToneMode;
	pig: string;
	med: Medium;
	show: MapView;
	label: string;
}

export const DEFAULT_SETTINGS: StudySettings = {
	palette: 'mono',
	nColors: 8,
	darks: 'near',
	contrast: 'natural',
	key: 'natural',
	lift: 12,
	brand: 'artisan',
	n: 5,
	mode: 'fit',
	pig: 'blue',
	med: 'oil',
	show: 'values',
	label: 'Example still life'
};

export interface DarkVariant {
	deep: number;
	mix: RGB;
	partner: string | null;
	short: boolean;
}

/** One tone or color group. Monochrome and limited palettes fill in different fields. */
export interface Zone {
	L: number;
	area: number;
	mix: RGB;
	// monochrome
	c?: number;
	lim?: 'white' | 'dark' | null;
	deep?: number;
	partner?: string | null;
	short?: boolean;
	v?: Record<Darks, DarkVariant>;
	// limited palettes
	a?: number;
	b?: number;
	target?: RGB;
	comps?: Pigment[];
	w?: number[];
	err?: number;
}

/** The photo as lightness and color channels, plus the brighten-area mask. */
export interface ImageChannels {
	width: number;
	height: number;
	Lraw: Float32Array;
	Araw: Float32Array;
	Braw: Float32Array;
	mask: Float32Array;
}

/** What the screens keep once the worker holds the channels. */
export type PhotoMask = Pick<ImageChannels, 'width' | 'height' | 'mask'>;

export interface Study {
	zones: Zone[];
	assign: Uint8Array;
}

export interface Recipe {
	main: string;
	sub: string;
}

export interface PaintListItem {
	chip: string;
	name: string;
	desc: string;
}
