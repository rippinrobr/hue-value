// Everything the app says about a study: recipes, paint lists, tips and the sheet text.
import { grayHex, hex, labOf } from './color';
import { BRANDS, limitedDef, paintById, paletteTubes, requirePaint } from './catalog';
import { WHITE, mix } from './mixing';
import { fmt, nice, parts } from './parts';
import type {
	Contrast,
	Paint,
	PaintListItem,
	PhotoMask,
	Recipe,
	StudySettings,
	Study,
	Zone
} from './types';

const isMono = (s: StudySettings) => s.palette === 'mono';

// A paint's name inside a sentence: favorites read as 'the blue', others keep their proper name.
const short = (t: Paint) => (t.fav ? t.label.toLowerCase() : t.label);

export function ratioText(z: Zone, p: Paint, settings: StudySettings): Recipe {
	const c = z.c as number;
	const deep = z.deep as number;
	if (deep > 0) {
		const b = paintById(settings.brand, z.partner) as Paint;
		const n = nice((1 - deep) / deep);
		const why =
			settings.darks === 'comp'
				? `The ${short(b)} is the complement: it darkens and slightly grays the ${short(p)}.`
				: `The ${short(b)} darkens the ${short(p)} and keeps it in the same color family.`;
		if (n >= 40) {
			return {
				main: `${p.name} with a touch of ${b.name}`,
				sub: `No white. About ${fmt(n)} : 1, a knife-tip of ${short(b)}. ${why}`
			};
		}
		if (n < 1) {
			return {
				main: `1 part ${p.name} : ${parts(nice(deep / (1 - deep)))} ${b.name}`,
				sub: `No white. ${why}`
			};
		}
		return { main: `${parts(n)} ${p.name} : 1 part ${b.name}`, sub: `No white. ${why}` };
	}
	if (z.lim === 'white' || c < 0.002) {
		return {
			main: 'Titanium White only',
			sub: 'Lightest tone. Use white straight from the tube.'
		};
	}
	if (z.lim === 'dark' || c > 0.985) {
		return { main: `${p.name} only`, sub: 'Use the paint straight, no white.' };
	}
	if (c < 0.5) {
		const n = nice((1 - c) / c);
		const part = `1 part ${p.name} : ${parts(n)} white`;
		if (n >= 60) {
			return {
				main: `White with a trace of ${p.name}`,
				sub: `About ${part}. Pick up a pin-head of dark on the knife tip.`
			};
		}
		return { main: part, sub: `${Math.round(c * 100)}% ${p.name} by volume` };
	}
	const n = nice(c / (1 - c));
	return {
		main: `${parts(n)} ${p.name} : 1 part white`,
		sub: `${Math.round(c * 100)}% ${p.name} by volume`
	};
}

export function recipeText(z: Zone): Recipe {
	const weights = z.w as number[];
	const items = (z.comps ?? []).map((c, j) => ({ c, w: weights[j] })).filter((x) => x.w > 0.001);
	const nm = (x: { c: { id: string; name: string } }) => (x.c.id === 'white' ? 'white' : x.c.name);
	if (items.length === 1) {
		return {
			main: items[0].c.id === 'white' ? 'Titanium White only' : `${items[0].c.name} only`,
			sub: 'Straight from the tube.'
		};
	}
	items.sort((a, b) => +(a.c.id === 'white') - +(b.c.id === 'white') || b.w - a.w);
	const maxW = Math.max(...items.map((x) => x.w));
	const main = items.filter((x) => x.w >= maxW / 25);
	const touch = items.filter((x) => x.w < maxW / 25);
	const base = Math.min(...main.map((x) => x.w));
	let text =
		main.length === 1
			? nm(main[0]).replace(/^white$/, 'Titanium White')
			: main.map((x) => `${parts(nice(x.w / base))} ${nm(x)}`).join(' : ');
	const and = (a: string[]) =>
		a.length < 2 ? a[0] : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
	if (touch.length) text += ` + a touch of ${and(touch.map(nm))}`;
	const pc = (v: number) => (v < 0.01 ? 'under 1%' : `${Math.round(v * 100)}%`);
	return {
		main: text,
		sub: `${items.map((x) => `${x.c.id === 'white' ? 'White' : x.c.name} ${pc(x.w)}`).join(', ')} by volume`
	};
}

