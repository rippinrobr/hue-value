import type { RGB } from './types';

export const ks = (r: number) => ((1 - r) * (1 - r)) / (2 * r);
export const rFromKs = (k: number) => 1 + k - Math.sqrt(k * k + 2 * k);
export const lumY = (c: ArrayLike<number>) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const toLin = (byte: number) => {
	const v = byte / 255;
	return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

export const toSRGB = (value: number) => {
	const v = Math.max(0, Math.min(1, value));
	return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
};

export const LfromY = (Y: number) => (Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y);
export const YfromL = (L: number) => (L > 8 ? Math.pow((L + 16) / 116, 3) : L / 903.3);

export const hex = (c: ArrayLike<number>) =>
	'#' +
	Array.from(c)
		.map((v) => toSRGB(v).toString(16).padStart(2, '0'))
		.join('');

export const grayHex = (L: number) => {
	const y = YfromL(L);
	return hex([y, y, y]);
};

// Single precision on purpose: today's app uses a Float32Array here, and the results depend on it.
export const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) LIN[i] = toLin(i);

const fLab = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

export function labOf(lin: ArrayLike<number>): RGB {
	const X = (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.95047;
	const Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
	const Z = (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.08883;
	const fx = fLab(X);
	const fy = fLab(Y);
	const fz = fLab(Z);
	return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function linOfLab(L: number, a: number, b: number): RGB {
	const fy = (L + 16) / 116;
	const fx = fy + a / 500;
	const fz = fy - b / 200;
	const inv = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);
	const X = inv(fx) * 0.95047;
	const Y = inv(fy);
	const Z = inv(fz) * 1.08883;
	return [
		3.2406 * X - 1.5372 * Y - 0.4986 * Z,
		-0.9689 * X + 1.8758 * Y + 0.0415 * Z,
		0.0557 * X - 0.204 * Y + 1.057 * Z
	].map((v) => Math.max(0.0005, Math.min(1, v))) as RGB;
}
