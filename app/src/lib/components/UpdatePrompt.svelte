<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	const { needRefresh, updateServiceWorker } = useRegisterSW();
	let updating = $state(false);

	// The new version reloads the page when it takes over. If that hasn't happened in a few
	// seconds, reload anyway, so the prompt never sits there after Update.
	async function update() {
		updating = true;
		setTimeout(() => location.reload(), 3000);
		await updateServiceWorker(true);
	}
</script>

{#if $needRefresh}
	<div class="update" role="status">
		<p>
			{updating ? 'Updating…' : 'A new version is ready. Updating restarts your study.'}
		</p>
		<div class="buttons">
			<button
				type="button"
				class="button soft small"
				disabled={updating}
				onclick={() => ($needRefresh = false)}
			>
				Later
			</button>
			<button type="button" class="button small" disabled={updating} onclick={update}>
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
		border-radius: 16px;
		background: var(--surface);
		box-shadow: 0 12px 40px rgb(0 0 0 / 0.45);
	}

	.buttons {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
</style>
