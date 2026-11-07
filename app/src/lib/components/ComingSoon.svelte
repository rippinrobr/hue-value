<script lang="ts">
	import { resolve } from '$app/paths';

	let { title, message }: { title: string; message: string } = $props();
</script>

<svelte:head>
	<title>{title} · Hue &amp; Value</title>
</svelte:head>

<main class="screen soon">
	<h1>{title}</h1>
	<p class="muted">{message}</p>
	<a class="button" href={resolve('/')}>Back to my study</a>
</main>

<style>
	.soon {
		justify-content: center;
		padding-bottom: 20px;
	}
</style>
