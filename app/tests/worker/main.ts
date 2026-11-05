// Runs the engine through a real worker, for tests/worker/run.mjs.
import {
	DEFAULT_SETTINGS,
	analyze,
	createAnalysisClient,
	hex,
	imageChannels,
	photoPixels,
	sheetText,
	zoneRecipe,
	type StudySettings,
	type Zone
} from '../../src/lib/engine';

interface Case {
	name: string;
	settings: Partial<StudySettings>;
	brighten?: { x: number; y: number; r: number };
}

const round = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * 1e6) / 1e6);

const describeZone = (z: Zone, settings: StudySettings) => ({
	L: round(z.L),
	area: round(z.area),
	a: round(z.a),
	b: round(z.b),
	c: round(z.c),
	lim: z.lim,
	deep: round(z.deep),
	partner: z.partner,
	short: z.short,
	w: z.w?.map((v) => round(v)),
	err: round(z.err),
	mix: hex(z.mix),
	text: zoneRecipe(z, settings)
});

async function decode(png: string) {
	const image = new Image();
	image.src = png;
	await image.decode();
	return image;
}

async function run(png: string, cases: Case[]) {
	const image = await decode(png);
	const out = [];
	const client = createAnalysisClient();
	for (const c of cases) {
		const settings = { ...DEFAULT_SETTINGS, label: 'case', ...c.settings };
		const { pixels, width, height } = photoPixels(image, image.width, image.height);
		await client.load(pixels, width, height);
		const mask = new Float32Array(width * height);
		if (c.brighten) {
			const b = c.brighten;
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					if (Math.hypot(x - b.x * width, y - b.y * height) < b.r * width) mask[y * width + x] = 1;
				}
			}
			await client.setMask(mask);
		}
		const study = await client.analyze(settings);
		if (!study) throw new Error('A lone request was dropped');
		out.push({
			name: c.name,
			width,
			height,
			assign: Array.from(study.assign),
			zones: JSON.parse(JSON.stringify(study.zones.map((z) => describeZone(z, settings)))),
			sheet: sheetText(study, { width, height, mask }, settings)
		});
	}
	client.terminate();
	return out;
}

// The longest the screen went without a chance to update while `work` ran.
async function longestFreeze(work: () => Promise<unknown>) {
	let last = performance.now();
	let longest = 0;
	const beat = setInterval(() => {
		const now = performance.now();
		longest = Math.max(longest, now - last);
		last = now;
	}, 4);
	await new Promise((resolve) => setTimeout(resolve, 30));
	await work();
	await new Promise((resolve) => setTimeout(resolve, 30));
	clearInterval(beat);
	return Math.round(longest);
}

async function freeze(png: string) {
	const image = await decode(png);
	const settings = { ...DEFAULT_SETTINGS, palette: 'zorn', nColors: 12 } as StudySettings;
	const client = createAnalysisClient();
	const { pixels, width, height } = photoPixels(image, image.width, image.height);
	const copy = pixels.slice();
	await client.load(pixels, width, height);
	const worker = await longestFreeze(() => client.analyze(settings));
	const screen = await longestFreeze(async () =>
		analyze(imageChannels(copy, width, height), settings)
	);
	client.terminate();
	return { worker, screen };
}

// Fires a burst of slider changes and counts how many actually get answered.
async function burst(png: string) {
	const image = await decode(png);
	const client = createAnalysisClient();
	const { pixels, width, height } = photoPixels(image, image.width, image.height);
	await client.load(pixels, width, height);
	const results = await Promise.all(
		[3, 4, 5, 6, 7, 8, 9, 3, 4, 5, 6, 7].map((n) => client.analyze({ ...DEFAULT_SETTINGS, n }))
	);
	client.terminate();
	return { answered: results.filter(Boolean).length, lastTones: results.at(-1)?.zones.length };
}

Object.assign(window, { workerTest: { run, freeze, burst } });
