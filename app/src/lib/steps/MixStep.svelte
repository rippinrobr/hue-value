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
	import { openPanel, startOver } from '#lib/nav.ts';
	import Choice from '#lib/components/Choice.svelte';

	// Results and their settings always stay a matching pair.
	const settings = $derived(studio.studied);
	const zones = $derived(studio.study?.zones ?? []);
	const unit = $derived(studio.studiedMono ? 'Tone' : 'Color');
	const paint = $derived(requirePaint(settings.brand, settings.pig));
	const usedPaints = $derived(
		studio.studiedMono
			? `${paint.name} and ${BRANDS[settings.brand].white}`
			: `${paletteTubes(settings.palette, settings.brand)
					.map((t) => t.name)
					.join(', ')} and ${BRANDS[settings.brand].white}`
	);
	const needsDarks = $derived(
		studio.studiedMono && zones.some((z) => (z.v?.near.deep ?? 0) > 0 || (z.v?.comp.deep ?? 0) > 0)
	);
	const partner = $derived(paintById(settings.brand, paint[settings.darks]));
	// The tone shown large: the one picked, or the darkest until one is.
	const current = $derived(studio.selected ?? 0);
	const shown = $derived(zones[current]);
	const shownRecipe = $derived(shown ? zoneRecipe(shown, settings) : undefined);
	const top = (zone: (typeof zones)[number]) =>
		studio.studiedMono ? grayHex(zone.L) : targetSwatch(zone, settings);

	const position = (i: number) =>
		i === 0 ? ' · darkest' : i === zones.length - 1 ? ' · lightest' : '';
</script>

<div class="step-head">
	<h1>Your mixes</h1>
	<p class="muted">{usedPaints}</p>
</div>

<div class="tones" role="group" aria-label="{unit}s, darkest to lightest">
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

{#if shown && shownRecipe}
	<section class="current" aria-live="polite">
		<span class="swatch big">
			<span style:background={top(shown)}></span>
			<span style:background={hex(shown.mix)}></span>
		</span>
		<div class="words">
			<span class="muted">
				{unit}
				{current + 1}{position(current)} · value {(shown.L / 10).toFixed(1)}
			</span>
			<p class="big-recipe">{shownRecipe.main}</p>
			{#if shownRecipe.sub}<p class="muted">{shownRecipe.sub}</p>{/if}
			{#if studio.selected === null}<p class="muted">
					Tap a {unit.toLowerCase()} to see where it goes.
				</p>{/if}
		</div>
	</section>
{/if}

<div class="pair">
	<button type="button" class="row-button center" onclick={() => openPanel('paints')}>
		Paints to set out
	</button>
	<button type="button" class="row-button center" onclick={() => openPanel('paints')}>
		Working tips
	</button>
</div>

{#if needsDarks}
	<Choice
		label="Mix the darks with"
		options={[
			{ id: 'near', label: 'Same family' },
			{ id: 'comp', label: 'Complement' }
		]}
		value={studio.settings.darks}
		onchange={(darks) => studio.change({ darks })}
	/>
	<p class="muted">
		{partner ? `Darks deepened with ${partner.name}` : 'No darker partner in this range'}
	</p>
{/if}

<h2>All mixes</h2>
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
				<span style:background={top(zone)}></span>
				<span style:background={hex(zone.mix)}></span>
			</span>
			<span class="words">
				<span class="recipe">{recipe.main}</span>
				<span class="meta">
					{unit}
					{i + 1} · value {(zone.L / 10).toFixed(1)}{position(i)} · {Math.round(zone.area * 100)}%
					of picture
				</span>
				{#if warning}<span class="warning">{warning}</span>{/if}
			</span>
		</button>
	{/each}
</div>
<p class="muted">
	Swatch: {studio.studiedMono ? 'target value' : 'photo color'} on top, your mix below. Ratios are estimates
	from a paint-mixing model. Brands vary, so test the first mix on a card next to your reference. Parts
	are by volume.
</p>
<div class="end">
	<button type="button" class="link" onclick={startOver}>Start a new study</button>
</div>

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
		border-bottom: 1px solid var(--line);
		background: none;
		text-align: left;
	}

	.mix:last-child {
		border-bottom: 0;
	}

	.mix[aria-pressed='true'] {
		background: #312e3b;
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

	.tones {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 8px;
	}

	.tones button {
		height: 60px;
		border: 1px solid var(--border);
		border-radius: 14px;
		font-size: 15px;
		font-weight: 800;
	}

	.tones button[aria-pressed='true'] {
		border: 3px solid var(--accent);
	}

	.current {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 14px;
		border-radius: 16px;
		background: var(--surface);
	}

	.swatch.big {
		width: 64px;
		height: 64px;
	}

	.big-recipe {
		font-size: 25px;
		line-height: 1.15;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.end {
		padding-bottom: 16px;
	}
</style>
