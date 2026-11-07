// The painting sheet: one tall image with the photo, map, tones, mixes, settings and tips.
// This module draws on a canvas, so it only runs in the browser.
import { adjustedLightness, hasBrightenedArea } from './analysis';
import { BRANDS, limitedDef, paintById, paletteTubes, requirePaint } from './catalog';
import { LIN, LfromY, YfromL, grayHex, hex, labOf, toSRGB } from './color';
import { gamutNote, paintList, studyTitle, workingTips, zoneRecipe } from './text';
import type { PhotoMask, Study, StudySettings } from './types';

export interface SheetInput {
	source: CanvasImageSource;
	sourceWidth: number;
	sourceHeight: number;
	channels: PhotoMask;
	study: Study;
	settings: StudySettings;
	date: Date;
}

/** Full-size value or color map, up to 2400px on the long side. */
export function renderFullMap(input: Omit<SheetInput, 'date'>) {
	const { source, sourceWidth, sourceHeight, channels, study, settings } = input;
	const { width: W, height: H, mask } = channels;
	const { zones } = study;
	const scale = Math.min(1, 2400 / Math.max(sourceWidth, sourceHeight));
	const w = Math.max(1, Math.round(sourceWidth * scale));
	const h = Math.max(1, Math.round(sourceHeight * scale));
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const g = canvas.getContext('2d') as CanvasRenderingContext2D;
	g.drawImage(source, 0, 0, w, h);
	const image = g.getImageData(0, 0, w, h);
	const d = image.data;
	const colors = zones.map((z) => {
		if (settings.show === 'values') {
			const v = toSRGB(YfromL(z.L));
			return [v, v, v];
		}
		return z.mix.map(toSRGB);
	});
	const kx = W / w;
	const ky = H / h;
	const mono = settings.palette === 'mono';
	for (let y = 0, i = 0; y < h; y++) {
		const row = Math.min(H - 1, Math.floor(y * ky)) * W;
		for (let x = 0; x < w; x++, i += 4) {
			const m = mask[row + Math.min(W - 1, Math.floor(x * kx))];
			const lin = [LIN[d[i]], LIN[d[i + 1]], LIN[d[i + 2]]];
			let best = 0;
			let bd = 1e18;
			if (mono) {
				const a = adjustedLightness(
					LfromY(0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]),
					m,
					settings
				);
				for (let j = 0; j < zones.length; j++) {
					const e = Math.abs(a - zones[j].L);
					if (e < bd) {
						bd = e;
						best = j;
					}
				}
			} else {
				const lab = labOf(lin);
				const Lp = adjustedLightness(lab[0], m, settings);
				for (let j = 0; j < zones.length; j++) {
					const z = zones[j];
					const e =
						(Lp - z.L) ** 2 + (lab[1] - (z.a as number)) ** 2 + (lab[2] - (z.b as number)) ** 2;
					if (e < bd) {
						bd = e;
						best = j;
					}
				}
			}
			const c = colors[best];
			d[i] = c[0];
			d[i + 1] = c[1];
			d[i + 2] = c[2];
			d[i + 3] = 255;
		}
	}
	g.putImageData(image, 0, 0);
	return canvas;
}

const COLORS = {
	bg: '#f7f8f6',
	fg: '#1b1d20',
	muted: '#596067',
	line: '#c9cecb',
	accent: '#2c3c96',
	warn: '#9a4a12'
};
const FONTS = {
	d: "'Bricolage Grotesque','Avenir Next',system-ui,sans-serif",
	b: "'IBM Plex Sans',system-ui,-apple-system,sans-serif",
	m: "'IBM Plex Mono',ui-monospace,Menlo,monospace"
};

