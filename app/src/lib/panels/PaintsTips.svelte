<script lang="ts">
	import { paintList, workingTips } from '#lib/engine/index.ts';
	import { studio } from '#lib/studio.svelte.ts';
	import Overlay from '#lib/components/Overlay.svelte';

	const paints = $derived(paintList(studio.study?.zones ?? [], studio.settings));
	const tips = $derived(workingTips(studio.settings, studio.painted));
</script>

<Overlay title="Before you paint" close="Back to my mixes">
	<h2>Paints to set out</h2>
	<ul class="card">
		{#each paints as paint (paint.name)}
			<li>
				<span class="chip" class:empty={paint.chip === 'transparent'} style:background={paint.chip}
				></span>
				<span class="words">
					<span class="name">{paint.name}</span>
					<span class="muted">{paint.desc}</span>
				</span>
			</li>
		{/each}
	</ul>
	<h2>Working tips</h2>
	<ol class="card">
		{#each tips as tip (tip)}
			<li>{tip}</li>
		{/each}
	</ol>
</Overlay>

<style>
	ul,
	ol {
		display: flex;
		flex-direction: column;
		margin: 0;
	}

	ul {
		padding: 0;
		list-style: none;
		overflow: hidden;
	}

	ul li {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 10px 14px;
		border-bottom: 1px solid var(--control);
	}

	ul li:last-child {
		border-bottom: 0;
	}

	.chip {
		flex: none;
		width: 36px;
		height: 36px;
		border: 1px solid var(--border);
		border-radius: 18px;
	}

	.chip.empty {
		border: 2px dashed var(--text-secondary);
	}

	.words {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.name {
		font-weight: 700;
	}

	ol {
		gap: 8px;
		padding: 14px 14px 14px 34px;
		font-size: 15px;
	}
</style>
