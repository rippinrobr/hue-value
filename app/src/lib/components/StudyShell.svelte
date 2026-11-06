<script lang="ts">
	import type { Snippet } from 'svelte';
	import { studio } from '#lib/studio.svelte.ts';
	import { goToStep, openPanel, startOver, type Step } from '#lib/nav.ts';
	import { makeSheet } from '#lib/sheet-view.svelte.ts';
	import Picture from '#lib/components/Picture.svelte';
	import { resolve } from '$app/paths';

	let { step, children }: { step: Step; children: Snippet } = $props();

	const tabs: { id: Step; label: string }[] = [
		{ id: 'palette', label: 'Palette' },
		{ id: 'values', label: 'Values' },
		{ id: 'mix', label: 'Mix' }
	];
	// On phones the picture takes as much height as each step can spare.
	const stage: Record<Step, string> = {
		palette: 'min(36dvh, 300px)',
		values: 'min(50dvh, 420px)',
		mix: 'min(42dvh, 360px)'
	};
	const ratio = $derived(studio.size.width ? studio.size.height / studio.size.width : 0.75);

	let making = $state(false);
	let failed = $state(false);

	function go(next: Step) {
		if (step === 'palette') studio.savePrefs();
		goToStep(next);
	}

	async function save() {
		making = true;
		failed = false;
		try {
			await makeSheet();
			openPanel('lightbox');
		} catch {
			failed = true;
		}
		making = false;
	}
</script>

<div class="study" style:--stage={stage[step]} style:--ratio={ratio}>
	<div class="stage">
		<Picture fill brush={step === 'values'} />
		<button type="button" class="on-picture new" aria-label="New photo" onclick={startOver}>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><path d="M12 10.5v5M9.5 13h5"></path></svg
			>
		</button>
		<a class="on-picture settings" aria-label="Settings" href={resolve('/settings')}>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				aria-hidden="true"
				><path d="M4 7h10M18 7h2M4 17h2M10 17h10"></path><circle cx="16" cy="7" r="2"
				></circle><circle cx="8" cy="17" r="2"></circle></svg
			>
		</a>
		<button type="button" class="on-picture save" disabled={making} onclick={save}>
			{making ? 'Making…' : 'Save sheet'}
		</button>
	</div>

	<div class="panel">
		<nav class="tabs" aria-label="Study steps">
			{#each tabs as tab, i (tab.id)}
				<button
					type="button"
					aria-current={step === tab.id ? 'step' : undefined}
					onclick={() => step !== tab.id && go(tab.id)}
				>
					<span class="number" aria-hidden="true">{i + 1}</span>
					{tab.label}
				</button>
			{/each}
		</nav>
		<main class="content">
			{#if failed}<p class="message" role="alert">Could not make the sheet. Try again.</p>{/if}
			{#if studio.message}<p class="message" role="alert">{studio.message}</p>{/if}
			{@render children()}
		</main>
	</div>
</div>

<style>
	/* Phones: the picture on top, the step below it, the tabs along the bottom. */
	.study {
		--panel: var(--bg);
		display: flex;
		flex-direction: column;
		height: 100dvh;
		overflow: hidden;
	}

	.stage {
		position: relative;
		flex: none;
		height: min(var(--stage), calc(100vw * var(--ratio)));
		min-height: 180px;
		padding-top: env(safe-area-inset-top);
		background: #0f0e13;
	}

	.on-picture {
		position: absolute;
		top: calc(12px + env(safe-area-inset-top));
		display: grid;
		place-items: center;
		height: 44px;
		border: 0;
		border-radius: 14px;
		background: var(--bg);
		box-shadow: 0 2px 12px rgb(0 0 0 / 0.35);
		font-size: 15px;
		font-weight: 800;
	}

	.new {
		left: 12px;
		width: 44px;
	}

	.settings {
		left: 64px;
		width: 44px;
		color: var(--text);
	}

	.save {
		right: 12px;
		padding: 0 16px;
		color: var(--accent);
	}

	.save:not(:disabled):hover {
		color: var(--accent-hover);
	}

	.panel {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 16px;
		flex: 1;
		width: 100%;
		max-width: 640px;
		margin: 0 auto;
		overflow-y: auto;
		padding: 16px max(20px, env(safe-area-inset-right)) 0 max(20px, env(safe-area-inset-left));
	}

	/* The step scrolls as a whole; nothing inside it gets squeezed. */
	.content > :global(*) {
		flex-shrink: 0;
	}

	.tabs {
		order: 2;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		padding: 6px 12px max(14px, env(safe-area-inset-bottom));
		background: var(--bar);
		border-top: 1px solid #2d2a36;
	}

	.tabs button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 52px;
		border: 0;
		border-radius: 14px;
		background: none;
		color: var(--text-secondary);
		font-size: 16px;
		font-weight: 600;
	}

	.tabs button:hover {
		color: var(--text);
	}

	.tabs button[aria-current] {
		color: var(--accent);
		font-weight: 800;
	}

	.number {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 11px;
		border: 1.5px solid currentColor;
		font-size: 12px;
		font-weight: 800;
	}

	.tabs button[aria-current] .number {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}

	/* Tall tablets keep the phone layout, with a bigger picture. */
	@media (min-width: 600px) and (min-height: 900px) {
		.stage {
			height: min(calc(var(--stage) * 1.6), calc(100vw * var(--ratio)));
		}
	}

	/* Wide windows: the picture fills the window, the step sits in a side panel. */
	@media (min-width: 900px), (min-width: 640px) and (orientation: landscape) {
		.study {
			--panel: var(--bar);
			flex-direction: row;
		}

		.stage {
			flex: 1;
			height: 100dvh;
			min-width: 0;
			padding: 72px 24px 76px max(24px, env(safe-area-inset-left));
		}

		.on-picture {
			top: 16px;
		}

		.new {
			left: max(16px, env(safe-area-inset-left));
		}

		.settings {
			left: calc(max(16px, env(safe-area-inset-left)) + 52px);
		}

		.save {
			right: 16px;
		}

		.stage :global(.views) {
			left: max(16px, env(safe-area-inset-left));
			bottom: 16px;
		}

		.stage :global(.enlarge) {
			right: 16px;
			bottom: 16px;
		}

		.panel {
			flex: none;
			width: clamp(340px, 32vw, 480px);
			background: var(--panel);
			border-left: 1px solid #2d2a36;
		}

		.tabs {
			order: 0;
			padding: max(12px, env(safe-area-inset-top)) 12px 12px;
			border-top: 0;
			border-bottom: 1px solid #2d2a36;
		}

		.content {
			max-width: none;
			padding: 20px max(24px, env(safe-area-inset-right)) 0 24px;
		}
	}

	/* A short landscape phone: tighter, so more of the step fits. */
	@media (orientation: landscape) and (max-height: 500px) {
		.stage {
			padding: 64px 12px 68px max(12px, env(safe-area-inset-left));
		}

		.tabs button {
			min-height: 44px;
		}
	}
</style>
