<script lang="ts">
	import { studio } from '#lib/studio.svelte.ts';
	import { resolve } from '$app/paths';
	import { goToStep } from '#lib/nav.ts';
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

<main class="start">
	<div class="hero">
		<img src={preview} alt="Example still life with a sphere and a dark box" />
		<span class="band" aria-hidden="true">
			{#each ['#1c2462', '#3f4fa8', '#7f8cce', '#bcc3e6', '#f2f3fa'] as color (color)}
				<span style:background={color}></span>
			{/each}
		</span>
	</div>
	<div class="side">
		<div class="top">
			<span class="brand">Hue &amp; Value</span>
			<a class="settings" aria-label="Settings" href={resolve('/settings')}>
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
		</div>
		<div class="intro">
			<h1>See it in values. <br />Mix it with confidence.</h1>
			<p>Hue &amp; Value turns a reference photo into a value map and mixing recipes.</p>
		</div>
		{#if studio.message}
			<p class="message" role="alert">{studio.message}</p>
		{/if}
		<div class="buttons">
			<button type="button" class="button" onclick={() => library?.click()}>Choose a photo</button>
			<button type="button" class="button soft camera" onclick={() => camera?.click()}
				>Take a photo</button
			>
			<button type="button" class="link" onclick={example}>Try it with the example</button>
			<p class="muted privacy">Your photos stay on this device.</p>
		</div>
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
</main>

<style>
	/* Phones: the picture across the top, words and buttons below. */
	.start {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.hero {
		position: relative;
		display: flex;
		flex-direction: column;
		flex: 1 1 260px;
		min-height: 220px;
		max-height: 470px;
	}

	.hero img {
		flex: 1;
		display: block;
		width: 100%;
		min-height: 0;
		object-fit: cover;
	}

	.band {
		display: flex;
		flex: none;
		height: 14px;
	}

	.band span {
		flex: 1;
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 20px max(20px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom))
			max(20px, env(safe-area-inset-left));
	}

	.top {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: max(12px, env(safe-area-inset-top)) 16px 12px;
	}

	.brand {
		padding: 8px 14px;
		border-radius: 14px;
		background: var(--bg);
		font-size: 16px;
		font-weight: 800;
	}

	.settings {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 14px;
		background: var(--bg);
		color: var(--text);
	}

	.intro {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.intro h1 {
		font-size: 34px;
		line-height: 1.08;
	}

	.intro p {
		font-size: 17px;
		color: var(--text-secondary);
	}

	.buttons {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.camera {
		min-height: 48px;
	}

	.privacy {
		text-align: center;
	}

	@media (min-width: 600px) and (min-height: 900px) {
		.hero {
			max-height: 62dvh;
		}

		.side {
			width: 100%;
			max-width: 640px;
			margin: 0 auto;
			padding-top: 32px;
		}
	}

	/* Wide windows: the picture fills the left, the words sit beside it. */
	@media (min-width: 900px), (min-width: 640px) and (orientation: landscape) {
		.start {
			flex-direction: row;
			height: 100dvh;
		}

		.hero {
			flex: 1.4;
			max-height: none;
			min-width: 0;
		}

		.side {
			position: relative;
			flex: 1;
			justify-content: center;
			max-width: 560px;
			padding: 88px 48px 32px;
			overflow-y: auto;
		}

		.top {
			padding: 20px 24px;
		}

		.intro h1 {
			font-size: clamp(34px, 3.4vw, 48px);
		}

		.intro p {
			font-size: 19px;
		}
	}

	@media (orientation: landscape) and (max-height: 500px) {
		.side {
			justify-content: flex-start;
			gap: 14px;
			padding: 68px 24px 16px;
		}

		.intro h1 {
			font-size: 28px;
		}
	}
</style>
