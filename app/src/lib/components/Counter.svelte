<script lang="ts">
	let {
		label,
		value,
		min,
		max,
		onchange
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		onchange: (value: number) => void;
	} = $props();
</script>

<div class="counter card">
	<span class="name">{label}</span>
	<span class="controls">
		<button
			type="button"
			aria-label="Fewer {label.toLowerCase()}"
			disabled={value <= min}
			onclick={() => onchange(value - 1)}>−</button
		>
		<output aria-live="polite">{value}</output>
		<button
			type="button"
			aria-label="More {label.toLowerCase()}"
			disabled={value >= max}
			onclick={() => onchange(value + 1)}>+</button
		>
	</span>
</div>

<style>
	.counter {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 8px 6px 16px;
		border-radius: 20px;
	}

	.name {
		font-weight: 700;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	button {
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 22px;
		background: var(--soft);
		color: var(--on-soft);
		font-size: 22px;
		font-weight: 700;
	}

	output {
		width: 24px;
		text-align: center;
		font-size: 18px;
		font-weight: 800;
	}
</style>
