import { describe, expect, it } from 'vitest';
import { parts } from './parts';

describe('parts', () => {
	it('uses the singular for one part', () => {
		expect(parts(1)).toBe('1 part');
	});

	it('uses the plural for whole numbers', () => {
		expect(parts(3)).toBe('3 parts');
	});

	it('shows one decimal place for fractions', () => {
		expect(parts(2.5)).toBe('2.5 parts');
	});
});
