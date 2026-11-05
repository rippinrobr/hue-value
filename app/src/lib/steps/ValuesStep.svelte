<script lang="ts">
	import { studio } from '#lib/studio.svelte.ts';
	import { goToStep, openPanel } from '#lib/nav.ts';
	import Stepper from '#lib/components/Stepper.svelte';
	import Picture from '#lib/components/Picture.svelte';
	import ToneStrip from '#lib/components/ToneStrip.svelte';
	import Counter from '#lib/components/Counter.svelte';

	const tones = $derived(studio.mono ? studio.settings.n : studio.settings.nColors);
	const max = $derived(studio.mono ? 9 : 12);

	function setTones(value: number) {
		studio.change(studio.mono ? { n: value } : { nColors: value });
	}
</script>

<main class="screen wide">
	<Stepper current="values" />
	<h1>Does this look right?</h1>
	{#if studio.message}<p class="message" role="alert">{studio.message}</p>{/if}
	<div class="columns">
		<div class="sticky"><Picture /></div>
		<div class="stack">
			<ToneStrip />
			<Counter
				label={studio.mono ? 'Tones' : 'Colors'}
				value={tones}
				min={3}
				{max}
				onchange={setTones}
			/>
			<button type="button" class="row-button" onclick={() => openPanel('tune')}>
				Contrast, brightness and more
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
		</div>
	</div>
	<div class="actions">
		<button type="button" class="button soft" onclick={() => goToStep('palette')}>Back</button>
		<button type="button" class="button grow" onclick={() => goToStep('mix')}
			>Show me the mixes</button
		>
	</div>
</main>
