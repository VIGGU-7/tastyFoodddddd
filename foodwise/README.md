# Foodwise

A Next.js App Router application with a React interface and Node backend. Guests can scan products, see an A–E nutrition score and one-line assessment, and open a separate explanation. Personal recommendations, profiles, ratings, and journal records require a signed-in account.

## Run

Use **Node 22.13 or newer** (Node 22.23.3 was validated).

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. If another development server occupies that port, stop it or use `npm run dev -- --port 3001`.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

The database is initialized automatically at `data/foodwise.sqlite`. Set `FOODWISE_DATABASE_PATH` to an absolute path to use a different persistent disk. No API key is needed for Open Food Facts lookup. HTTPS is required for cameras outside localhost; manual barcode entry always remains available.

## Structure

```text
src/
  app/                  Next.js pages, layouts, and focused API routes
  components/
    layout/             Responsive app shell and navigation
    ui/                 Shared controls, feedback, and accessible dialogs
  features/
    auth/               Sign-in and registration
    discovery/          Overview, 3D food scene, cards, and recommendations
    scanner/            Barcode interface and camera lifecycle
    profile/            Three-step preferences and account controls
    journal/            Scans, taste notes, and glucose journal
    nutrition/
      domain/           Assessment rules, catalog, model, and data normalization
  server/
    db/                 SQLite initialization
    repositories/       Account-scoped persistence and public product cache
    services/           Authentication, sessions, scanning, and recommendation logic
    http/               Request limits, validation errors, and response helpers
  shared/               Typed API contracts and client
  styles/               Theme, feature styles, motion, responsive layout, accessibility
ml/                     Offline training pipeline, metrics, and provenance
public/                 Public assets
```

## Access and data

Passwords are salted and hashed with scrypt. Sessions use random tokens; only token hashes are stored in SQLite. Cookies are HttpOnly, SameSite=Lax, and Secure for HTTPS requests. Login attempts are rate limited by account identifier. Every personal query uses the authenticated account owner. Request bodies cannot select another owner. Deleting an account cascades to its sessions and personal records.

Guests receive general nutrition information and no personal recommendations. `/recommendations`, `/profile`, and `/journal` enforce authentication on both the server pages and APIs. Public barcode data is cached for 24 hours. Personal API responses use `Cache-Control: no-store`.

Use a Node hosting environment with a persistent writable disk and HTTPS. This application is no longer a Vite/Vinext or Cloudflare D1 build. The previous Sites registration remains local and excluded from Git. Do not deploy this SQLite setup to ephemeral serverless storage without changing the repository adapter.

## Nutrition model

The preliminary random forest was trained on **1,479 real Open Food Facts products**, using 2023 nutrition-grade labels. Held-out accuracy is **75.0%** on 156 products; macro F1 is **0.640**, compared with **46.8%** majority-class accuracy. The brand/category groups are separate across 938 training, 385 validation, and 156 test products.

The data is a biased prefix sample of a public export. Grade B F1 is only 0.261 on 11 examples. Metrics describe nutrition-grade agreement, not clinical safety. Source grades take precedence; missing numeric inputs produce no estimate. See [ml/README.md](ml/README.md), `ml/metrics.json`, and `ml/snapshot.json`.

Recipes and menu references link to their primary sources. Unknown nutrition stays unknown. Restaurant entries are curated references, not live nearby availability. Glucose readings are optional context and do not predict glucose response or establish food safety.

Open Food Facts data is attributed under [ODbL 1.0](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/). Retain applicable attribution and share-alike obligations. Product images retain their licenses; other food photographs are illustrative Unsplash images.

## Local verification and Git hygiene

Tests and browser QA scripts are kept locally in `tests/` and excluded from Git, as requested. Test artifacts, databases, downloaded datasets, credentials, environment files, dependency folders, and generated builds are also ignored. The model parity fixtures are local-only; the training script regenerates them.

Local tests can be run with `npm test` when the ignored test directory is present. A fresh GitHub clone contains the application and training source, not local QA files. No GitHub push has been performed.

## Validation

The Next.js production build, TypeScript checks, and ESLint pass. API and browser flow checks were also run against the production server. Local verification includes 22 nutrition/model checks, 27 live API integration checks, and 25 browser flow checks. The browser flows exercise guest scoring, a separate explanation, sign-up/sign-in, onboarding, allergy exclusions, search, ratings, saved scans, glucose records, sign-out, and deletion.

Desktop and mobile layouts were inspected, including 320px and 390px widths. Automated accessibility checks cover public/member pages, preference steps, and the journal dialog; keyboard focus containment and reduced-motion behavior are checked. Camera permission-denied recovery is verified; physical camera/barcode capture still needs a real device. See [architecture and HCI decisions](docs/architecture.md).