export function gamutNote(z: Zone) {
	if ((z.err as number) <= 10) return '';
	const ml = labOf(z.mix);
	const tc = Math.hypot(z.a as number, z.b as number);
	const mc = Math.hypot(ml[1], ml[2]);
	return tc > mc + 8
		? 'This palette cannot mix a color this vivid. This is the closest it gets.'
		: 'This is the closest this palette gets. The hue is a little off from the photo.';
}

export const zoneRecipe = (z: Zone, settings: StudySettings) =>
	isMono(settings)
		? ratioText(z, requirePaint(settings.brand, settings.pig), settings)
		: recipeText(z);

export function paintNote(p: Paint) {
	if (p.note) return p.note;
	const v = (p.pureL / 10).toFixed(1);
	return `Pigments ${p.code}. Straight from the tube it reaches about value ${v}${p.pureL > 45 ? ', so the darker tones lean on the partner paint.' : '.'}`;
}

/** The sentence under a mix when it can't reach its target. */
export const mixWarning = (z: Zone, settings: StudySettings) =>
	isMono(settings)
		? z.short
			? 'As dark as these two paints go. The real tone is a bit darker, so judge it against its neighbors.'
			: ''
		: gamutNote(z);

export function saveName(
	kind: 'sheet' | 'values' | 'map',
	zones: Zone[],
	settings: StudySettings,
	date: Date
) {
	const mono = isMono(settings);
	const word = mono
		? requirePaint(settings.brand, settings.pig).label
		: limitedDef(settings.palette).name;
	const slug = word
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	if (kind === 'sheet') return `painting-sheet-${slug}-${date.toISOString().slice(0, 10)}.png`;
	const prefix = kind === 'values' ? 'values-' : mono ? 'value-map-' : 'color-map-';
	return `${prefix}${slug}-${zones.length}${mono ? '-tones.png' : '-colors.png'}`;
}

const OPTIONAL_OIL = {
	chip: 'transparent',
	name: 'Water-mixable linseed oil or medium',
	desc: 'Optional. A drop loosens stiff mixes. Clean brushes with water.'
};

function monoPaints(zones: Zone[], settings: StudySettings): PaintListItem[] {
	const p = requirePaint(settings.brand, settings.pig);
	const b = paintById(settings.brand, p[settings.darks]);
	const pal = BRANDS[settings.brand];
	const deepCount = zones.filter((z) => (z.deep as number) > 0).length;
	const paints: PaintListItem[] = [
		{
			chip: hex(mix(1, p)),
			name: `${pal.brand} ${p.name} (${p.code})`,
			desc: 'Your main color. The light and middle tones are this plus white.'
		},
		{
			chip: hex(WHITE.rgb),
			name: `${pal.brand} ${pal.white}`,
			desc: 'Opaque, strong white. The light tones are mostly white, so have plenty.'
		}
	];
	if (deepCount && b) {
		paints.push({
			chip: hex(mix(1, b)),
			name: `${pal.brand} ${b.name} (${b.fav ? `${b.label.toLowerCase()}, ` : ''}small amount)`,
			desc: `${deepCount} dark tone${deepCount > 1 ? 's are' : ' is'} darker than ${p.name} can reach. ${
				settings.darks === 'comp'
					? `${b.label} is its complement, so it darkens and slightly grays it for quieter, richer shadows.`
					: `${b.label} darkens it while keeping the painting in one color family.`
			}`
		});
	}
	paints.push(
		settings.med === 'oil'
			? OPTIONAL_OIL
			: {
					chip: 'transparent',
					name: 'Acrylic retarder or slow-drying medium',
					desc: 'Optional. Keeps your tone puddles workable longer on the palette.'
				}
	);
	return paints;
}

