<script lang="ts">
	import {
		BRANDS,
		LIMITED_PALETTES,
		hex,
		mix,
		paintNote,
		paletteTubes,
		requirePaint,
		type LimitedPaletteId,
		type PaletteId
	} from '#lib/engine/index.ts';
	import { studio } from '#lib/studio.svelte.ts';
	import { goToStep, openPanel, startOver } from '#lib/nav.ts';
	import Stepper from '#lib/components/Stepper.svelte';

	const LIMITED: { id: LimitedPaletteId; blurb: string }[] = [
		{ id: 'zorn', blurb: 'Ochre, red and black. Warm and harmonious.' },
		{ id: 'primary', blurb: 'Yellow, red and blue. The widest range.' },
		{ id: 'warmcool', blurb: 'Two strings that combine into skin tones.' }
	];

	const paint = $derived(requirePaint(studio.settings.brand, studio.settings.pig));
	const brand = $derived(studio.settings.brand);
	const selected = $derived(studio.settings.palette);
	const swatches = (id: PaletteId) => paletteTubes(id, brand).map((t) => hex(mix(0.35, t)));
	const note = (id: LimitedPaletteId) => LIMITED_PALETTES[id].note?.[brand];
</script>

<main class="screen">
	<Stepper current="palette" />
	<div class="head">
		{#if studio.thumbnail}<img src={studio.thumbnail} alt="Reference" />{/if}
		<h1>Which paints will you use?</h1>
	</div>

	<div class="option card" class:chosen={selected === 'mono'}>
		<button
			type="button"
			class="pick"
			aria-pressed={selected === 'mono'}
			onclick={() => studio.choosePalette('mono')}
		>
			<span class="name">One color</span>
			<span class="muted">A monochrome study: one paint plus white.</span>
		</button>
		{#if selected === 'mono'}
			<button type="button" class="paint" onclick={() => openPanel('picker')}>
				<span class="dot" style:background={hex(mix(0.35, paint))}></span>
				<span class="paint-name">{paint.name}</span>
				<span class="change">Change</span>
			</button>
			<p class="muted detail">{paintNote(paint)}</p>
		{/if}
	</div>

	{#each LIMITED as option (option.id)}
		{@const palette = LIMITED_PALETTES[option.id]}
		<div class="option card" class:chosen={selected === option.id}>
			<button
				type="button"
				class="pick"
				aria-pressed={selected === option.id}
				onclick={() => studio.choosePalette(option.id)}
			>
				<span class="title-row">
					<span class="name">{palette.name}</span>
					<span class="dots">
						{#each swatches(option.id) as color (color)}
							<span class="mini" style:background={color}></span>
						{/each}
					</span>
				</span>
				<span class="muted">{option.blurb}</span>
			</button>
			{#if selected === option.id}
				<p class="muted detail">
					{palette.about}
					{note(option.id) ?? ''}
					{#if palette.link}
						<a href={palette.link} target="_blank" rel="noopener external">Read her guide.</a>
					{/if}
				</p>
				<p class="muted detail">
					Uses {paletteTubes(option.id, brand)
						.map((t) => t.name)
						.join(', ')} and {BRANDS[brand].white}.
				</p>
			{/if}
		</div>
	{/each}

	<div class="actions">
		<button type="button" class="button soft" onclick={startOver}>Back</button>
		<button
			type="button"
			class="button grow"
			onclick={() => {
				studio.savePrefs();
				goToStep('values');
			}}
		>
			See my values
		</button>
	</div>
</main>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.head img {
		width: 64px;
		height: 76px;
		object-fit: cover;
		border-radius: 14px;
	}

	.option {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 2px;
		border: 2px solid transparent;
	}

	.option.chosen {
		border-color: var(--pine);
		padding-bottom: 14px;
	}

	.pick {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
		min-height: 44px;
		padding: 12px 14px 10px;
		border: 0;
		border-radius: 20px;
		background: none;
		text-align: left;
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.name {
		font-size: 18px;
		font-weight: 800;
	}

	.dots {
		display: flex;
		gap: 4px;
	}

	.mini {
		width: 16px;
		height: 16px;
		border-radius: 8px;
	}

	.paint {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 14px;
		min-height: 48px;
		padding: 10px;
		border: 0;
		border-radius: 14px;
		background: var(--ground);
		text-align: left;
	}

	.dot {
		flex: none;
		width: 28px;
		height: 28px;
		border-radius: 14px;
	}

	.paint-name {
		flex: 1;
		font-size: 15px;
		font-weight: 700;
	}

	.change {
		color: var(--pine);
		font-size: 15px;
		font-weight: 700;
	}

	.detail {
		padding: 0 14px;
		font-size: 14px;
	}
</style>
