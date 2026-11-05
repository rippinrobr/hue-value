// Writes data/paints.json from today's paints.js, with the computed values kept exactly.
// Run from app/ with: npm run data:paints
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(
	repo,
	existsSync(path.join(repo, 'legacy/paints.js')) ? 'legacy' : '.',
	'paints.js'
);
const window = {};
vm.runInNewContext(await readFile(source, 'utf8'), { window });
const output = path.join(repo, 'data/paints.json');
await writeFile(output, `${JSON.stringify(window.PAINT_DATA, null, '\t')}\n`);
console.log(`artisan ${window.PAINT_DATA.artisan.length}, cobra ${window.PAINT_DATA.cobra.length}`);
