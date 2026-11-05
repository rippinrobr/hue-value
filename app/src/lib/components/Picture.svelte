<script lang="ts">
	import { YfromL, fillMap, toSRGB } from '#lib/engine/index.ts';
	import { studio } from '#lib/studio.svelte.ts';
	import { openPanel } from '#lib/nav.ts';

	let {
		height = '46dvh',
		toggle = true,
		enlarge = true,
		brush = false
	}: { height?: string; toggle?: boolean; enlarge?: boolean; brush?: boolean } = $props();

	let canvas = $state<HTMLCanvasElement>();
	let strokes = $state(0);
	let down = false;

	const views = [
		{ id: 'photo', label: 'Photo' },
		{ id: 'values', label: 'Values' },
		{ id: 'map', label: 'Paint' }
	] as const;
	const brushActive = $derived(brush && studio.brushing);

	function draw() {
		const { study, photo, size, settings, selected, mask } = studio;
		if (!canvas || !study || !photo) return;
		canvas.width = size.width;
		canvas.height = size.height;
		const g = canvas.getContext('2d') as CanvasRenderingContext2D;
		let image: ImageData;
		if (settings.show === 'photo') {
			g.drawImage(photo.image, 0, 0, size.width, size.height);
			image = g.getImageData(0, 0, size.width, size.height);
		} else {
			image = g.createImageData(size.width, size.height);
			const colors = study.zones.map((z) => {
				if (settings.show === 'map') return z.mix.map(toSRGB);
				const v = toSRGB(YfromL(z.L));
				return [v, v, v];
			});
			fillMap(image, study.assign, colors, selected);
		}
		if (brushActive) {
			const d = image.data;
			for (let i = 0, j = 0; j < mask.length; i += 4, j++) {
				if (mask[j] > 0) {
					const a = 0.5 * mask[j];
					d[i] += (255 - d[i]) * a;
					d[i + 1] += (194 - d[i + 1]) * a;
					d[i + 2] += (26 - d[i + 2]) * a;
				}
			}
		}
		g.putImageData(image, 0, 0);
	}

	$effect(() => {
		void strokes;
		draw();
	});

	function stamp(event: PointerEvent) {
		if (!canvas) return;
		const box = canvas.getBoundingClientRect();
		const { width: W, height: H } = studio.size;
		// The picture is letterboxed to fit its frame, so measure the drawn area.
		const scale = Math.min(box.width / W, box.height / H);
		const left = box.left + (box.width - W * scale) / 2;
		const top = box.top + (box.height - H * scale) / 2;
		const cx = (event.clientX - left) / scale;
		const cy = (event.clientY - top) / scale;
		const rad = studio.brushSize / scale / 2;
		const x0 = Math.max(0, Math.floor(cx - rad));
		const x1 = Math.min(W - 1, Math.ceil(cx + rad));
		const y0 = Math.max(0, Math.floor(cy - rad));
		const y1 = Math.min(H - 1, Math.ceil(cy + rad));
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const d = Math.hypot(x - cx, y - cy) / rad;
				if (d >= 1) continue;
				const m = 1 - d * d;
				const k = y * W + x;
				if (m > studio.mask[k]) studio.mask[k] = m;
			}
		}
		const g = canvas.getContext('2d') as CanvasRenderingContext2D;
		g.fillStyle = 'rgba(255,194,26,.25)';
		g.beginPath();
		g.arc(cx, cy, rad, 0, Math.PI * 2);
		g.fill();
	}

	function pointerdown(event: PointerEvent) {
		if (!brushActive) return;
		down = true;
		canvas?.setPointerCapture(event.pointerId);
		stamp(event);
		event.preventDefault();
	}

	function pointermove(event: PointerEvent) {
		if (down) stamp(event);
	}

	function pointerup() {
		if (!down) return;
		down = false;
		strokes++;
		studio.commitMask();
	}
</script>

<div class="picture">
	<canvas
		bind:this={canvas}
		class:brushing={brushActive}
		style:--height={height}
		aria-label="Your photo or its value map"
		onpointerdown={pointerdown}
		onpointermove={pointermove}
		onpointerup={pointerup}
		onpointercancel={pointerup}
	></canvas>
	{#if toggle || enlarge}
		<div class="tools">
			{#if toggle}
				<div class="views" role="group" aria-label="Show">
					{#each views as view (view.id)}
						<button
							type="button"
							aria-pressed={studio.settings.show === view.id}
							onclick={() => (studio.settings.show = view.id)}
						>
							{view.label}
						</button>
					{/each}
				</div>
			{/if}
			{#if enlarge}
				<button
					type="button"
					class="enlarge"
					aria-label="Enlarge the picture"
					onclick={() => openPanel('lightbox')}
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg
					>
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.picture {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	canvas {
		display: block;
		width: 100%;
		height: auto;
		max-height: var(--height);
		object-fit: contain;
		border-radius: 18px;
		background: var(--soft);
	}

	@media (min-width: 900px) {
		canvas {
			max-height: 62dvh;
		}
	}

	canvas.brushing {
		cursor: crosshair;
		touch-action: none;
	}

	.tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.views {
		display: flex;
		padding: 3px;
		border-radius: 24px;
		background: var(--surface);
	}

	.views button {
		min-height: 44px;
		padding: 0 14px;
		border: 0;
		border-radius: 20px;
		background: transparent;
		font-size: 15px;
		font-weight: 700;
	}

	.views button[aria-pressed='true'] {
		background: var(--pine);
		color: var(--on-pine);
	}

	.enlarge {
		display: grid;
		place-items: center;
		flex: none;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 22px;
		background: var(--surface);
	}
</style>
