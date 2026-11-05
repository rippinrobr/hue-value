<script lang="ts">
	import { BRANDS, hex, mix, searchPaints, type SearchItem } from '#lib/engine/index.ts';
	import { studio } from '#lib/studio.svelte.ts';
	import { closePanel } from '#lib/nav.ts';
	import Overlay from '#lib/components/Overlay.svelte';

	let query = $state('');
	const settings = $derived(studio.settings);
	const result = $derived(searchPaints(query, settings.brand));

	function pick(item: SearchItem) {
		studio.choosePaint(item.paint.id, item.brand);
		closePanel();
	}
</script>

<Overlay title="Choose a color">
	<label class="search">
		<span class="label">Search by name or pigment</span>
		<input type="search" bind:value={query} placeholder="Phthalo, or PB29 PG7" autocomplete="off" />
	</label>
	{#if result.intro}<p class="muted">{result.intro}</p>{/if}
	{#each result.groups as group (group.title)}
		<section>
			<h2>{group.title}</h2>
			<div class="card items">
				{#each group.items as item (`${item.brand}/${item.paint.id}`)}
					{@const current = item.paint.id === settings.pig && item.brand === settings.brand}
					<button
						type="button"
						aria-current={current ? 'true' : undefined}
						onclick={() => pick(item)}
					>
						<span class="swatch">
							<span style:background={hex(mix(1, item.paint))}></span>
							<span style:background={hex(mix(0.3, item.paint))}></span>
						</span>
						<span class="words">
							<span class="name">{item.paint.name}</span>
							{#if item.showBrand || item.brand !== settings.brand}
								<span class="meta">{BRANDS[item.brand].brand}</span>
							{/if}
							<span class="meta">{item.meta}</span>
						</span>
						{#if current}
							<svg
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg
							>
						{/if}
					</button>
				{/each}
			</div>
		</section>
	{/each}
</Overlay>

<style>
	.search {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	input {
		height: 52px;
		padding: 0 16px;
		border: 2px solid var(--line);
		border-radius: 18px;
		background: var(--surface);
		font-size: 16px;
		font-weight: 500;
	}

	section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.items {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.items button {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 62px;
		padding: 8px 14px;
		border: 0;
		border-bottom: 1px solid var(--soft);
		background: none;
		text-align: left;
	}

	.items button:last-child {
		border-bottom: 0;
	}

	.swatch {
		flex: none;
		display: flex;
		flex-direction: column;
		width: 36px;
		height: 36px;
		overflow: hidden;
		border-radius: 18px;
	}

	.swatch span {
		flex: 1;
	}

	.words {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.name {
		font-weight: 700;
	}

	.meta {
		color: var(--muted);
		font-size: 14px;
	}
</style>
