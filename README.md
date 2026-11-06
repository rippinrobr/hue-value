# Hue & Value

A web app for planning value studies and limited-palette paintings in water-mixable oil or acrylic. It runs at [huevalue.com](https://huevalue.com), installs to a phone's home screen, and works offline. Photos never leave the device.

Add a reference photo, choose your paints, check the values, then get a mixing recipe for every tone:

- group a photo into 3–9 values, or 3–12 colors with a limited palette (Zorn, primary colors, or Anna Wakitsch's warm & cool)
- mix one paint with Titanium White, with a same-family or complementary partner for the deepest tones
- adjust contrast and brightness, and brush to brighten one area
- save a painting sheet with the photo, value map, tone scale, paints, recipes and working tips

Paints cover the full **Winsor & Newton Artisan** and **Cobra Artist** water-mixable oil ranges (whites and metallics aside). Ratios come from a Kubelka–Munk paint-mixing model with typical pigment data, so treat them as a starting point and test each mix on a card against your reference.

## Layout

| Folder | What's there |
| --- | --- |
| `app/` | The Svelte 5, TypeScript and Vite app |
| `app/src/lib/engine/` | The color engine: mixing, grouping, recipes, pigment search, painting sheet |
| `data/` | Catalog data: paints, pigments and brands |
| `legacy/` | The previous single-file app, kept as the reference for the golden tests |
| `wrangler.jsonc` | The Cloudflare Worker that serves `app/dist` |

## Working on it

Node 24 is pinned in `app/.nvmrc`.

```
cd app
nvm use
npm install
npm run dev
```

| Command | What it checks |
| --- | --- |
| `npm test` | Unit tests, and the engine against 90 recorded studies and 30 searches |
| `npm run test:e2e` | The app in a browser, after a build |
| `npm run test:offline` | Install, offline use, updates and the upgrade from the old app, after a build |
| `npm run golden:sheet` | The painting sheet against the old app, pixel by pixel |
| `npm run test:worker` | Large photos through the real Web Worker against the old app |
| `npm run test:all` | All of the above, plus types, lint and a build |

## Deploying

Merging to `main` deploys through Cloudflare, which runs the build in `wrangler.jsonc`. Installed copies offer the update the next time they open.
