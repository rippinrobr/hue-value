import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { withPwa } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		withPwa(
			{
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				// A static single-page app: dist/index.html serves every route.
				adapter: adapter({ pages: 'dist', assets: 'dist', fallback: 'index.html' }),
				// Absolute paths, so the fallback page loads its files from any address.
				paths: { relative: false }
			},
			{
				// Keeps the name of today's service worker, so installed copies update to this one.
				filename: 'sw.js',
				registerType: 'prompt',
				injectRegister: false,
				kit: { adapterFallback: 'index.html', spa: { fallbackMapping: '/' } },
				manifest: {
					id: '/',
					name: 'Hue & Value',
					short_name: 'Hue & Value',
					description:
						'Turn a reference photo into value maps and mixing recipes for monochrome studies and limited palettes.',
					start_url: '/',
					scope: '/',
					display: 'standalone',
					orientation: 'any',
					background_color: '#17161c',
					theme_color: '#17161c',
					icons: [
						{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
						{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
						{
							src: 'icons/icon-maskable-512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				generateSW: {
					// Cloudflare redirects /index.html to /, so the app is stored and served as /.
					navigateFallback: '/',
					globPatterns: ['client/**/*.{js,css,svg,png,woff2,webmanifest}'],
					// Every route is drawn in the browser, so no pages are prerendered.
					globStrict: false,
					// The app's text is all Latin, so these alphabets are never needed.
					globIgnores: ['**/*-{cyrillic,greek,vietnamese,devanagari,cyrillic-ext,greek-ext}-*'],
					cleanupOutdatedCaches: true,
					// Once Update starts the new version, it takes over every open page, even one that
					// loaded without a service worker, so that page reloads instead of waiting.
					clientsClaim: true
				}
			}
		)
	],
	// The catalog in ../data is shared with the API.
	server: { fs: { allow: ['..'] } },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
