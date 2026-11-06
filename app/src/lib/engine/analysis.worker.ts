// Runs photo analysis away from the screen so scrolling and sliders stay smooth.
import { createSession, type WorkerRequest } from './session';

const handle = createSession();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const response = handle(event.data);
	const study = response.ok ? response.study : undefined;
	const transfer = [study?.assign.buffer, study?.sharp?.assign.buffer].filter((b) => !!b);
	(self as unknown as Worker).postMessage(response, transfer as ArrayBuffer[]);
};
