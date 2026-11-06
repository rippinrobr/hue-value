// Reads a photo's pixels at the reduced size used for analysis. Browser only.
import { MAX_SHARP_SIZE, analysisSize } from './analysis';

export function photoPixels(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
	const { width, height } = analysisSize(sourceWidth, sourceHeight);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const g = canvas.getContext('2d') as CanvasRenderingContext2D;
	g.drawImage(source, 0, 0, width, height);
	const pixels = g.getImageData(0, 0, width, height).data as Uint8ClampedArray<ArrayBuffer>;
	return { pixels, width, height };
}

/** A sharper copy of the photo, for drawing the groups on screen. */
export function sharpSize(sourceWidth: number, sourceHeight: number) {
	const scale = Math.min(1, MAX_SHARP_SIZE / Math.max(sourceWidth, sourceHeight));
	return {
		width: Math.max(1, Math.round(sourceWidth * scale)),
		height: Math.max(1, Math.round(sourceHeight * scale))
	};
}

export function sharpPixels(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
	const { width, height } = sharpSize(sourceWidth, sourceHeight);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const g = canvas.getContext('2d') as CanvasRenderingContext2D;
	g.drawImage(source, 0, 0, width, height);
	const pixels = g.getImageData(0, 0, width, height).data as Uint8ClampedArray<ArrayBuffer>;
	return { pixels, width, height };
}

/** The built-in still life, for trying the app without a photo. */
export function exampleCanvas() {
	const c = document.createElement('canvas');
	c.width = 520;
	c.height = 390;
	const g = c.getContext('2d') as CanvasRenderingContext2D;
	let gr = g.createLinearGradient(0, 0, 520, 0);
	gr.addColorStop(0, '#d6d0c5');
	gr.addColorStop(1, '#4f4b45');
	g.fillStyle = gr;
	g.fillRect(0, 0, 520, 260);
	gr = g.createLinearGradient(0, 260, 0, 390);
	gr.addColorStop(0, '#94897a');
	gr.addColorStop(1, '#2e2a25');
	g.fillStyle = gr;
	g.fillRect(0, 260, 520, 130);
	g.save();
	g.filter = 'blur(10px)';
	g.fillStyle = 'rgba(18,16,13,.75)';
	g.beginPath();
	g.ellipse(300, 288, 140, 26, 0, 0, Math.PI * 2);
	g.fill();
	g.restore();
	gr = g.createLinearGradient(330, 0, 430, 0);
	gr.addColorStop(0, '#6d665c');
	gr.addColorStop(0.25, '#b9b1a4');
	gr.addColorStop(0.6, '#3f3a34');
	gr.addColorStop(1, '#1f1c19');
	g.fillStyle = gr;
	g.fillRect(330, 120, 100, 170);
	g.fillStyle = '#2a2622';
	g.fillRect(338, 104, 84, 18);
	gr = g.createRadialGradient(165, 160, 6, 205, 200, 105);
	gr.addColorStop(0, '#fbf8f2');
	gr.addColorStop(0.3, '#cfc7ba');
	gr.addColorStop(0.75, '#5a534a');
	gr.addColorStop(1, '#26221e');
	g.fillStyle = gr;
	g.beginPath();
	g.arc(210, 200, 92, 0, Math.PI * 2);
	g.fill();
	return c;
}

/** Fills an image with each pixel's group color, marking the selected group. */
export function fillMap(
	image: ImageData,
	assign: Uint8Array,
	colors: ArrayLike<number>[],
	selected: number
) {
	const highlight = [255, 61, 127];
	const d = image.data;
	for (let i = 0, j = 0; j < assign.length; i += 4, j++) {
		const c = selected === assign[j] ? highlight : colors[assign[j]];
		d[i] = c[0];
		d[i + 1] = c[1];
		d[i + 2] = c[2];
		d[i + 3] = 255;
	}
}
