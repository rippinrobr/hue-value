import { defineConfig } from '@playwright/test';

// Set E2E_BASE to test somewhere else, such as `wrangler dev` or a preview address.
const baseURL = process.env.E2E_BASE ?? 'http://127.0.0.1:4174';

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	reporter: 'list',
	use: { baseURL, viewport: { width: 390, height: 844 } },
	webServer: process.env.E2E_BASE
		? undefined
		: { command: 'node tests/worker-like-server.mjs 4174', url: baseURL, reuseExistingServer: true }
});
