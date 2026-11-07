import { describe, expect, it } from 'vitest';
import { AnalysisClient, type WorkerLike } from './client';
import type { WorkerRequest } from './session';
import { DEFAULT_SETTINGS, type Study } from './types';

const study = (L: number): Study => ({
	zones: [{ L, area: 1, mix: [0, 0, 0] }],
	assign: new Uint8Array(1)
});

function fakeWorker() {
	const sent: WorkerRequest[] = [];
	const worker: WorkerLike = {
		onmessage: null,
		onerror: null,
		postMessage: (message: WorkerRequest) => void sent.push(message),
		terminate: () => undefined
	};
	const reply = (request: WorkerRequest, result?: Study) =>
		worker.onmessage?.({ data: { id: request.id, ok: true, study: result } } as MessageEvent);
	const fail = (request: WorkerRequest) =>
		worker.onmessage?.({ data: { id: request.id, ok: false, error: 'bad' } } as MessageEvent);
	return { worker, sent, reply, fail };
}

const settings = (n: number) => ({ ...DEFAULT_SETTINGS, n });
const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('AnalysisClient', () => {
	it('returns the study for a single request', async () => {
		const { worker, sent, reply } = fakeWorker();
		const result = new AnalysisClient(worker).analyze(settings(5));
		reply(sent[0], study(50));
		expect((await result)?.zones[0].L).toBe(50);
	});

	it('runs only the newest of several waiting requests', async () => {
		const { worker, sent, reply } = fakeWorker();
		const client = new AnalysisClient(worker);
		const first = client.analyze(settings(3));
		const second = client.analyze(settings(4));
		const third = client.analyze(settings(5));
		expect(sent).toHaveLength(1);
		expect(await second).toBeNull();
		reply(sent[0], study(1));
		expect(await first).toBeNull();
		await flush();
		expect(sent).toHaveLength(2);
		expect(sent[1]).toMatchObject({ type: 'analyze', settings: { n: 5 } });
		reply(sent[1], study(2));
		expect((await third)?.zones[0].L).toBe(2);
	});

	it('drops an answer that arrives after a new photo', async () => {
		const { worker, sent, reply } = fakeWorker();
		const client = new AnalysisClient(worker);
		const old = client.analyze(settings(5));
		const load = client.load(new Uint8ClampedArray(4), 1, 1);
		reply(sent[0], study(1));
		reply(sent[1]);
		await load;
		expect(await old).toBeNull();
	});

	it('rejects when the worker reports a failure', async () => {
		const { worker, sent, fail } = fakeWorker();
		const result = new AnalysisClient(worker).analyze(settings(5));
		fail(sent[0]);
		await expect(result).rejects.toThrow('bad');
	});

	it('rejects everything when the worker crashes', async () => {
		const { worker } = fakeWorker();
		const client = new AnalysisClient(worker);
		const running = client.analyze(settings(3));
		const waiting = client.analyze(settings(4));
		worker.onerror?.({ message: 'crashed' } as ErrorEvent);
		await expect(running).rejects.toThrow('crashed');
		await expect(waiting).rejects.toThrow('crashed');
	});
});
