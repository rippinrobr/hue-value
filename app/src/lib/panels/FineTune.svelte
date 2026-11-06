<script lang="ts">
	import Overlay from '#lib/components/Overlay.svelte';
	import Picture from '#lib/components/Picture.svelte';
	import TuneControls from '#lib/components/TuneControls.svelte';
</script>

<Overlay title="Fine-tune your values" close="Done">
	<Picture height="30dvh" toggle={false} enlarge={false} brush />
	<TuneControls />
</Overlay>
