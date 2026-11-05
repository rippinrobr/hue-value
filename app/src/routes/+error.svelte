<script lang="ts">
	import { page } from '$app/state';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
</script>

{#if page.status === 404}
	<ComingSoon title="Page not found" message="There's nothing at this address." />
{:else}
	<ComingSoon title="Something went wrong" message="Try again from the start." />
{/if}
