<script lang="ts">
	import { studio } from '#lib/studio.svelte.ts';
	import Overlay from '#lib/components/Overlay.svelte';
	import Choice from '#lib/components/Choice.svelte';
</script>

<Overlay title="Settings" close="Done">
	<Choice
		label="Your paint"
		options={[
			{ id: 'oil', label: 'Water-mixable oil' },
			{ id: 'acrylic', label: 'Acrylic' }
		]}
		value={studio.settings.med}
		onchange={(medium) => studio.setMedium(medium)}
	/>
	<p class="muted">
		{studio.settings.med === 'acrylic'
			? 'Acrylic dries a little darker, so wet mixes are set slightly lighter than the target.'
			: 'Water-mixable oils dry close to their wet color, so mixes match the target directly.'}
	</p>
	<Choice
		label="Your brand"
		options={[
			{ id: 'artisan', label: 'W&N Artisan' },
			{ id: 'cobra', label: 'Cobra' }
		]}
		value={studio.defaultBrand}
		onchange={(brand) => studio.setBrand(brand)}
	/>
	<p class="muted">
		Hue &amp; Value opens with this brand every time. Both are water-mixable oils, and they can be
		mixed together.
	</p>
	<button
		type="button"
		role="switch"
		class="remember card"
		aria-checked={studio.remember}
		onclick={() => studio.setRemember(!studio.remember)}
	>
		<span class="words">
			<span class="name">Remember my palette</span>
			<span class="muted">Skip the Palette step and go straight to your values.</span>
		</span>
		<span class="track" class:on={studio.remember}><span class="thumb"></span></span>
	</button>
	<p class="muted saved">Saved on this device.</p>
</Overlay>

<style>
	.remember {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
		border: 0;
		text-align: left;
	}

	.words {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.name {
		font-weight: 700;
	}

	.track {
		flex: none;
		display: flex;
		align-items: center;
		width: 52px;
		height: 32px;
		padding: 3px;
		border-radius: 16px;
		background: var(--text-secondary);
	}

	.track.on {
		justify-content: flex-end;
		background: var(--accent);
	}

	.thumb {
		width: 26px;
		height: 26px;
		border-radius: 13px;
		background: var(--surface);
	}

	.saved {
		margin-top: auto;
		text-align: center;
	}
</style>
