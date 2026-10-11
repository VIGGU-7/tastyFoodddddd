# Foodwise

Mobile-friendly food discovery and barcode assessment website. Source lives in `foodwise/` within the shared workspace.

## Included

- Guest scanning and optional health/taste onboarding; camera decoding uses the browser BarcodeDetector API with manual entry as the fallback.
- One-line Good fit / Limit / Avoid / Not enough information results, plus a separate `/why` explanation screen.
- Open Food Facts lookup, conservative ingredient/allergen checks, per-serving nutrient limits, source-grade precedence, and a 24-hour product cache.
- Account-scoped profiles, ratings, scans, and optional glucose journal using Sites authentication and D1. Guest preferences remain on-device; guests explicitly save their profile after sign-in to transfer it.
- Sourced recipe and restaurant-menu references. Unpublished nutrition stays unknown. Restaurant city filters are curated references, not live nearby availability.
- Taste ranking from cuisine/food preferences and optional 1–5 ratings after users confirm they tried a food. Restrictions take precedence.
- Offline random-forest training pipeline and TypeScript tree inference; see [ml/README.md](ml/README.md).

## Run locally

Requires **Node 22.13+**, npm, and internet access for initial dependency installation.

```sh
npm install
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_foodwise.sql
npm run dev
```

Apply the initial migration only once per local database. For later schema edits, run `npm run db:generate`, review the generated migration, and apply only pending migrations. The initial migration and snapshot were authored locally because drizzle-kit installation was unavailable; reconcile them with the generator before the first production publication.

Local Sites preview uses the starter's mock authentication. Hosted identity is supplied by Sites; do not replace it with client-supplied IDs or deploy the app behind a proxy that accepts arbitrary identity headers. Private publication requires platform sign-in; anonymous access becomes possible only after an explicit audience change. No third-party API key is required for barcode lookup.

```sh
npm test
npm run typecheck
```

## ML status

The checked-in model artifact is **untrained**. No accuracy is claimed. The actual source nutrition grade is used when supplied by Open Food Facts. Running the documented training pipeline generates the model and genuine held-out metrics automatically; rebuild and publish afterward.

Blood glucose readings include value, units, time, and meal context. They are recorded as context, not used to diagnose, generate treatment targets, or predict glucose response. Use your own care-plan nutrient limits. A nutrition grade does not establish food safety.

## Data and privacy

Accounts use the platform identity as the owner of every personal database record; request bodies cannot select another account. Health fields are optional. Deletion removes the current user's account records and device-local Foodwise records. The shared barcode cache contains only public product data. Personal API responses use `Cache-Control: no-store`.

Recipes link to MedlinePlus/Food Hero, Nutrition.gov, and Illinois Extension; restaurant entries link to official menu references. Verify current ingredients, cross-contact, and serving sizes with the source. Recipe numbers describe the linked formulation and are estimates; photographs are illustrative.

Open Food Facts data is available under [ODbL](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/); retain attribution and applicable share-alike obligations. Product images retain their own licenses. Illustrative discovery photographs link to Unsplash.

## Verification and remaining environment blockers

Behavior tests cover allergy overrides, missing data, serving conversions, taste feedback, glucose validation, account isolation, cache behavior, and lookup failures. Migration SQL is checked against SQLite. All seven application views were rendered using locally available React packages; application TypeScript was checked using cached dependency types.

Full dependency installation and the Vinext production build are blocked in this workspace by unavailable packages and DNS/network restrictions. The active Node version is 20, below the starter's required version. Browser camera QA, real Open Food Facts lookup, training/evaluation, generated migration reconciliation, and hosted deployment remain unverified until these prerequisites are available. Do not interpret the source implementation as a completed production deployment.

The private Site is registered in `.openai/hosting.json`. Source synchronization was attempted but failed because `git.chatgpt-team.site` could not be resolved. Reuse that existing project ID when resuming; do not create another Site.
