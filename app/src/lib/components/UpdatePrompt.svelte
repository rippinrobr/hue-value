<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	const { needRefresh, updateServiceWorker } = useRegisterSW();
</script>

{#if $needRefresh}
	<div class="update" role="status">
		<p>A new version is ready. Updating restarts your study.</p>
		<div class="buttons">
			<button type="button" class="button soft small" onclick={() => ($needRefresh = false)}>
				Later
			</button>
			<button type="button" class="button small" onclick={() => updateServiceWorker(true)}>
				Update
			</button>
		</div>
	</div>
{/if}

<style>
	.update {
		position: fixed;
		left: max(12px, env(safe-area-inset-left));
		right: max(12px, env(safe-area-inset-right));
		bottom: max(12px, env(safe-area-inset-bottom));
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 456px;
		margin: 0 auto;
		padding: 14px;
		border: 1px solid var(--border);
		border-radius: 22px;
		background: var(--surface);
	}

	.buttons {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
</style>
