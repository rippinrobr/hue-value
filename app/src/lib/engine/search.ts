// Paint search across both brands, by name and pigment code.
import { BRANDS, FAMILIES } from './catalog';
import type { BrandId, Paint } from './types';

// Pigment codes like PB29, PBk9, PBr7 or PR101, separated by spaces, commas, plus signs or nothing at all.
const CODE_RE = /P(?:BK|BR|[A-Z])\s?\d+(?::\d+)?/gi;
const normCode = (c: string) => c.toUpperCase().replace(/\s/g, '');
const tubeCodes = (t: Paint) => [...new Set((t.code.match(CODE_RE) ?? []).map(normCode))];

export interface SearchItem {
	paint: Paint;
	brand: BrandId;
	meta: string;
	/** Show the brand beside the name, because the results span both brands. */
	showBrand: boolean;
}

export interface SearchResult {
	intro: string;
	groups: { title: string; items: SearchItem[] }[];
}

const brandIds = Object.keys(BRANDS) as BrandId[];
const value = (p: Paint) => (p.pureL / 10).toFixed(1);

function byPigment(want: string[], words: string[]): SearchResult {
	const named = (p: Paint) => words.every((w) => p.name.toLowerCase().includes(w));
	const tiers: { p: Paint; brand: BrandId; hit: number; extra: number }[][] = [[], [], []];
	for (const brand of brandIds) {
		for (const p of BRANDS[brand].paints) {
			const have = tubeCodes(p);
			const hit = want.filter((c) => have.includes(c)).length;
			if (!hit || !named(p)) continue;
			const tier = hit === want.length ? (have.length === want.length ? 0 : 1) : 2;
			tiers[tier].push({ p, brand, hit, extra: have.length - hit });
		}
	}
	const titles = [
		'Same pigments',
		'Has all of these pigments, plus others',
		'Shares some of these pigments'
	];
	const nameBit = words.length ? ` with "${words.join(' ')}" in the name` : '';
	const groups = tiers.flatMap((list, t) => {
		if (!list.length) return [];
		list.sort(
			(x, y) =>
				y.hit - x.hit ||
				x.extra - y.extra ||
				x.p.name.localeCompare(y.p.name) ||
				x.brand.localeCompare(y.brand)
		);
		return [
			{
				title: `${titles[t]} · ${list.length}`,
				items: list.map((r) => ({
					paint: r.p,
					brand: r.brand,
					meta: `${r.p.code}${t === 2 ? ` · shares ${r.hit} of ${want.length}` : ''} · value ${value(r.p)}`,
					showBrand: true
				}))
			}
		];
	});
	return {
		intro: groups.length
			? `Paints in both brands containing ${want.join(' + ')}${nameBit}. Paints with the same pigments mix and tint very similarly.`
			: `No paint in either brand contains ${want.join(' + ')}${nameBit}. Check the spelling and codes, or try fewer of them.`,
		groups
	};
}

/** With text, searches both brands. With an empty box, browses the current brand by family. */
export function searchPaints(query: string, currentBrand: BrandId): SearchResult {
	const raw = query.trim();
	const want = [...new Set((raw.match(CODE_RE) ?? []).map(normCode))];
	// Words left over once the codes are taken out narrow the results by name, e.g. "phthalo PB15".
	const words = raw
		.replace(CODE_RE, ' ')
		.toLowerCase()
		.split(/[\s,;+&/]+/)
		.filter((w) => w && w !== 'and');
	if (want.length) return byPigment(want, words);

	const q = raw.toLowerCase();
	const flat = (v: string) => v.toLowerCase().replace(/[\s,]/g, '');
	const pool = q
		? brandIds.flatMap((brand) => BRANDS[brand].paints.map((p) => ({ p, brand })))
		: BRANDS[currentBrand].paints.map((p) => ({ p, brand: currentBrand }));
	const list = pool.filter(
		({ p }) => !q || p.name.toLowerCase().includes(q) || flat(p.code).includes(flat(q))
	);
	if (!list.length) {
		return {
			intro:
				'No color in either brand matches that. Try part of the name, or pigment codes like PB29 PG7.',
			groups: []
		};
	}
	const groups = FAMILIES.flatMap(([family, title]) => {
		const items = list
			.filter(({ p }) => p.family === family)
			.sort((x, y) => x.p.name.localeCompare(y.p.name) || x.brand.localeCompare(y.brand));
		if (!items.length) return [];
		return [
			{
				title,
				items: items.map(({ p, brand }) => ({
					paint: p,
					brand,
					meta: `${p.code} · value ${value(p)} at full strength`,
					showBrand: !!q
				}))
			}
		];
	});
	return {
		intro: q
			? `${list.length} match${list.length === 1 ? '' : 'es'} in W&N Artisan and Cobra.`
			: '',
		groups
	};
}
