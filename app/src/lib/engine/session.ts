// The worker's side of analysis: it keeps the photo's channels and answers requests.
import { analyze, imageChannels } from './analysis';
import type { ImageChannels, Study, StudySettings } from './types';

export type WorkerRequest =
	| { id: number; type: 'load'; pixels: Uint8ClampedArray; width: number; height: number }
	| { id: number; type: 'mask'; mask: Float32Array }
	| { id: number; type: 'analyze'; settings: StudySettings };

export type WorkerResponse =
	{ id: number; ok: true; study?: Study } | { id: number; ok: false; error: string };

export function createSession() {
	let channels: ImageChannels | null = null;

	const run = (request: WorkerRequest): Study | undefined => {
		if (request.type === 'load') {
			channels = imageChannels(request.pixels, request.width, request.height);
			return undefined;
		}
		if (!channels) throw new Error('No photo is loaded');
		if (request.type === 'mask') {
			channels.mask.set(request.mask);
			return undefined;
		}
		return analyze(channels, request.settings);
	};

	return (request: WorkerRequest): WorkerResponse => {
		try {
			return { id: request.id, ok: true, study: run(request) };
		} catch (error) {
			return { id: request.id, ok: false, error: String(error) };
		}
	};
}
