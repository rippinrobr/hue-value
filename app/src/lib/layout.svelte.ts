import { MediaQuery } from 'svelte/reactivity';

/** Wide enough for the picture and a side panel. Matches the CSS breakpoint. */
export const wide = new MediaQuery(
	'(min-width: 900px), (min-width: 640px) and (orientation: landscape)'
);
