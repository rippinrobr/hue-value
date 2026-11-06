<script lang="ts">
	import { hex } from '#lib/engine/index.ts';
	import { studio } from '#lib/studio.svelte.ts';

	const zones = $derived(studio.study?.zones ?? []);
	const unit = $derived(studio.studiedMono ? 'Tone' : 'Color');
</script>

<div class="strip" role="group" aria-label="{unit} scale, darkest to lightest">
	{#each zones as zone, i (i)}
		<button
			type="button"
			aria-label="{unit} {i + 1}"
			aria-pressed={studio.selected === i}
			style:background={hex(zone.mix)}
			style:color={zone.L > 55 ? '#111' : '#f2f2f2'}
			onclick={() => studio.select(i)}
		>
			{i + 1}
		</button>
	{/each}
</div>

<style>
	.strip {
		display: flex;
		min-height: 48px;
		overflow: hidden;
		border-radius: 14px;
	}

	button {
		flex: 1;
		min-width: 0;
		padding: 0;
		border: 0;
		font-size: 13px;
		font-weight: 700;
	}

	button[aria-pressed='true'] {
		box-shadow: inset 0 -5px 0 #ff3d7f;
	}
</style>
