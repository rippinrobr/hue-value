<script lang="ts" generics="T extends string">
	let {
		label,
		options,
		value,
		onchange
	}: {
		label: string;
		options: { id: T; label: string }[];
		value: T;
		onchange: (value: T) => void;
	} = $props();
</script>

<div class="field" role="group" aria-label={label}>
	<span class="label">{label}</span>
	<div class="options" style:--count={options.length}>
		{#each options as option (option.id)}
			<button type="button" aria-pressed={option.id === value} onclick={() => onchange(option.id)}>
				{option.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.options {
		display: grid;
		grid-template-columns: repeat(var(--count), minmax(0, 1fr));
		gap: 6px;
	}

	button {
		min-height: 44px;
		padding: 0 4px;
		border: 0;
		border-radius: 16px;
		background: var(--surface);
		font-size: 14px;
		font-weight: 700;
	}

	button[aria-pressed='true'] {
		background: var(--accent);
		color: var(--on-accent);
	}
</style>