export async function drawSheet(input: SheetInput) {
	const { source, sourceWidth, sourceHeight, channels, study, settings, date } = input;
	try {
		if (document.fonts?.ready) await document.fonts.ready;
	} catch {
		// Falls back to system fonts.
	}
	const { zones } = study;
	const mono = settings.palette === 'mono';
	const pal = BRANDS[settings.brand];
	const p = requirePaint(settings.brand, settings.pig);
	const partner = mono ? paintById(settings.brand, p[settings.darks]) : null;
	const tubes = mono ? [] : paletteTubes(settings.palette, settings.brand);
	const unit = mono ? 'Tone' : 'Color';
	const C = COLORS;
	const F = FONTS;
	const SW = 1240;
	const PAD = 60;
	const CW = SW - 2 * PAD;
	const canvas = document.createElement('canvas');
	canvas.width = SW;
	canvas.height = 9000;
	const g = canvas.getContext('2d') as CanvasRenderingContext2D;
	g.fillStyle = C.bg;
	g.fillRect(0, 0, SW, canvas.height);
	g.textBaseline = 'top';
	const font = (weight: number, size: number, family: string) => {
		g.font = `${weight} ${size}px ${family}`;
	};
	const wrap = (text: string, x: number, top: number, maxW: number, lh: number, color?: string) => {
		let y = top;
		g.fillStyle = color || C.fg;
		let line = '';
		for (const w of String(text).split(/\s+/)) {
			const t = line ? `${line} ${w}` : w;
			if (g.measureText(t).width > maxW && line) {
				g.fillText(line, x, y);
				y += lh;
				line = w;
			} else line = t;
		}
		if (line) {
			g.fillText(line, x, y);
			y += lh;
		}
		return y;
	};
	const section = (title: string, top: number) => {
		let y = top;
		g.fillStyle = C.line;
		g.fillRect(PAD, y, CW, 2);
		y += 26;
		font(600, 19, F.b);
		g.fillStyle = C.muted;
		let x = PAD;
		for (const ch of title.toUpperCase()) {
			g.fillText(ch, x, y);
			x += g.measureText(ch).width + 2;
		}
		return y + 36;
	};

	let y = PAD;
	// header
	font(700, 56, F.d);
	y = wrap(studyTitle(settings), PAD, y, CW, 64);
	const when = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	font(400, 21, F.m);
	y = wrap(
		`${when} · ${settings.label} · ${pal.brand} ${settings.med === 'oil' ? 'water-mixable oil' : 'acrylic'}`,
		PAD,
		y + 8,
		CW,
		30,
		C.muted
	);
	y += 28;

	// photo and value map
	const gap = 28;
	const bw = (CW - gap) / 2;
	const map = renderFullMap(input);
	const s = Math.min(bw / sourceWidth, 640 / sourceHeight);
	const dw = sourceWidth * s;
	const dh = sourceHeight * s;
	const ox = (bw - dw) / 2;
	g.drawImage(source, PAD + ox, y, dw, dh);
	g.drawImage(map, PAD + bw + gap + ox, y, dw, dh);
	g.strokeStyle = C.line;
	g.lineWidth = 2;
	g.strokeRect(PAD + ox, y, dw, dh);
	g.strokeRect(PAD + bw + gap + ox, y, dw, dh);
	y += dh + 12;
	font(500, 19, F.m);
	g.fillStyle = C.muted;
	g.fillText('Reference photo', PAD + ox, y);
	g.fillText(
		mono ? `Value map · ${zones.length} tones` : `Color map · ${zones.length} colors`,
		PAD + bw + gap + ox,
		y
	);
	y += 48;

	// tone scale
	y = section(`${unit} scale · darkest to lightest`, y);
	const n = zones.length;
	const tg = 8;
	const tw = (CW - tg * (n - 1)) / n;
	const th = 130;
	zones.forEach((z, i) => {
		const x = PAD + i * (tw + tg);
		g.fillStyle = hex(z.mix);
		g.fillRect(x, y, tw, th);
		g.strokeStyle = C.line;
		g.lineWidth = 1.5;
		g.strokeRect(x, y, tw, th);
		g.fillStyle = z.L > 55 ? '#111111' : '#f2f2f2';
		font(700, 34, F.d);
		g.fillText(String(i + 1), x + 12, y + 10);
		font(500, 17, F.m);
		g.fillText(
			`${n > 7 ? '' : 'value '}${(z.L / 10).toFixed(1)}`,
			x + (n > 7 ? 8 : 12),
			y + th - 28
		);
	});
	y += th + 18;
	font(400, 20, F.b);
	const caption = !mono
		? `Mixed from ${tubes.map((t) => t.name).join(', ')} and ${pal.white}.`
		: settings.darks === 'comp'
			? `Darks deepened with the complement${partner ? `, ${partner.name}` : ''}.`
			: `Darks kept in the same color family${partner ? `, deepened with ${partner.name}` : ''}.`;
	y = wrap(caption, PAD, y, CW, 28, C.muted);
	y += 30;

	// paints
	y = section('Paints', y);
	for (const item of paintList(zones, settings)) {
		g.beginPath();
		g.arc(PAD + 20, y + 18, 18, 0, Math.PI * 2);
		if (item.chip !== 'transparent') {
			g.fillStyle = item.chip;
			g.fill();
		}
		g.strokeStyle = C.line;
		g.lineWidth = 2;
		g.stroke();
		font(600, 24, F.b);
		let yy = wrap(item.name, PAD + 56, y, CW - 56, 32);
		font(400, 20, F.b);
		yy = wrap(item.desc, PAD + 56, yy + 2, CW - 56, 28, C.muted);
		y = Math.max(yy, y + 40) + 16;
	}
	y += 14;

	// mixes
	y = section('Mixing recipes · parts by volume', y);
	zones.forEach((z, i) => {
		const r = zoneRecipe(z, settings);
		const sw = 104;
		const x = PAD + sw + 24;
		const w = CW - sw - 24;
		const top = y;
		const label = i === 0 ? ' · darkest' : i === n - 1 ? ' · lightest' : '';
		font(500, 19, F.m);
		let yy = wrap(
			`${unit} ${i + 1} · value ${(z.L / 10).toFixed(1)}${label} · ${Math.round(z.area * 100)}% of picture`,
			x,
			y,
			w,
			26,
			C.muted
		);
		font(600, 28, F.b);
		yy = wrap(r.main, x, yy + 4, w, 36);
		font(400, 20, F.b);
		yy = wrap(r.sub, x, yy + 2, w, 28, C.muted);
		const warn = mono
			? z.short
				? 'As dark as these paints go. The real tone is a little darker.'
				: ''
			: gamutNote(z);
		if (warn) {
			font(500, 19, F.b);
			yy = wrap(warn, x, yy + 2, w, 26, C.warn);
		}
		const h = Math.max(sw, yy - top);
		g.fillStyle = mono ? grayHex(z.L) : hex(z.target as number[]);
		g.fillRect(PAD, top, sw, sw / 2);
		g.fillStyle = hex(z.mix);
		g.fillRect(PAD, top + sw / 2, sw, sw / 2);
		g.strokeStyle = C.line;
		g.lineWidth = 1.5;
		g.strokeRect(PAD, top, sw, sw);
		y = top + h + 18;
		g.fillStyle = C.line;
		g.fillRect(PAD, y, CW, 1);
		y += 18;
	});
	font(400, 18, F.m);
	g.fillStyle = C.muted;
	g.fillText(
		mono
			? 'Swatch top: target value in gray · bottom: predicted mix'
			: 'Swatch top: photo color · bottom: predicted mix',
		PAD,
		y
	);
	y += 50;

	// settings
	y = section('Settings', y);
	const brightened = hasBrightenedArea(channels, settings);
	const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
	const paintType = settings.med === 'oil' ? 'Water-mixable oil' : 'Acrylic';
	const lifted = brightened ? `Yes, lifted ${settings.lift}` : 'None';
	const mapShows = settings.show === 'values' ? 'Values in gray' : 'Paint colors';
	const rows = !mono
		? [
				['Brand', pal.brand],
				['Paint', paintType],
				['Palette', limitedDef(settings.palette).name],
				['Paints', `${tubes.map((t) => t.name).join(', ')}, ${pal.white}`],
				['Number of colors', String(n)],
				['Contrast', cap(settings.contrast)],
				['Key', cap(settings.key)],
				['Brightened area', lifted],
				['Map shows', mapShows]
			]
		: [
				['Brand', pal.brand],
				['Paint', paintType],
				['Palette', 'Monochromatic'],
				['Color', `${p.name} (${p.code})`],
				[
					'Dark tones',
					`${settings.darks === 'comp' ? 'Complement' : 'Same family'}${partner ? ` · ${partner.name}` : ''}`
				],
				['Number of tones', String(n)],
				['Tones chosen', settings.mode === 'even' ? 'Even steps' : 'Fit the photo'],
				['Contrast', cap(settings.contrast)],
				['Key', cap(settings.key)],
				['Brightened area', lifted],
				['Map shows', mapShows]
			];
	const colW = (CW - 40) / 2;
	for (let i = 0; i < rows.length; i += 2) {
		let h = 0;
		for (let k = 0; k < 2 && i + k < rows.length; k++) {
			const [key, val] = rows[i + k];
			const x = PAD + k * (colW + 40);
			font(500, 18, F.m);
			g.fillStyle = C.muted;
			g.fillText(key.toUpperCase(), x, y);
			font(500, 23, F.b);
			const yy = wrap(val, x, y + 26, colW, 30);
			h = Math.max(h, yy - y);
		}
		y += h + 18;
	}
	y += 24;

	// tips
	y = section('Working tips', y);
	workingTips(
		settings,
		channels.mask.some((v) => v > 0)
	).forEach((tip, i) => {
		font(700, 22, F.d);
		g.fillStyle = C.accent;
		g.fillText(`${i + 1}.`, PAD, y);
		font(400, 21, F.b);
		y = wrap(tip, PAD + 40, y, CW - 40, 30) + 12;
	});
	y += 24;
	g.fillStyle = C.line;
	g.fillRect(PAD, y, CW, 2);
	y += 22;
	font(400, 18, F.b);
	y = wrap(
		'Ratios are estimates from a paint-mixing model. Brands vary, so mix the first tone, test it on a card next to your reference, and adjust. Made with Hue & Value.',
		PAD,
		y,
		CW,
		26,
		C.muted
	);

	const out = document.createElement('canvas');
	out.width = SW;
	out.height = Math.ceil(y + PAD);
	(out.getContext('2d') as CanvasRenderingContext2D).drawImage(canvas, 0, 0);
	return out;
}
