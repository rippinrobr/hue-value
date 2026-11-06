<script lang="ts">
	import type { Snippet } from 'svelte';
	import { closePanel } from '#lib/nav.ts';

	let {
		title,
		close = 'Close',
		wide = false,
		onclose = closePanel,
		children
	}: {
		title: string;
		close?: string;
		wide?: boolean;
		onclose?: () => void;
		children: Snippet;
	} = $props();

	let closeButton = $state<HTMLButtonElement>();

	$effect(() => {
		closeButton?.focus();
	});
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={title}>
	<div class="body" class:wide>
		<header>
			<h1>{title}</h1>
			<button bind:this={closeButton} type="button" class="button soft small" onclick={onclose}>
				{close}
			</button>
		</header>
		{@render children()}
	</div>
</div>

<style>
	/* Phones: a full screen. Wide windows: a dialog over the dimmed study. */
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 10;
		overflow-y: auto;
		background: var(--bg);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 14px;
		width: 100%;
		max-width: 560px;
		min-height: 100%;
		margin: 0 auto;
		padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right))
			max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	header :global(.button) {
		flex: none;
		white-space: nowrap;
	}

	header h1 {
		font-size: 24px;
	}

	@media (min-width: 900px), (min-width: 640px) and (orientation: landscape) {
		.overlay {
			display: grid;
			place-items: center;
			padding: 32px;
			background: rgb(8 7 11 / 0.72);
		}

		.body {
			max-width: 600px;
			min-height: 0;
			max-height: calc(100dvh - 64px);
			overflow-y: auto;
			padding: 24px 28px 28px;
			border: 1px solid var(--line);
			border-radius: 20px;
			background: var(--bar);
			box-shadow: 0 24px 64px rgb(0 0 0 / 0.5);
		}

		.body.wide {
			max-width: min(1200px, 100%);
		}
	}

	@media (orientation: landscape) and (max-height: 500px) {
		.overlay {
			padding: 12px;
		}

		.body {
			max-height: calc(100dvh - 24px);
			padding: 16px 20px;
		}
	}
</style>
