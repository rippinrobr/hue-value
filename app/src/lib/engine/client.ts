// The screen's side of analysis. A new request replaces any waiting one, so dragging a
// slider only computes the newest setting, and an old answer never lands on a newer screen.
import type { WorkerRequest, WorkerResponse } from './session';
import type { Study, StudySettings } from './types';

export type WorkerLike = Pick<Worker, 'postMessage' | 'terminate'> & {
	onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
	onerror: ((event: ErrorEvent) => void) | null;
};

interface Waiter {
	resolve: (study: Study | null) => void;
	reject: (error: Error) => void;
}

type Pending = Waiter & { generation: number };
type Send = WorkerRequest extends infer R
	? R extends WorkerRequest
		? Omit<R, 'id'>
		: never
	: never;

export class AnalysisClient {
	#worker: WorkerLike;
	#nextId = 1;
	#pending = new Map<number, Pending>();
	#analyzing = false;
	#queued: (Waiter & { settings: StudySettings }) | null = null;
	#generation = 0;

	constructor(worker: WorkerLike) {
		this.#worker = worker;
		worker.onmessage = (event) => this.#receive(event.data);
		worker.onerror = (event) => this.#failAll(new Error(event.message || 'Analysis failed'));
	}

	#send(request: Send, transfer: Transferable[] = []) {
		const id = this.#nextId++;
		return new Promise<Study | null>((resolve, reject) => {
			this.#pending.set(id, { resolve, reject, generation: this.#generation });
			this.#worker.postMessage({ ...request, id }, transfer);
		});
	}

	#receive(response: WorkerResponse) {
		const waiter = this.#pending.get(response.id);
		if (!waiter) return;
		this.#pending.delete(response.id);
		if (!response.ok) waiter.reject(new Error(response.error));
		else if (waiter.generation !== this.#generation || this.#queued) waiter.resolve(null);
		else waiter.resolve(response.study ?? null);
	}

	#failAll(error: Error) {
		for (const waiter of this.#pending.values()) waiter.reject(error);
		this.#pending.clear();
		this.#queued?.reject(error);
		this.#queued = null;
		this.#analyzing = false;
	}

	#startAnalysis(settings: StudySettings, waiter: Waiter) {
		this.#analyzing = true;
		this.#send({ type: 'analyze', settings }).then(
			(study) => {
				this.#analyzing = false;
				waiter.resolve(study);
				const next = this.#queued;
				if (next) {
					this.#queued = null;
					this.#startAnalysis(next.settings, next);
				}
			},
			(error) => waiter.reject(error)
		);
	}

	/** Hands a photo's pixels to the worker. The buffer moves there, so `pixels` empties. */
	async load(pixels: Uint8ClampedArray<ArrayBuffer>, width: number, height: number) {
		this.#generation++;
		await this.#send({ type: 'load', pixels, width, height }, [pixels.buffer]);
	}

	/** Replaces the brighten-area mask. */
	async setMask(mask: Float32Array) {
		this.#generation++;
		await this.#send({ type: 'mask', mask });
	}

	/** Resolves with the study, or null when a newer request replaced this one. */
	analyze(settings: StudySettings) {
		return new Promise<Study | null>((resolve, reject) => {
			const waiter = { resolve, reject };
			if (this.#analyzing) {
				this.#queued?.resolve(null);
				this.#queued = { ...waiter, settings };
			} else this.#startAnalysis(settings, waiter);
		});
	}

	terminate() {
		this.#worker.terminate();
		this.#failAll(new Error('Analysis stopped'));
	}
}

export function createAnalysisClient() {
	const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
	return new AnalysisClient(worker as unknown as WorkerLike);
}
