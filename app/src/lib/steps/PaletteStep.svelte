<script lang="ts">
	import {
		BRANDS,
		LIMITED_PALETTES,
		hex,
		mix,
		paintById,
		paintNote,
		paletteTubes,
		requirePaint,
		type LimitedPaletteId,
		type PaletteId
	} from '#lib/engine/index.ts';
	import { studio } from '#lib/studio.svelte.ts';
	import { goToStep, openPanel } from '#lib/nav.ts';
	import Choice from '#lib/components/Choice.svelte';

	const OPTIONS: { id: PaletteId; name: string; blurb: string }[] = [
		{ id: 'mono', name: 'One color', blurb: 'One paint plus white' },
		{ id: 'zorn', name: LIMITED_PALETTES.zorn.name, blurb: 'Ochre, red, black' },
		{ id: 'primary', name: LIMITED_PALETTES.primary.name, blurb: 'Yellow, red, blue' },
		{ id: 'warmcool', name: LIMITED_PALETTES.warmcool.name, blurb: 'Two strings for skin' }
	];

	const brand = $derived(studio.settings.brand);
	const paint = $derived(requirePaint(brand, studio.settings.pig));
	const partner = $derived(paintById(brand, paint[studio.settings.darks]));
	const selected = $derived(studio.settings.palette);
	const limited = $derived(selected === 'mono' ? undefined : LIMITED_PALETTES[selected]);
	const swatches = (id: PaletteId) =>
		id === 'mono' ? [hex(mix(0.35, paint))] : paletteTubes(id, brand).map((t) => hex(mix(0.35, t)));
	const note = (id: LimitedPaletteId) => LIMITED_PALETTES[id].note?.[brand];
</script>

<div class="step-head">
	<h1>Which paints will you use?</h1>
	<p class="muted">Pick a palette. You can come back and change it.</p>
</div>

<div class="grid">
	{#each OPTIONS as option (option.id)}
		<button
			type="button"
			class="option"
			aria-pressed={selected === option.id}
			onclick={() => studio.choosePalette(option.id)}
		>
			<span class="name">{option.name}</span>
			<span class="blurb">{option.blurb}</span>
			<span class="dots" aria-hidden="true">
				{#each swatches(option.id) as color, i (i)}
					<span style:background={color}></span>
				{/each}
			</span>
		</button>
	{/each}
</div>

{#if selected === 'mono'}
	<button type="button" class="paint" onclick={() => openPanel('picker')}>
		<span class="dot" style:background={hex(mix(0.35, paint))}></span>
		<span class="words">
			<span class="paint-name">{paint.name}</span>
			<span class="muted small">{BRANDS[brand].brand} · {paint.code}</span>
		</span>
		<span class="change">Change</span>
	</button>
	<p class="muted small">{paintNote(paint)}</p>
	<Choice
		label="Mix the darks with"
		options={[
			{ id: 'near', label: 'Same family' },
			{ id: 'comp', label: 'Complement' }
		]}
		value={studio.settings.darks}
		onchange={(darks) => studio.change({ darks })}
	/>
	<p class="muted small">
		{partner ? `Darks deepened with ${partner.name}` : 'No darker partner in this range'}
	</p>
{:else if limited}
	<div class="about">
		<p class="muted small">
			{limited.about}
			{note(selected as LimitedPaletteId) ?? ''}
			{#if limited.link}
				<a href={limited.link} target="_blank" rel="noopener external">Read her guide.</a>
			{/if}
		</p>
		<p class="muted small">
			Uses {paletteTubes(selected, brand)
				.map((t) => t.name)
				.join(', ')} and {BRANDS[brand].white}.
		</p>
	</div>
{/if}

<div class="step-actions">
	<button
		type="button"
		class="button"
		onclick={() => {
			studio.savePrefs();
			goToStep('values');
		}}
	>
		See my values
	</button>
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.option {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-height: 96px;
		padding: 12px;
		border: 2px solid transparent;
		border-radius: 16px;
		background: var(--surface);
		text-align: left;
	}

	.option:hover {
		border-color: var(--border);
	}

	.option[aria-pressed='true'] {
		border-color: var(--accent);
	}

	.name {
		font-size: 17px;
		font-weight: 800;
	}

	.blurb {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.dots {
		display: flex;
		gap: 4px;
		margin-top: auto;
		padding-top: 8px;
	}

	.dots span {
		width: 16px;
		height: 16px;
		border-radius: 8px;
	}

	.paint {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 60px;
		padding: 10px 14px;
		border: 0;
		border-radius: 16px;
		background: var(--surface);
		text-align: left;
	}

	.dot {
		flex: none;
		width: 36px;
		height: 36px;
		border-radius: 18px;
	}

	.words {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.paint-name {
		font-weight: 800;
	}

	.change {
		color: var(--accent);
		font-size: 15px;
		font-weight: 800;
	}

	.small {
		font-size: 14px;
	}

	.about {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
