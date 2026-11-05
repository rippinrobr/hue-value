// Runs photo analysis away from the screen so scrolling and sliders stay smooth.
import { createSession, type WorkerRequest } from './session';

const handle = createSession();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const response = handle(event.data);
	const assign = response.ok ? response.study?.assign : undefined;
	(self as unknown as Worker).postMessage(response, assign ? [assign.buffer] : []);
};
