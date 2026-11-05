// The current study: photo, settings and results, shared by every screen.
import {
	BRANDS,
	DEFAULT_SETTINGS,
	createAnalysisClient,
	exampleCanvas,
	hasBrightenedArea,
	matchingPaint,
	paintById,
	photoPixels,
	type AnalysisClient,
	type BrandId,
	type Medium,
	type PaletteId,
	type Study,
	type StudySettings
} from '#lib/engine/index.ts';

const PREFS_KEY = 'valuemix.prefs';

interface Prefs {
	brand?: BrandId;
	med?: Medium;
	remember?: boolean;
	palette?: PaletteId;
	pig?: string;
}

function readPrefs(): Prefs {
	try {
		return JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') ?? {};
	} catch {
		return {};
	}
}

const PALETTES: PaletteId[] = ['mono', 'zorn', 'primary', 'warmcool'];

class Studio {
	settings = $state<StudySettings>({ ...DEFAULT_SETTINGS, show: 'map' });
	study = $state.raw<Study | null>(null);
	photo = $state.raw<{ image: CanvasImageSource; width: number; height: number } | null>(null);
	thumbnail = $state('');
	mask = $state.raw(new Float32Array(0));
	size = $state({ width: 0, height: 0 });
	selected = $state(-1);
	brushing = $state(false);
	brushSize = $state(28);
	/** Skip the Palette step and use the last palette. */
	remember = $state(false);
	message = $state('');

	#client: AnalysisClient | null = null;
	/** The brand set in Settings, as opposed to one picked for a single study. */
	defaultBrand = $state<BrandId>('artisan');

	constructor() {
		const prefs = readPrefs();
		if (prefs.brand && BRANDS[prefs.brand]) {
			this.settings.brand = prefs.brand;
			this.defaultBrand = prefs.brand;
		}
		if (prefs.med === 'oil' || prefs.med === 'acrylic') this.settings.med = prefs.med;
		this.remember = prefs.remember === true;
		// The last palette comes back either way: "remember" only skips the step.
		if (prefs.palette && PALETTES.includes(prefs.palette)) this.settings.palette = prefs.palette;
		if (prefs.pig && paintById(this.settings.brand, prefs.pig)) this.settings.pig = prefs.pig;
	}

	get mono() {
		return this.settings.palette === 'mono';
	}

	get brightened() {
		return hasBrightenedArea(this.maskInfo, this.settings);
	}

	get painted() {
		return this.mask.some((v) => v > 0);
	}

	get maskInfo() {
		return { width: this.size.width, height: this.size.height, mask: this.mask };
	}

	savePrefs() {
		const prefs: Prefs = {
			brand: this.defaultBrand,
			med: this.settings.med,
			remember: this.remember,
			palette: this.settings.palette,
			pig: this.settings.pig
		};
		try {
			localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
		} catch {
			// Private windows can refuse storage. The study still works.
		}
	}

	async #setPhoto(image: CanvasImageSource, width: number, height: number, label: string) {
		this.#client ??= createAnalysisClient();
		const reduced = photoPixels(image, width, height);
		this.photo = { image, width, height };
		this.size = { width: reduced.width, height: reduced.height };
		this.mask = new Float32Array(reduced.width * reduced.height);
		this.settings.label = label;
		this.selected = -1;
		this.thumbnail = thumbnailOf(image, width, height);
		await this.#client.load(reduced.pixels, reduced.width, reduced.height);
		await this.refresh();
	}

	/** Resolves true once the photo has opened. */
	openFile(file: File | undefined) {
		this.message = '';
		if (!file || !file.type.startsWith('image/')) {
			this.message = 'That file is not an image. Choose a JPG, PNG or HEIC photo.';
			return Promise.resolve(false);
		}
		const url = URL.createObjectURL(file);
		const image = new Image();
		return new Promise<boolean>((resolve) => {
			image.onload = async () => {
				await this.#setPhoto(image, image.width, image.height, file.name);
				URL.revokeObjectURL(url);
				resolve(true);
			};
			image.onerror = () => {
				this.message = 'This browser could not open that photo. Try saving it as JPG first.';
				resolve(false);
			};
			image.src = url;
		});
	}

	openExample() {
		this.message = '';
		const canvas = exampleCanvas();
		return this.#setPhoto(canvas, canvas.width, canvas.height, 'Example still life');
	}

	/** Reruns the analysis. A newer change replaces this one if it arrives first. */
	async refresh() {
		if (!this.#client || !this.photo) return;
		try {
			const study = await this.#client.analyze($state.snapshot(this.settings));
			if (!study) return;
			this.study = study;
			if (this.selected >= study.zones.length) this.selected = -1;
		} catch {
			this.message = 'Something went wrong reading this photo. Try choosing it again.';
		}
	}

	change(patch: Partial<StudySettings>) {
		Object.assign(this.settings, patch);
		return this.refresh();
	}

	choosePalette(palette: PaletteId) {
		this.selected = -1;
		this.savePrefsLater();
		return this.change({ palette });
	}

	choosePaint(id: string, brand: BrandId) {
		this.settings.pig = id;
		this.settings.brand = brand;
		this.savePrefsLater();
		return this.refresh();
	}

	savePrefsLater() {
		queueMicrotask(() => this.savePrefs());
	}

	/** Switching brand keeps the same tube when the other range has it. */
	setBrand(brand: BrandId) {
		const from = this.settings.brand;
		this.defaultBrand = brand;
		if (from !== brand) {
			const same = matchingPaint(this.settings.pig, from, brand);
			const fallback = this.settings.pig === 'lgreen' ? 'green' : 'blue';
			this.settings.pig = same ?? fallback;
			this.settings.brand = brand;
		}
		this.savePrefs();
		return this.refresh();
	}

	setMedium(med: Medium) {
		this.settings.med = med;
		this.savePrefs();
		return this.refresh();
	}

	setRemember(on: boolean) {
		this.remember = on;
		this.savePrefs();
	}

	/** Sends the brush strokes to the worker. */
	async commitMask() {
		// A new array tells the screens the mask has changed.
		this.mask = this.mask.slice();
		await this.#client?.setMask(this.mask);
		await this.refresh();
	}

	async clearMask() {
		this.mask.fill(0);
		await this.commitMask();
	}

	select(i: number) {
		this.selected = this.selected === i ? -1 : i;
	}
}

function thumbnailOf(image: CanvasImageSource, width: number, height: number) {
	const scale = Math.min(1, 240 / Math.max(width, height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(width * scale));
	canvas.height = Math.max(1, Math.round(height * scale));
	(canvas.getContext('2d') as CanvasRenderingContext2D).drawImage(
		image,
		0,
		0,
		canvas.width,
		canvas.height
	);
	return canvas.toDataURL('image/jpeg', 0.8);
}

export const studio = new Studio();
