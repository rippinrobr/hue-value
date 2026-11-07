// The sharp map only redraws the groups for the screen, so on the analysis-size photo it
// must put almost every pixel in the same group the analysis did.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { analyze, imageChannels, sharpMap } from './analysis';
import { DEFAULT_SETTINGS, type StudySettings } from './types';

const images = path.resolve(import.meta.dirname, '../../../tests/golden/images');

const cases: [string, Partial<StudySettings>][] = [
	['still-life.png', {}],
	['still-life.png', { mode: 'even', n: 7, contrast: 'bold' }],
	['still-life.png', { palette: 'zorn', nColors: 8 }],
	['color-field.png', { palette: 'primary', nColors: 12, key: 'brighter' }]
];

describe('sharp map', () => {
	it.each(cases)('%s %o matches the analysis', (file, patch) => {
		const png = PNG.sync.read(readFileSync(path.join(images, file)));
		const channels = imageChannels(png.data, png.width, png.height);
		for (let i = 0; i < channels.mask.length; i += 7) channels.mask[i] = i % 3 ? 0 : 0.8;
		const settings: StudySettings = { ...DEFAULT_SETTINGS, label: 'case', ...patch };
		const study = analyze(channels, settings);
		const sharp = sharpMap(channels, channels, study.zones, settings);
		let same = 0;
		for (let i = 0; i < sharp.assign.length; i++) if (sharp.assign[i] === study.assign[i]) same++;
		expect(same / sharp.assign.length).toBeGreaterThan(0.99);
	});
});
