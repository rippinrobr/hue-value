// What the enlarged view is showing: the picture, or a finished painting sheet.
import {
	drawSheet,
	renderFullMap,
	requirePaint,
	limitedDef,
	sheetText,
	saveName
} from '#lib/engine/index.ts';
import { loadSheetFonts, now } from '#lib/save.ts';
import { studio } from '#lib/studio.svelte.ts';

export type ViewKind = 'photo' | 'values' | 'map' | 'sheet';

class SheetView {
	sheet = $state.raw<HTMLCanvasElement | null>(null);
	/** True while the view holds a sheet, not the picture on screen. */
	active = $state(false);
}

export const sheetView = new SheetView();

function input() {
	const { photo, study, settings } = studio;
	if (!photo || !study) throw new Error('No study');
	return {
		source: photo.image,
		sourceWidth: photo.width,
		sourceHeight: photo.height,
		channels: studio.maskInfo,
		study,
		settings: $state.snapshot(settings)
	};
}

export async function makeSheet() {
	await loadSheetFonts();
	sheetView.sheet = await drawSheet({ ...input(), date: now() });
	sheetView.active = true;
}

const subject = () => {
	const { settings } = studio;
	return studio.mono
		? requirePaint(settings.brand, settings.pig).name
		: limitedDef(settings.palette).title;
};

/** The canvas, title, and file name for whatever the enlarged view should show. */
export function currentView() {
	const { photo, study, settings } = studio;
	if (!photo || !study) return null;
	if (sheetView.active && sheetView.sheet) {
		return {
			kind: 'sheet' as ViewKind,
			canvas: sheetView.sheet,
			title: `Painting sheet · ${subject()}`,
			fileName: saveName('sheet', study.zones, settings, now())
		};
	}
	if (settings.show === 'photo') {
		const canvas = document.createElement('canvas');
		canvas.width = photo.width;
		canvas.height = photo.height;
		(canvas.getContext('2d') as CanvasRenderingContext2D).drawImage(photo.image, 0, 0);
		return { kind: 'photo' as ViewKind, canvas, title: 'Reference photo', fileName: '' };
	}
	const count = `${study.zones.length} ${studio.mono ? 'tones' : 'colors'}`;
	const values = settings.show === 'values';
	const kind: ViewKind = values ? 'values' : 'map';
	return {
		kind,
		canvas: renderFullMap(input()),
		title: `${subject()} · ${count}${values ? ' · values' : ''}`,
		fileName: saveName(values ? 'values' : 'map', study.zones, settings, now())
	};
}

export const currentSheetText = () => {
	const { study, settings } = studio;
	return study ? sheetText(study, studio.maskInfo, settings) : '';
};
