<script lang="ts">
	import {
		BRANDS,
		grayHex,
		hex,
		mixWarning,
		paintById,
		paletteTubes,
		requirePaint,
		targetSwatch,
		zoneRecipe
	} from '#lib/engine/index.ts';
	import { studio } from '#lib/studio.svelte.ts';
	import { goToStep, openPanel, startOver } from '#lib/nav.ts';
	import { makeSheet } from '#lib/sheet-view.svelte.ts';
	import Stepper from '#lib/components/Stepper.svelte';
	import Picture from '#lib/components/Picture.svelte';
	import Choice from '#lib/components/Choice.svelte';

	const settings = $derived(studio.settings);
	const zones = $derived(studio.study?.zones ?? []);
	const unit = $derived(studio.mono ? 'Tone' : 'Color');
	const paint = $derived(requirePaint(settings.brand, settings.pig));
	const usedPaints = $derived(
		studio.mono
			? `${paint.name} and ${BRANDS[settings.brand].white}`
			: `${paletteTubes(settings.palette, settings.brand)
					.map((t) => t.name)
					.join(', ')} and ${BRANDS[settings.brand].white}`
	);
	const needsDarks = $derived(
		studio.mono && zones.some((z) => (z.v?.near.deep ?? 0) > 0 || (z.v?.comp.deep ?? 0) > 0)
	);
	const partner = $derived(paintById(settings.brand, paint[settings.darks]));
	let making = $state(false);
	let failed = $state(false);

	const position = (i: number) =>
		i === 0 ? ' · darkest' : i === zones.length - 1 ? ' · lightest' : '';

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

<main class="screen wide">
	<Stepper current="mix" />
	<div>
		<h1>Your mixes</h1>
		<p class="muted">{usedPaints}</p>
	</div>
	{#if studio.message}<p class="message" role="alert">{studio.message}</p>{/if}
	<div class="columns">
		<div class="sticky"><Picture height="28dvh" /></div>
		<div class="stack">
			{#if needsDarks}
				<Choice
					label="Mix the darks with"
					options={[
						{ id: 'near', label: 'Same family' },
						{ id: 'comp', label: 'Complement' }
					]}
					value={settings.darks}
					onchange={(darks) => studio.change({ darks })}
				/>
				<p class="muted">
					{partner ? `Darks deepened with ${partner.name}` : 'No darker partner in this range'}
				</p>
			{/if}
			<div class="card list">
				{#each zones as zone, i (i)}
					{@const recipe = zoneRecipe(zone, settings)}
					{@const warning = mixWarning(zone, settings)}
					<button
						type="button"
						class="mix"
						aria-pressed={studio.selected === i}
						onclick={() => studio.select(i)}
					>
						<span class="swatch">
							<span style:background={studio.mono ? grayHex(zone.L) : targetSwatch(zone, settings)}
							></span>
							<span style:background={hex(zone.mix)}></span>
						</span>
						<span class="words">
							<span class="recipe">{recipe.main}</span>
							<span class="meta">
								{unit}
								{i + 1} · value {(zone.L / 10).toFixed(1)}{position(i)} · {Math.round(
									zone.area * 100
								)}% of picture
							</span>
							{#if warning}<span class="warning">{warning}</span>{/if}
							{#if studio.selected === i && recipe.sub}<span class="meta">{recipe.sub}</span>{/if}
						</span>
					</button>
				{/each}
			</div>
			<p class="muted">
				Swatch: {studio.mono ? 'target value' : 'photo color'} on top, your mix below. Tap a mix to see
				where it goes.
			</p>
			<div class="pair">
				<button type="button" class="row-button center" onclick={() => openPanel('paints')}>
					Paints to set out
				</button>
				<button type="button" class="row-button center" onclick={() => openPanel('paints')}>
					Working tips
				</button>
			</div>
			<p class="muted">
				Ratios are estimates from a paint-mixing model. Brands vary, so test the first mix on a card
				next to your reference. Parts are by volume.
			</p>
		</div>
	</div>
	<div class="actions column">
		{#if failed}<p class="message" role="alert">Could not make the sheet. Try again.</p>{/if}
		<div class="buttons">
			<button type="button" class="button soft" onclick={() => goToStep('values')}>Back</button>
			<button type="button" class="button grow" disabled={making} onclick={save}>
				{making ? 'Making sheet…' : 'Save painting sheet'}
			</button>
		</div>
		<button type="button" class="link" onclick={startOver}>Start a new study</button>
	</div>
</main>

<style>
	.list {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.mix {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 10px 14px;
		border: 0;
		border-bottom: 1px solid var(--control);
		background: none;
		text-align: left;
	}

	.mix:last-child {
		border-bottom: 0;
	}

	.mix[aria-pressed='true'] {
		background: var(--control);
	}

	.swatch {
		flex: none;
		display: flex;
		flex-direction: column;
		width: 48px;
		height: 48px;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 14px;
	}

	.swatch span {
		flex: 1;
	}

	.words {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.recipe {
		font-weight: 700;
	}

	.meta {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.warning {
		color: var(--danger);
		font-size: 14px;
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.center {
		justify-content: center;
		text-align: center;
		font-size: 15px;
	}

	.column {
		flex-direction: column;
		gap: 4px;
	}

	.buttons {
		display: flex;
		gap: 10px;
	}
</style>
