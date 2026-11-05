// Turns a photo's pixels into tone or color groups, then solves a mix for each group.
import { LIN, LfromY, YfromL, labOf, linOfLab, lumY } from './color';
import { WHITE_TUBE, paintById, paletteTubes, requirePaint } from './catalog';
import { mix, mix2, solve, solveDeep, solveRecipe } from './mixing';
import type {
	Contrast,
	Darks,
	ImageChannels,
	Key,
	PhotoMask,
	StudySettings,
	Study,
	Zone
} from './types';

export const MAX_ANALYSIS_SIZE = 520;

/** The reduced size the photo is analyzed at. */
export function analysisSize(width: number, height: number) {
	const scale = Math.min(1, MAX_ANALYSIS_SIZE / Math.max(width, height));
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

export function imageChannels(
	data: ArrayLike<number>,
	width: number,
	height: number
): ImageChannels {
	const size = width * height;
	const channels: ImageChannels = {
		width,
		height,
		Lraw: new Float32Array(size),
		Araw: new Float32Array(size),
		Braw: new Float32Array(size),
		mask: new Float32Array(size)
	};
	for (let i = 0, j = 0; i < data.length; i += 4, j++) {
		const r = LIN[data[i]];
		const g = LIN[data[i + 1]];
		const b = LIN[data[i + 2]];
		channels.Lraw[j] = LfromY(0.2126 * r + 0.7152 * g + 0.0722 * b);
		const lab = labOf([r, g, b]);
		channels.Araw[j] = lab[1];
		channels.Braw[j] = lab[2];
	}
	return channels;
}

const CONTRAST: Record<Contrast, number> = { soft: -0.3, natural: 0, punchy: 0.55, bold: 1.0 };
const KEY: Record<Key, number> = { darker: 1.25, natural: 1, brighter: 0.78 };

/** Area lift from the brush, then key (overall brightness), then a contrast S-curve. */
export function adjustedLightness(L: number, m: number, settings: StudySettings) {
	const c = CONTRAST[settings.contrast];
	const g = KEY[settings.key];
	let value = L;
	if (m > 0) {
		const x = value / 100;
		value = 100 * (x + (1 - x) * ((m * settings.lift) / 40));
	}
	let x = Math.max(0, Math.min(1, value / 100));
	x = Math.pow(x, g);
	if (c !== 0) {
		const e = c > 0 ? 1 + c : 1 / (1 - c);
		x = x < 0.5 ? 0.5 * Math.pow(2 * x, e) : 1 - 0.5 * Math.pow(2 - 2 * x, e);
	}
	return x * 100;
}

function groupTones(Lpix: Float32Array, settings: StudySettings): Study {
	const hist = new Float64Array(101);
	for (let i = 0; i < Lpix.length; i++) hist[Math.max(0, Math.min(100, Math.round(Lpix[i])))]++;
	const total = Lpix.length;
	const pct = (q: number) => {
		let a = 0;
		for (let i = 0; i <= 100; i++) {
			a += hist[i];
			if (a >= q * total) return i;
		}
		return 100;
	};
	const k = settings.n;
	const cents: number[] = [];
	if (settings.mode === 'even') {
		const lo = pct(0.01);
		const hi = Math.max(lo + 1, pct(0.99));
		const w = (hi - lo) / k;
		for (let i = 0; i < k; i++) cents.push(lo + (i + 0.5) * w);
	} else {
		for (let i = 0; i < k; i++) cents.push(pct((i + 0.5) / k));
		for (let it = 0; it < 40; it++) {
			const s = new Float64Array(k);
			const n = new Float64Array(k);
			for (let b = 0; b <= 100; b++) {
				if (!hist[b]) continue;
				let bi = 0;
				let bd = 1e9;
				for (let j = 0; j < k; j++) {
					const dd = Math.abs(b - cents[j]);
					if (dd < bd) {
						bd = dd;
						bi = j;
					}
				}
				s[bi] += b * hist[b];
				n[bi] += hist[b];
			}
			let moved = false;
			for (let j = 0; j < k; j++) {
				if (n[j]) {
					const nc = s[j] / n[j];
					if (Math.abs(nc - cents[j]) > 0.01) moved = true;
					cents[j] = nc;
				}
			}
			if (!moved) break;
		}
	}
	cents.sort((a, b) => a - b);
	const assign = new Uint8Array(total);
	const cnt = new Float64Array(k);
	const sum = new Float64Array(k);
	for (let i = 0; i < total; i++) {
		const L = Lpix[i];
		let bi = 0;
		let bd = 1e9;
		for (let j = 0; j < k; j++) {
			const dd = Math.abs(L - cents[j]);
			if (dd < bd) {
				bd = dd;
				bi = j;
			}
		}
		assign[i] = bi;
		cnt[bi]++;
		sum[bi] += L;
	}
	const map = new Int16Array(k).fill(-1);
	const zones: Zone[] = [];
	for (let j = 0; j < k; j++) {
		if (cnt[j] > 0) {
			map[j] = zones.length;
			zones.push({
				L: settings.mode === 'even' ? cents[j] : sum[j] / cnt[j],
				area: cnt[j] / total,
				mix: [0, 0, 0]
			});
		}
	}
	for (let i = 0; i < total; i++) assign[i] = map[assign[i]];
	return { zones, assign };
}

// K-means in Lab, with lightness taken from the adjusted photo.
function groupColors(channels: ImageChannels, Lpix: Float32Array, settings: StudySettings): Study {
	const { Araw, Braw } = channels;
	const total = Lpix.length;
	const k = settings.nColors;
	const step = Math.max(1, Math.floor(total / 20000));
	const S: number[] = [];
	for (let i = 0; i < total; i += step) S.push(i);
	const d2 = (i: number, c: number[]) => {
		const x = Lpix[i] - c[0];
		const y = Araw[i] - c[1];
		const z = Braw[i] - c[2];
		return x * x + y * y + z * z;
	};
	let a0 = 0;
	let b0 = 0;
	let c0 = 0;
	for (const i of S) {
		a0 += Lpix[i];
		b0 += Araw[i];
		c0 += Braw[i];
	}
	let cents = [[a0 / S.length, b0 / S.length, c0 / S.length]];
	const dmin = new Float64Array(S.length).fill(1e18);
	while (cents.length < k) {
		const c = cents[cents.length - 1];
		let bi = -1;
		let bd = -1;
		for (let s = 0; s < S.length; s++) {
			const d = d2(S[s], c);
			if (d < dmin[s]) dmin[s] = d;
			if (dmin[s] > bd) {
				bd = dmin[s];
				bi = s;
			}
		}
		if (bd <= 4) break;
		const i = S[bi];
		cents.push([Lpix[i], Araw[i], Braw[i]]);
	}
	const near = (i: number) => {
		let bi = 0;
		let bd = 1e18;
		for (let j = 0; j < cents.length; j++) {
			const d = d2(i, cents[j]);
			if (d < bd) {
				bd = d;
				bi = j;
			}
		}
		return bi;
	};
	for (let it = 0; it < 25; it++) {
		const acc = cents.map(() => [0, 0, 0, 0]);
		for (const i of S) {
			const q = acc[near(i)];
			q[0] += Lpix[i];
			q[1] += Araw[i];
			q[2] += Braw[i];
			q[3]++;
		}
		let moved = 0;
		const next: number[][] = [];
		acc.forEach((q, j) => {
			if (!q[3]) return;
			const c = [q[0] / q[3], q[1] / q[3], q[2] / q[3]];
			moved +=
				Math.abs(c[0] - cents[j][0]) + Math.abs(c[1] - cents[j][1]) + Math.abs(c[2] - cents[j][2]);
			next.push(c);
		});
		cents = next;
		if (moved < 0.05) break;
	}
	const assign = new Uint8Array(total);
	const acc = cents.map(() => [0, 0, 0, 0]);
	for (let i = 0; i < total; i++) {
		const j = near(i);
		assign[i] = j;
		const q = acc[j];
		q[0] += Lpix[i];
		q[1] += Araw[i];
		q[2] += Braw[i];
		q[3]++;
	}
	const order = acc
		.map((q, j) => ({ j, q }))
		.filter((o) => o.q[3] > 0)
		.sort((x, y) => x.q[0] / x.q[3] - y.q[0] / y.q[3]);
	const map = new Int16Array(cents.length).fill(0);
	const zones: Zone[] = [];
	order.forEach((o, n) => {
		map[o.j] = n;
		const q = o.q;
		const L = q[0] / q[3];
		const a = q[1] / q[3];
		const b = q[2] / q[3];
		zones.push({ L, a, b, area: q[3] / total, target: linOfLab(L, a, b), mix: [0, 0, 0] });
	});
	for (let i = 0; i < total; i++) assign[i] = map[assign[i]];
	return { zones, assign };
}

function mixLimited(zones: Zone[], settings: StudySettings) {
	const comps = [...paletteTubes(settings.palette, settings.brand), WHITE_TUBE];
	const shift = settings.med === 'acrylic' ? 3 : 0;
	for (const z of zones) {
		const r = solveRecipe([Math.min(100, z.L + shift), z.a as number, z.b as number], comps);
		z.comps = comps;
		z.w = r.w;
		z.err = r.err;
		z.mix = r.mix;
	}
}

function mixMono(zones: Zone[], settings: StudySettings) {
	const p = requirePaint(settings.brand, settings.pig);
	const partners = {
		near: paintById(settings.brand, p.near),
		comp: paintById(settings.brand, p.comp)
	};
	const shift = settings.med === 'acrylic' ? 3 : 0;
	const pureL = LfromY(lumY(mix(1, p)));
	for (const z of zones) {
		const tL = Math.min(100, z.L + shift);
		const r = solve(YfromL(tL), p);
		z.c = r.c;
		z.lim = r.lim;
		const variant = (key: Darks) => {
			const b = partners[key];
			let d = 0;
			let m = mix(r.c, p);
			if (b && r.lim === 'dark' && tL < pureL - 2) {
				d = solveDeep(YfromL(tL), p, b);
				if (d > 0) m = mix2(d, p, b);
			}
			return {
				deep: d,
				mix: m,
				partner: b ? b.id : null,
				short: z.L < LfromY(lumY(m)) - 5
			};
		};
		z.v = { near: variant('near'), comp: variant('comp') };
		Object.assign(z, z.v[settings.darks]);
	}
}

/** The whole analysis: adjust the photo, group it, and solve a mix for every group. */
export function analyze(channels: ImageChannels, settings: StudySettings): Study {
	const Lpix = new Float32Array(channels.Lraw.length);
	for (let i = 0; i < Lpix.length; i++) {
		Lpix[i] = adjustedLightness(channels.Lraw[i], channels.mask[i], settings);
	}
	const mono = settings.palette === 'mono';
	const study = mono ? groupTones(Lpix, settings) : groupColors(channels, Lpix, settings);
	if (mono) mixMono(study.zones, settings);
	else mixLimited(study.zones, settings);
	return study;
}

export const hasBrightenedArea = (channels: PhotoMask, settings: StudySettings) =>
	channels.mask.some((v) => v > 0) && settings.lift > 0;
