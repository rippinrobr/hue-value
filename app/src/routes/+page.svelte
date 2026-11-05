<script lang="ts">
	import { page } from '$app/state';
	import { studio } from '#lib/studio.svelte.ts';
	import { closePanel, goToStep } from '#lib/nav.ts';
	import StartStep from '#lib/steps/StartStep.svelte';
	import PaletteStep from '#lib/steps/PaletteStep.svelte';
	import ValuesStep from '#lib/steps/ValuesStep.svelte';
	import MixStep from '#lib/steps/MixStep.svelte';
	import ColorPicker from '#lib/panels/ColorPicker.svelte';
	import FineTune from '#lib/panels/FineTune.svelte';
	import PaintsTips from '#lib/panels/PaintsTips.svelte';
	import Lightbox from '#lib/panels/Lightbox.svelte';

	// A reload loses the photo, so the study starts again from the first screen.
	const step = $derived(studio.photo ? page.state.step : undefined);
	const overlay = $derived(studio.photo ? page.state.overlay : undefined);

	async function drop(event: DragEvent) {
		event.preventDefault();
		if (await studio.openFile(event.dataTransfer?.files[0])) {
			goToStep(studio.remember ? 'values' : 'palette');
		}
	}

	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && overlay) closePanel();
	}
</script>

<svelte:head>
	<title>Hue &amp; Value</title>
	<meta
		name="description"
		content="Turn a reference photo into value maps and mixing recipes for monochrome studies and limited palettes."
	/>
</svelte:head>

<svelte:window ondragover={(event) => event.preventDefault()} ondrop={drop} onkeydown={keydown} />

<!-- The screen behind a panel can't be reached until the panel closes. -->
<div inert={!!overlay}>
	{#if step === 'palette'}
		<PaletteStep />
	{:else if step === 'values'}
		<ValuesStep />
	{:else if step === 'mix'}
		<MixStep />
	{:else}
		<StartStep />
	{/if}
</div>

{#if overlay === 'picker'}
	<ColorPicker />
{:else if overlay === 'tune'}
	<FineTune />
{:else if overlay === 'paints'}
	<PaintsTips />
{:else if overlay === 'lightbox'}
	<Lightbox />
{/if}
