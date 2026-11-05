<script lang="ts">
	import { goToStep, type Step } from '#lib/nav.ts';
	import { startOver } from '#lib/nav.ts';

	let { current }: { current: Step } = $props();

	const steps: { id: Step | 'photo'; label: string }[] = [
		{ id: 'photo', label: 'Photo' },
		{ id: 'palette', label: 'Palette' },
		{ id: 'values', label: 'Values' },
		{ id: 'mix', label: 'Mix' }
	];
	const at = $derived(steps.findIndex((s) => s.id === current));
</script>

<nav aria-label="Steps">
	<ol>
		{#each steps as step, i (step.id)}
			<li>
				<button
					type="button"
					class:done={i <= at}
					aria-current={i === at ? 'step' : undefined}
					onclick={() => (step.id === 'photo' ? startOver() : goToStep(step.id))}
				>
					<span class="bar"></span>
					{step.label}
				</button>
			</li>
		{/each}
	</ol>
</nav>

<style>
	ol {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	button {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		min-height: 44px;
		padding: 4px 0;
		border: 0;
		background: none;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
		text-align: left;
	}

	button.done {
		color: var(--text);
	}

	.bar {
		height: 6px;
		border-radius: 3px;
		background: var(--border);
	}

	.done .bar {
		background: var(--accent);
	}
</style>