function limitedPaints(zones: Zone[], settings: StudySettings): PaintListItem[] {
	const def = limitedDef(settings.palette);
	const pal = BRANDS[settings.brand];
	const tubes = paletteTubes(settings.palette, settings.brand);
	const n = zones.length;
	const used = (j: number) => zones.filter((z) => (z.w as number[])[j] > 0.001).length;
	const list: PaintListItem[] = tubes.map((t, j) => ({
		chip: hex(t.rgb),
		name: `${pal.brand} ${t.name} (${t.code})`,
		desc: `${def.roles[j]} Used in ${used(j)} of ${n} mixes.`
	}));
	list.push({
		chip: hex(WHITE.rgb),
		name: `${pal.brand} ${pal.white}`,
		desc: `Lightens every mix. Used in ${used(tubes.length)} of ${n} mixes, so have plenty.`
	});
	list.push(
		settings.med === 'oil'
			? OPTIONAL_OIL
			: {
					chip: 'transparent',
					name: 'Acrylic retarder or slow-drying medium',
					desc: 'Optional. Keeps your color puddles workable longer on the palette.'
				}
	);
	return list;
}

export const paintList = (zones: Zone[], settings: StudySettings) =>
	isMono(settings) ? monoPaints(zones, settings) : limitedPaints(zones, settings);

const PUNCHY: Contrast[] = ['punchy', 'bold'];

function monoTips(settings: StudySettings, brightened: boolean) {
	const p = requirePaint(settings.brand, settings.pig);
	const b = paintById(settings.brand, p[settings.darks]);
	const tips = [
		'Mix every tone before you start painting, in separate puddles, lightest to darkest. Make more of the tones with the largest share of the image.',
		`For the light tones, add the ${short(p)} into the white a little at a time. ${p.name} is far stronger than white, so going the other way wastes paint.`,
		b
			? `For the darkest tones, add the ${short(b)} into the ${short(p)} with the knife tip, a little at a time. Too much shifts the hue.`
			: `The darkest tone is ${p.name} straight from the tube.`,
		'Check each puddle by dabbing it on a scrap card and holding it against the same area of a grayscale print of your photo. Squint to compare.',
		settings.med === 'acrylic'
			? 'Let a test dab dry for a minute before judging it. Acrylic darkens as it dries.'
			: 'Keep the oil content low in early layers (fat over lean), especially if you will paint color over this study later.',
		'Paint in tone order: block in the darkest shapes first, then work up to the lights.'
	];
	if (PUNCHY.includes(settings.contrast) || settings.key === 'brighter' || brightened) {
		tips.push(
			'For extra color punch, keep the mixes with the least white (the middle tones) in your focal area. White makes a color paler as well as lighter, so the strongest color sits in the middle values.'
		);
	}
	return tips;
}

function limitedTips(settings: StudySettings) {
	const t = paletteTubes(settings.palette, settings.brand);
	const tips = [
		'Mix every color before you start, in separate puddles. Make more of the colors with the largest share of the picture.',
		'Match value first, then hue. Dab each mix on a card next to the same area of your photo and squint. A mix with the right value but slightly off hue still reads correctly.'
	];
	if (settings.palette === 'zorn') {
		tips.push(
			`Zorn has no real blue. ${t[2].name} with white looks blue-gray next to the warm ochre and red, so let it do the job of blue in skies, eyes and shadows.`,
			`For skin, start from ${t[0].name}, ${t[1].name} and white, then cool the shadow side with a little of the black-and-white gray.`
		);
	}
	if (settings.palette === 'primary') {
		tips.push(
			'Primaries make the brightest mixes of these palettes. Browns and grays come from mixing all three, so add the third color a little at a time to dull a mix.',
			`${t[2].name} is the strongest paint here. Add it in specks.`
		);
	}
	if (settings.palette === 'warmcool') {
		tips.push(
			`Mix two strings first, at values 1, 3, 5, 7 and 9: cool grays from ${t[1].name} and white, and warm red-oranges from ${t[0].name} and white.`,
			'For basic skin tones, mix 2 parts of a red-orange with 1 part of the gray at the same value.',
			'Blend toward the red-oranges for warmer cheeks and lips, and toward the grays for hair and cooler notes. Use the grays for blue eyes and backgrounds.'
		);
	}
	tips.push(
		settings.med === 'acrylic'
			? 'Let a test dab dry for a minute before judging it. Acrylic darkens as it dries.'
			: 'Keep the oil content low in early layers (fat over lean).',
		'Paint from dark to light: block in the darkest shapes first, then work up to the lights.'
	);
	return tips;
}

