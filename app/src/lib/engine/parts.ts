// Recipe wording, matching today's app: "1 part", "3 parts", "2.5 parts".
export const fmt = (n: number) => (Number.isInteger(n) ? n : n.toFixed(1));

export function parts(n: number): string {
	return n === 1 ? '1 part' : `${fmt(n)} parts`;
}

/** Rounds a ratio to a number that is easy to measure out. */
export function nice(n: number) {
	if (n < 3) return Math.max(0.5, Math.round(n * 2) / 2);
	if (n < 20) return Math.round(n);
	if (n < 60) return Math.round(n / 5) * 5;
	return Math.round(n / 10) * 10;
}
