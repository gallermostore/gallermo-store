# Gallermo — Uploaded Product and Brand Audit

Source files: `GallermoStoreAssets.zip`, `Updated price list and descriptions.xlsx` (November 15, 2026).

## Images

- Total files in archive: **360** (359 image files in product folders + 1 logo).
- **23 exact binary duplicates**, each duplicated across `Acrylic coasters` and `Mouse pads`.
- **336 distinct product designs** retained as WebP images, preserving the image bytes.

| Original asset folder | Imported category | Unique images | Pricing source |
|---|---|---:|---|
| Frame Your Vibe | Normal Frames | 162 | Normal frames |
| Anime neon coasters | Neon Anime Art | 12 | Neon animation chracters *(mapping to confirm)* |
| Supercar neon frames | Neon Car Frames | 24 | Neon car frames |
| Canvas portraits | Canvas Prints | 36 | Canvas |
| Laptop sleeves | Laptop Sleeves | 52 | Laptop sleeves |
| Mouse pads | Mouse Pads | 23 | Mouse pads |
| Flags | Flags | 27 | Flags |
| Acrylic coasters | Acrylic Coasters | **0** | Costers *(images missing; duplicates excluded)* |
| **Total** | | **336** | |

Each unique image has been treated as an individual design with shared category-level size/price variants. This is an explicit working assumption, **not** a verified inventory/SKU-to-image mapping. Titles derived from filenames are **provisional**. Source provenance is stored in `data/catalog.seed.json` as `sourceFile`.

## Exact supplied prices (EGP)

| Product type | Options | Prices |
|---|---|---|
| Normal Frames | 20×30, 30×40, 40×50, 50×60, 60×70, 70×80 | 250, 350, 560, 740, 850, 1,020 |
| Neon Anime Art | 65×40, 75×45, 80×45, 90×50, 100×50 | 2,800, 3,250, 3,820, 4,120, 4,530 |
| Neon Car Frames | 30×40, 40×50, 50×60, 60×80 | 675, 825, 980, 1,190 |
| Canvas Prints | 30×40, 40×60, 50×70, 60×90, 70×100, 80×100, 60×120, 100×150, 100×200 | 600, 900, 1,100, 1,300, 1,500, 1,600, 1,800, 2,200, 2,600 |
| Laptop Sleeves | 12in, 13in, 14in, 15.6in, 17in | 500, 500, 600, 600, 600 |
| Laptop Sleeve optional strap | Add-on | +100 |
| Acrylic Coasters | 10×10 cm | 200 |
| Mouse Pads | Standard | 250 |
| Flags | 100×50, 150×100 | 450, 600 |

The original spreadsheet wording, typo variants and long English marketing descriptions were preserved in substance; options and numbers were normalized for variant models. Arabic category-level descriptions were authored for the application because none were supplied. No real design-specific Arabic copy was provided.

## Brand audit

Supplied logo is a bright gold crest and type on a deep red/burgundy background. Approximate sampled dominant colors:

- Deep burgundy `#700018`.
- Gold `#f9c900`.
- Light surface `#fffdfb`, neutral dark ink `#26161a`.
- Dark surface `#111013`, elevated dark surface `#1b171b`.

Gold-on-burgundy is high-impact for branding. Body copy should remain ink-on-light or light-on-dark for readability. Verify combinations in automated contrast tests, especially accent labels on dark surfaces.

## Data integrity and legal / merchandising blockers

1. `Acrylic coasters` folder consists of exact duplicates of mouse-pad designs; do not advertise them as coasters without correct photos.
2. `Anime neon coasters` appears to be upright neon-framed anime art; its match to `Neon animation chracters` pricing must be confirmed by the merchant.
3. No inventory quantities or sale counts provided. No genuine Bestseller ranking can be initially asserted.
4. No bundle configurations or discount codes supplied. Empty models are intentional.
5. Category descriptions are available, but individual product titles, gallery ordering, options and translations need merchant review.
6. Some supplied artworks feature recognizable media characters, sports brands, car manufacturers and other third-party IP. Confirm license/rights and permissible product use before any public sales or advertising. Do not assume uploader ownership establishes commercial licensing.
7. Local image storage is temporary. Production should use a reliable image CDN/media store with correctly compressed responsive sizes and upload policy.

**Catalog import is seeded without changing existing records**; use the admin to review/approve. Seed re-runs only insert missing SKUs and categories, preserving admin edits.
