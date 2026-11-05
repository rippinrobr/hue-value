// Reads a photo's pixels at the reduced size used for analysis. Browser only.
import { analysisSize } from './analysis';

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
