// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			step?: 'palette' | 'values' | 'mix';
			overlay?: 'picker' | 'tune' | 'paints' | 'settings' | 'lightbox';
		}
		// interface Platform {}
	}
}

export {};
