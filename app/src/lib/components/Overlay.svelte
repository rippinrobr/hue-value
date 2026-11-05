<script lang="ts">
	import type { Snippet } from 'svelte';
	import { closePanel } from '#lib/nav.ts';

	let {
		title,
		close = 'Close',
		wide = false,
		children
	}: { title: string; close?: string; wide?: boolean; children: Snippet } = $props();

	let closeButton = $state<HTMLButtonElement>();

	$effect(() => {
		closeButton?.focus();
	});
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={title}>
	<div class="body" class:wide>
		<header>
			<h1>{title}</h1>
			<button bind:this={closeButton} type="button" class="button soft small" onclick={closePanel}>
				{close}
			</button>
		</header>
		{@render children()}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 10;
		overflow-y: auto;
		background: var(--ground);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		max-width: 480px;
		min-height: 100%;
		margin: 0 auto;
		padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right))
			max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
	}

	.body.wide {
		max-width: 900px;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
</style>
