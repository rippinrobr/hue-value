<script lang="ts">
	import { saveCanvas } from '#lib/save.ts';
	import { currentSheetText, currentView, sheetView } from '#lib/sheet-view.svelte.ts';
	import Overlay from '#lib/components/Overlay.svelte';

	const view = currentView();
	let shown = $state<HTMLCanvasElement>();
	let message = $state('');
	let fallback = $state('');

	$effect(() => {
		if (!shown || !view) return;
		shown.width = view.canvas.width;
		shown.height = view.canvas.height;
		(shown.getContext('2d') as CanvasRenderingContext2D).drawImage(view.canvas, 0, 0);
		return () => {
			sheetView.active = false;
		};
	});

	async function save() {
		if (view) message = await saveCanvas(view.canvas, view.fileName);
	}

	async function copy() {
		const text = currentSheetText();
		try {
			await navigator.clipboard.writeText(text);
			message = 'Copied. Paste it into Notes or a doc.';
		} catch {
			fallback = text;
			message = 'Select all and copy the text below.';
		}
	}
</script>

<Overlay title={view?.title ?? 'Picture'} wide>
	<div class="tools">
		{#if view && view.kind !== 'photo'}
			<button type="button" class="button small" onclick={save}>Save image</button>
		{/if}
		{#if view?.kind === 'sheet'}
			<button type="button" class="button soft small" onclick={copy}>Copy as text</button>
		{/if}
	</div>
	{#if message}<p class="muted" role="status">{message}</p>{/if}
	{#if fallback}<textarea readonly aria-label="Painting sheet text" value={fallback}
		></textarea>{/if}
	<canvas bind:this={shown} class:fit={view?.kind !== 'sheet'} aria-label={view?.title}></canvas>
</Overlay>

<style>
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	canvas {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 14px;
	}

	/* A picture shows whole; a painting sheet scrolls. */
	canvas.fit {
		max-height: calc(100dvh - 140px);
		object-fit: contain;
	}

	textarea {
		width: 100%;
		min-height: 180px;
		padding: 10px;
		border: 2px solid var(--border);
		border-radius: 14px;
		background: var(--surface);
		color: var(--text);
	}
</style>
