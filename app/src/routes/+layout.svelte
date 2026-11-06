<script lang="ts">
	import '@fontsource-variable/figtree';
	import '../app.css';
	import UpdatePrompt from '#lib/components/UpdatePrompt.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
<UpdatePrompt />
