# Árvore da Família Dembogurski

Arquivo familiar colaborativo para o Encontro da Família Dembogurski, com árvore genealógica, cinco ramos coloridos, perfis com fotos e uma vista de mapa por coordenadas.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/arvore-dembogurski/src/` — web interface, tree and map views
- `artifacts/arvore-dembogurski/apache/` — deployable PHP/MySQL package and generated static web files
- `artifacts/arvore-dembogurski/apache/schema.sql` — MariaDB/MySQL schema and five seeded family branches
- `artifacts/arvore-dembogurski/apache/api.php` — tree, person, photo and location endpoints
- `artifacts/arvore-dembogurski/scripts/package-apache.mjs` — assembles the web build for Apache

## Architecture decisions

- The interactive interface is built with React/Vite; `build:apache` produces `index.html`, `app.js` and `styles.css` for the PHP installation.
- The Apache deployment uses PHP 8.x, PDO and MariaDB/MySQL. API and uploaded-photo paths remain relative to support IP/subdirectory hosting.
- Biological parent IDs are independent of the current-spouse relationship. Database columns use `padre_id`, `madre_id` and `conyuge_actual_id`.
- The map stores decimal latitude/longitude on each person and uses OpenStreetMap tiles with attribution.
- Replit's Vite preview uses browser-local demo data; shared persistence is provided by the Apache/MySQL package.

## Product

The family can browse and search the tree, focus a QR-selected branch, record descendants and spouses, upload JPG/PNG portraits, and switch to a geolocated family map. The live view refreshes every 15 seconds; the tree can be printed or exported as SVG.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/arvore-dembogurski run build:apache` to regenerate the Apache web bundle.
- The PHP API currently has no login. Keep it on a trusted event network until access control is added; the tree may contain family photos and location data.
- Replit preview edits are local to the browser and are not shared with Apache/MySQL records.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
