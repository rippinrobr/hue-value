// Writes data/paints.json and data/pigments.json from today's paints.js, keeping the
// computed values exactly. Run from app/ with: npm run data:paints
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const folder = existsSync(path.join(repo, 'legacy/paints.js')) ? 'legacy' : '.';
const source = await readFile(path.join(repo, folder, 'paints.js'), 'utf8');

// The pigment library and recipes are private to paints.js, so it hands them over as it runs.
const marker = 'window.PAINT_DATA={artisan:build(ARTISAN),cobra:build(COBRA)};';
if (source.split(marker).length !== 2) throw new Error('paints.js has changed shape');
const window = {};
vm.runInNewContext(source.replace(marker, `${marker}window.SOURCE={P,ARTISAN,COBRA};`), { window });

const { P, ARTISAN, COBRA } = window.SOURCE;
const withRecipes = (paints, rows) =>
	paints.map((paint, i) => {
		const [name, , , recipe] = rows[i];
		if (paint.name !== name) throw new Error(`Paint order changed at ${name}`);
		return { ...paint, recipe: recipe ?? null };
	});

const paints = {
	artisan: withRecipes(window.PAINT_DATA.artisan, ARTISAN),
	cobra: withRecipes(window.PAINT_DATA.cobra, COBRA)
};
const json = (value) => `${JSON.stringify(value, null, '\t')}\n`;
await writeFile(path.join(repo, 'data/paints.json'), json(paints));
await writeFile(path.join(repo, 'data/pigments.json'), json(P));
console.log(
	`artisan ${paints.artisan.length}, cobra ${paints.cobra.length}, pigments ${Object.keys(P).length}`
);
