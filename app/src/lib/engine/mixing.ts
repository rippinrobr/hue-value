// Kubelka–Munk paint mixing and the recipe solvers.
import { ks, labOf, lumY, rFromKs } from './color';
import type { Pigment, RGB } from './types';

export const WHITE = { name: 'Titanium White', rgb: [0.9, 0.9, 0.885], s: 1, id: 'white' };

const channels = (f: (i: number) => number): RGB => [f(0), f(1), f(2)];

/** A paint mixed with white, c being the paint's share by volume. */
export function mix(c: number, p: Pigment): RGB {
	return channels((i) => {
		const kd = ks(p.rgb[i]);
		const kw = ks(WHITE.rgb[i]);
		const w = c * p.s;
		const u = 1 - c;
		return rFromKs((w * kd + u * kw) / (w + u));
	});
}

export function solve(targetY: number, p: Pigment): { c: number; lim: 'white' | 'dark' | null } {
	const yW = lumY(mix(0, p));
	const yD = lumY(mix(1, p));
	if (targetY >= yW) return { c: 0, lim: 'white' };
	if (targetY <= yD) return { c: 1, lim: 'dark' };
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 50; i++) {
		const m = (lo + hi) / 2;
		if (lumY(mix(m, p)) > targetY) lo = m;
		else hi = m;
	}
	return { c: (lo + hi) / 2, lim: null };
}

/** Two paints and no white, d being b's share. */
export function mix2(d: number, a: Pigment, b: Pigment): RGB {
	return channels((i) => {
		const wa = (1 - d) * a.s;
		const wb = d * b.s;
		return rFromKs((wa * ks(a.rgb[i]) + wb * ks(b.rgb[i])) / (wa + wb));
	});
}

export function solveDeep(targetY: number, a: Pigment, b: Pigment): number {
	let best = 0;
	let bd = 1e9;
	for (let d = 0; d <= 0.6001; d += 0.005) {
		const e = Math.abs(lumY(mix2(d, a, b)) - targetY);
		if (e < bd) {
			bd = e;
			best = d;
		}
	}
	return best;
}

/** Any number of paints, by volume. */
export function mixN(comps: Pigment[], w: number[]): RGB {
	let S = 0;
	const K = [0, 0, 0];
	for (let j = 0; j < comps.length; j++) {
		if (!(w[j] > 0)) continue;
		const e = w[j] * comps[j].s;
		S += e;
		for (let i = 0; i < 3; i++) K[i] += e * ks(comps[j].rgb[i]);
	}
	return channels((i) => rFromKs(K[i] / S));
}

// Value errors matter most to a painter, so lightness counts a little more than hue.
function dE(lin: RGB, t: number[]) {
	const l = labOf(lin);
	return Math.hypot(1.4 * (l[0] - t[0]), l[1] - t[1], l[2] - t[2]);
}

export function solveRecipe(target: number[], comps: Pigment[]) {
	const m = comps.length;
	const T = 12;
	const w: number[] = new Array(m).fill(0);
	let best: number[] = [];
	let be = 1e9;
	const search = (j: number, left: number) => {
		if (j === m - 1) {
			w[j] = left;
			if (!w.some((v) => v)) return;
			const e = dE(mixN(comps, w), target);
			if (e < be) {
				be = e;
				best = w.slice();
			}
			return;
		}
		for (let v = 0; v <= left; v++) {
			w[j] = v;
			search(j + 1, left - v);
		}
	};
	search(0, T);
	let cur = best.map((v) => v / T);
	const steps = [0, 0.5, 0.75, 0.9, 1.1, 1.3, 1.8, 3];
	for (let it = 0; it < 60; it++) {
		let improved = false;
		for (let j = 0; j < m; j++) {
			for (const f of steps) {
				const t = cur.slice();
				t[j] = cur[j] === 0 ? (f > 1 ? 0.01 : 0) : cur[j] * f;
				if (!t.some((v) => v > 0)) continue;
				const e = dE(mixN(comps, t), target);
				if (e < be - 1e-6) {
					be = e;
					cur = t;
					improved = true;
				}
			}
		}
		if (!improved) break;
	}
	const norm = (a: number[]) => {
		const s = a.reduce((x, y) => x + y, 0);
		return a.map((v) => v / s);
	};
	cur = norm(cur);
	// Drop specks that barely change the mix: fewer paints is easier at the easel.
	for (let j = 0; j < m; j++) {
		if (cur[j] > 0 && cur[j] < 0.03) {
			const t = norm(cur.map((v, k) => (k === j ? 0 : v)));
			const e = dE(mixN(comps, t), target);
			if (e < be + 1.5) {
				cur = t;
				be = e;
			}
		}
	}
	return { w: cur, err: be, mix: mixN(comps, cur) };
}