export const workingTips = (settings: StudySettings, brightened: boolean) =>
	isMono(settings) ? monoTips(settings, brightened) : limitedTips(settings);

export function studyTitle(settings: StudySettings) {
	return isMono(settings)
		? `${requirePaint(settings.brand, settings.pig).name} value study`
		: `${limitedDef(settings.palette).title} study`;
}

export function studyMeta(zones: Zone[], settings: StudySettings) {
	const brand = BRANDS[settings.brand].brand + (settings.med === 'acrylic' ? ' acrylic' : '');
	if (!isMono(settings)) return `${zones.length} colors · ${brand}`;
	const vmin = (zones[0].L / 10).toFixed(1);
	const vmax = (zones[zones.length - 1].L / 10).toFixed(1);
	return `${zones.length} tones · values ${vmin} to ${vmax} · ${brand}`;
}

export function adjustmentSummary(settings: StudySettings, brightened: boolean) {
	const mono = isMono(settings);
	const bits = [mono ? `${settings.n} tones` : `${settings.nColors} colors`];
	if (mono && settings.mode === 'even') bits.push('even steps');
	if (settings.contrast !== 'natural') bits.push(`${settings.contrast} contrast`);
	if (settings.key !== 'natural') bits.push(settings.key);
	if (brightened) bits.push('area brightened');
	return bits.join(' · ');
}

export const toneWarning = (z: Zone, settings: StudySettings) =>
	isMono(settings) ? (z.short ? 'darkest reachable with these paints' : '') : gamutNote(z);

/** The plain-text version of the painting sheet. */
export function sheetText(study: Study, channels: PhotoMask, settings: StudySettings) {
	const { zones } = study;
	const mono = isMono(settings);
	const unit = mono ? 'Tone' : 'Color';
	const anyMask = channels.mask.some((v) => v > 0);
	const summaryArea = anyMask && settings.lift > 0;
	const out = [
		studyTitle(settings).toUpperCase(),
		`${settings.label} · ${studyMeta(zones, settings)} · ${adjustmentSummary(settings, summaryArea)}`,
		'',
		'PAINTS'
	];
	for (const item of paintList(zones, settings)) out.push(`- ${item.name}: ${item.desc}`);
	out.push('', `${mono ? 'TONES' : 'COLORS'} (darkest to lightest)`);
	zones.forEach((z, i) => {
		const r = zoneRecipe(z, settings);
		const warn = toneWarning(z, settings);
		out.push(
			`${unit} ${i + 1} | value ${(z.L / 10).toFixed(1)} | ${Math.round(z.area * 100)}% of image | ${r.main} (${r.sub})${warn ? ` | ${warn}` : ''}`
		);
	});
	out.push('', 'TIPS');
	workingTips(settings, anyMask).forEach((tip, i) => out.push(`${i + 1}. ${tip}`));
	out.push(
		'',
		'Ratios are model estimates by volume. Test each mix on a card against your reference.'
	);
	return out.join('\n');
}

export const targetSwatch = (z: Zone, settings: StudySettings) =>
	isMono(settings) ? grayHex(z.L) : hex(z.target as number[]);
