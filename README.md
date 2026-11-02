# Hue & Value

A small web app for planning value studies and limited-palette paintings in water-mixable oil or acrylic.

Load a reference photo and it will:

- group the photo into 3–9 values and show them as a value map
- or, with a limited palette (Zorn, primary colors, or Anna Wakitsch's warm & cool palette), group the photo into 3–12 colors and give a recipe for each from that palette's paints and white
- give a mixing ratio for each tone: your chosen color plus Titanium White, with a darker partner paint for the deepest tones
- compare two ways of mixing the darks: a same-family color (top scale) or the complement (bottom scale)
- let you add punch: contrast, overall brightness, and a brush to brighten one area
- show the value map full screen and save it as a PNG
- save a painting sheet: one tall image with the reference photo, value map, tone scale, paints, mixing recipes, settings and working tips, to keep in Photos for the studio

Paints cover the full **Winsor & Newton Artisan** and **Cobra Artist** water-mixable oil ranges (whites and metallics aside). Six favorites sit up front: Ultramarine, Phthalo Blue, Phthalo Green, Light Green (Cobra), Orange and Red. Tap **More colors…** to search the rest by name or pigment. Each tube is modeled from the pigments on the maker's chart (`paints.js`), and the app picks a same-family partner and a complement from the same brand for the dark tones.

Ratios come from a Kubelka–Munk paint-mixing model with typical pigment data. Treat them as a starting point and test each mix on a card against your reference.

## Install on your phone

1. Open the GitHub Pages address in Safari (iPhone/iPad) or Chrome (Android).
2. iPhone: tap **Share → Add to Home Screen**. Android: tap **⋮ → Install app**.
3. It opens full screen and works offline after the first visit. Photos never leave the device.

## Updating

Push changes to `main`. Installed copies check for the newest files every time they open, and fall back to the saved copy when offline. Change `VERSION` in `sw.js` only when the list of cached files changes.
