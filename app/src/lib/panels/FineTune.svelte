<script lang="ts">
	import { studio } from '#lib/studio.svelte.ts';
	import Overlay from '#lib/components/Overlay.svelte';
	import Picture from '#lib/components/Picture.svelte';
	import Choice from '#lib/components/Choice.svelte';

	const settings = $derived(studio.settings);

	$effect(() => () => {
		studio.brushing = false;
	});
</script>

<Overlay title="Fine-tune your values" close="Done">
	<Picture height="30dvh" toggle={false} enlarge={false} brush />
	{#if studio.mono}
		<Choice
			label="How tones are chosen"
			options={[
				{ id: 'fit', label: 'Fit the photo' },
				{ id: 'even', label: 'Even steps' }
			]}
			value={settings.mode}
			onchange={(mode) => studio.change({ mode })}
		/>
	{/if}
	<Choice
		label="Contrast"
		options={[
			{ id: 'soft', label: 'Soft' },
			{ id: 'natural', label: 'Natural' },
			{ id: 'punchy', label: 'Punchy' },
			{ id: 'bold', label: 'Bold' }
		]}
		value={settings.contrast}
		onchange={(contrast) => studio.change({ contrast })}
	/>
	<Choice
		label="Overall brightness"
		options={[
			{ id: 'darker', label: 'Darker' },
			{ id: 'natural', label: 'Natural' },
			{ id: 'brighter', label: 'Brighter' }
		]}
		value={settings.key}
		onchange={(key) => studio.change({ key })}
	/>
	<div class="card brighten">
		<div class="heading">
			<span class="label">Brighten one area</span>
			<button
				type="button"
				class="button small"
				class:soft={!studio.brushing}
				aria-pressed={studio.brushing}
				onclick={() => (studio.brushing = !studio.brushing)}
			>
				{studio.brushing ? 'Painting…' : 'Paint on picture'}
			</button>
		</div>
		{#if studio.brushing}
			<p class="muted">Rub over the area you want brighter.</p>
		{/if}
		<label class="slider">
			How much
			<input
				type="range"
				min="0"
				max="20"
				value={settings.lift}
				oninput={(event) => (settings.lift = +event.currentTarget.value)}
				onchange={() => studio.refresh()}
			/>
			<output>{settings.lift}</output>
		</label>
		<label class="slider">
			Brush size
			<input type="range" min="8" max="80" bind:value={studio.brushSize} />
			<output>{studio.brushSize}</output>
		</label>
		{#if studio.painted}
			<button type="button" class="button soft small" onclick={() => studio.clearMask()}>
				Clear brightened area
			</button>
		{/if}
	</div>
</Overlay>

<style>
	.brighten {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 12px 14px;
		border-radius: 20px;
	}

	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.slider {
		display: grid;
		grid-template-columns: 88px minmax(0, 1fr) 28px;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		font-size: 15px;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--pine);
	}

	output {
		text-align: right;
		font-weight: 700;
	}
</style>
