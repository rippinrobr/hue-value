export const now = () => new Date();

// Saves an image, offering the share sheet on phones so it can go to Photos.
export async function saveCanvas(canvas: HTMLCanvasElement, name: string) {
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	if (!blob) return 'Could not create the image. Try again.';
	const file = new File([blob], name, { type: 'image/png' });
	const phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
	if (phone && navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file], title: name });
			return 'Shared. Choose "Save Image" to keep it in Photos.';
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') return 'Cancelled.';
		}
	}
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 4000);
	return `Saved ${name}.`;
}

/** The fonts the painting sheet draws with, fetched only when a sheet is made. */
export async function loadSheetFonts() {
	await Promise.all([
		import('@fontsource/bricolage-grotesque/700.css'),
		import('@fontsource/ibm-plex-sans/400.css'),
		import('@fontsource/ibm-plex-sans/500.css'),
		import('@fontsource/ibm-plex-sans/600.css'),
		import('@fontsource/ibm-plex-mono/400.css'),
		import('@fontsource/ibm-plex-mono/500.css')
	]);
	await Promise.all(
		[
			'700 56px "Bricolage Grotesque"',
			'400 20px "IBM Plex Sans"',
			'500 23px "IBM Plex Sans"',
			'600 28px "IBM Plex Sans"',
			'400 21px "IBM Plex Mono"',
			'500 19px "IBM Plex Mono"'
		].map((font) => document.fonts.load(font))
	);
}
