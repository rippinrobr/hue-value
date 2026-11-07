import { describe, expect, it } from 'vitest';
import { analyze, analysisSize, imageChannels } from './analysis';
import { createSession } from './session';
import { DEFAULT_SETTINGS } from './types';

const gradient = () => {
	const pixels = new Uint8ClampedArray(4 * 100);
	for (let i = 0; i < 100; i++) pixels.fill(i * 2.5, i * 4, i * 4 + 3);
	return pixels;
};

describe('session', () => {
	it('gives the same answer as analyzing directly', () => {
		const handle = createSession();
		handle({ id: 1, type: 'load', pixels: gradient(), width: 10, height: 10 });
		const response = handle({ id: 2, type: 'analyze', settings: DEFAULT_SETTINGS });
		const direct = analyze(imageChannels(gradient(), 10, 10), DEFAULT_SETTINGS);
		expect(response).toEqual({ id: 2, ok: true, study: direct });
	});

	it('uses the brighten mask', () => {
		const handle = createSession();
		handle({ id: 1, type: 'load', pixels: gradient(), width: 10, height: 10 });
		const plain = handle({ id: 2, type: 'analyze', settings: DEFAULT_SETTINGS });
		handle({ id: 3, type: 'mask', mask: new Float32Array(100).fill(1) });
		const lifted = handle({ id: 4, type: 'analyze', settings: DEFAULT_SETTINGS });
		expect(lifted).not.toEqual({ ...plain, id: 4 });
	});

	it('reports an error when no photo is loaded', () => {
		const response = createSession()({ id: 1, type: 'analyze', settings: DEFAULT_SETTINGS });
		expect(response).toMatchObject({ id: 1, ok: false, error: 'Error: No photo is loaded' });
	});
});

describe('analysisSize', () => {
	it('reduces the long side to 520', () => {
		expect(analysisSize(4032, 3024)).toEqual({ width: 520, height: 390 });
	});

	it('leaves small photos alone', () => {
		expect(analysisSize(320, 400)).toEqual({ width: 320, height: 400 });
	});
});
