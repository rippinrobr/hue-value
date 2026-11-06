<script lang="ts">
	import { studio } from '#lib/studio.svelte.ts';
	import { goToStep, openPanel } from '#lib/nav.ts';
	import ToneStrip from '#lib/components/ToneStrip.svelte';
	import Counter from '#lib/components/Counter.svelte';
	import Choice from '#lib/components/Choice.svelte';
	import TuneControls from '#lib/components/TuneControls.svelte';
	import { wide } from '#lib/layout.svelte.ts';

	const tones = $derived(studio.mono ? studio.settings.n : studio.settings.nColors);
	const max = $derived(studio.mono ? 9 : 12);

	function setTones(value: number) {
		studio.change(studio.mono ? { n: value } : { nColors: value });
	}
</script>

<div class="step-head">
	<h1>Does this look right?</h1>
	<p class="muted">Squint at the value map. Add tones or contrast until it reads like the photo.</p>
</div>

<ToneStrip />
<Counter label={studio.mono ? 'Tones' : 'Colors'} value={tones} min={3} {max} onchange={setTones} />
<Choice
	label="Contrast"
	options={[
		{ id: 'soft', label: 'Soft' },
		{ id: 'natural', label: 'Natural' },
		{ id: 'punchy', label: 'Punchy' },
		{ id: 'bold', label: 'Bold' }
	]}
	value={studio.settings.contrast}
	onchange={(contrast) => studio.change({ contrast })}
/>
<!-- With room to spare the rest of the controls sit here, and brushing happens on the big picture. -->
{#if wide.current}
	<TuneControls contrast={false} />
{:else}
	<button type="button" class="row-button" onclick={() => openPanel('tune')}>
		Brightness, brushing and more
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg
		>
	</button>
{/if}

<div class="step-actions">
	<button type="button" class="button" onclick={() => goToStep('mix')}>Show me the mixes</button>
</div>
