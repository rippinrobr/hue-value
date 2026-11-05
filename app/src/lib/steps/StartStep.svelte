<script lang="ts">
	import { studio } from '#lib/studio.svelte.ts';
	import { goToStep, openPanel } from '#lib/nav.ts';
	import { exampleCanvas } from '#lib/engine/index.ts';

	let library = $state<HTMLInputElement>();
	let camera = $state<HTMLInputElement>();
	const preview = exampleCanvas().toDataURL('image/jpeg', 0.85);

	async function picked(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const opened = await studio.openFile(input.files?.[0]);
		input.value = '';
		if (opened) goToStep(studio.remember ? 'values' : 'palette');
	}

	async function example() {
		await studio.openExample();
		goToStep('values');
	}
</script>

<main class="screen start">
	<div class="top">
		<span class="brand">Hue &amp; Value</span>
		<button
			type="button"
			class="settings"
			aria-label="Settings"
			onclick={() => openPanel('settings')}
		>
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
		</button>
	</div>
	<div class="intro">
		<h1>What are you painting today?</h1>
		<p>Add a photo. We'll find the values and tell you how to mix them.</p>
	</div>
	<div class="card add">
		<img src={preview} alt="Example still life with a sphere and a dark box" />
		<button type="button" class="button" onclick={() => library?.click()}>Choose a photo</button>
		<button type="button" class="button soft" onclick={() => camera?.click()}>Take a photo</button>
	</div>
	<input bind:this={library} type="file" accept="image/*" hidden onchange={picked} />
	<input
		bind:this={camera}
		type="file"
		accept="image/*"
		capture="environment"
		hidden
		onchange={picked}
	/>
	{#if studio.message}
		<p class="message" role="alert">{studio.message}</p>
	{/if}
	<button type="button" class="link" onclick={example}>Try it with the example</button>
	<p class="muted privacy">Your photos stay on this device.</p>
</main>

<style>
	.start {
		gap: 18px;
		padding-bottom: 20px;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.brand {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.settings {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 22px;
		background: var(--surface);
	}

	.intro {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 8px;
	}

	.intro h1 {
		font-size: 38px;
		line-height: 1.08;
	}

	.intro p {
		font-size: 17px;
		color: var(--text-secondary);
	}

	.add {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		border-radius: 28px;
	}

	img {
		display: block;
		width: 100%;
		height: 210px;
		object-fit: cover;
		border-radius: 18px;
	}

	.privacy {
		margin-top: auto;
		text-align: center;
	}
</style>
