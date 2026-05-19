# GeoGuessr Helper — Backend

NestJS 11 REST API serving GeoGuessr map and filter data. Single `DataModule`.
Runs on port 3001 locally; deployed as Vercel serverless via `api/index.ts`.

## Tech Stack

- NestJS 11 (Express adapter)
- class-validator + class-transformer (DTO validation with `ValidationPipe`)
- tsx (TypeScript executor for scripts and tests)
- Puppeteer (guide crawler)
- **Node.js native test runner (`node:test`) — not Jest**

## API Endpoints

| Method | Path                | Purpose                                                    |
| ------ | ------------------- | ---------------------------------------------------------- |
| GET    | `/api/data/geojson` | World GeoJSON from `../public/countries.geo.json`          |
| GET    | `/api/data/map`     | Full country metadata + server-rendered HTML tooltips      |
| POST   | `/api/data/filter`  | Filter countries by 7 criteria → `{ countries: string[] }` |

## Directory Structure

```
src/
  main.ts                        # Entry point, port 3001
  app-setup.ts                   # CORS + global ValidationPipe config
  modules/data/
    data.controller.ts           # 3 endpoints
    data.service.ts              # Business logic + in-memory filter cache (300 entries, FIFO)
    data.service.test.ts         # Unit tests
    data.controller.e2e.test.ts  # E2E tests (Supertest)
    dto/filter-request.dto.ts    # Validation schema (class-validator)
  data/
    driving-side.ts              # 250+ countries: "left" | "right"
    road-lines.ts                # 180+ countries: RoadLinePattern[]
    geoguessr-countries.ts       # 175 GeoGuessr-supported country names
    country-aliases.ts           # GeoJSON name → data key mappings (18 entries)
    geo-car-helpdesk.ts          # AUTO-GENERATED — do not hand-edit
crawlers/
  crawl-guides.ts                # Stage 1-2: Puppeteer scraper (plonkit.net)
  consolidate.ts                 # Stage 3: Validate + merge per-country JSONs
  extract-guide-data.ts          # Stage 4a: NLP/regex extraction
  append-crawler-data-to-backend-data.ts  # Stage 4b: Append-only merge into src/data/
  data/                          # Generated artifacts — never commit
scripts/
  sync-geocarhelpdesk.ts         # Pulls sibling GeoCarHelpDesk repo → rewrites geo-car-helpdesk.ts
api/
  index.ts                       # Vercel serverless handler
```

## Crawler Pipeline

4-stage pipeline for enriching country data from external guides:

1. **`crawl:guides`** — Puppeteer scrapes guide site sitemap → per-country JSONs in `crawlers/data/`
2. **`consolidate:guides`** — Validates + merges into `countries_master.json`
3. **`extract:guides`** — NLP/regex extracts road lines, camera gens, coverage years, car colors, vehicle types (with confidence scores)
4. **`merge:crawlers`** — Append-only merge into `src/data/road-lines.ts` and `geo-car-helpdesk.ts`

`sync:data` = GeoCarHelpDesk sync + `merge:crawlers`. `sync:data:pull` = git pull on sibling repo + `sync:data`.

Crawler env vars: `GUIDE_SOURCE_BASE_URL` (required), `GUIDE_SOURCE_SITEMAP_URL`, `GUIDE_CRAWL_LIMIT`, `GUIDE_CRAWL_DELAY_MS`.

## Data File Rules

- **`geo-car-helpdesk.ts` is auto-generated** by `sync:data` — hand edits are wiped on next sync. It owns: `euPlateData`, `cameraGenData`, `coverageYearsData`, `carColorData`, `vehicleTypeData`.
- **`crawlers/data/`** outputs are local artifacts — never commit them.
- **`country-aliases.ts`** maps GeoJSON names (e.g. "United States of America") to data keys ("United States") — update if adding countries with diverging names.
- **`road-lines.ts`** is hand-editable and crawler-appendable; it is not overwritten by sync.

## Filter Validation

`dto/filter-request.dto.ts` defines allowed values for all 7 filters via class-validator decorators. `ValidationPipe` is configured with `whitelist: true, forbidNonWhitelisted: true` — unknown fields → 400.

**If adding a new filter value or new filter type:** update the DTO _and_ the corresponding frontend type in `src/types/map-data.ts`.

## Testing

Uses Node.js native test runner (`node:test`), not Jest.

```
pnpm --filter geoguessr-helper-backend test
```

- Unit: `src/modules/data/data.service.test.ts`
- E2E: `src/modules/data/data.controller.e2e.test.ts` (Supertest + NestJS testing module)

## CORS

Allows `http://localhost:3000` + `CORS_ORIGIN` env var + `FRONTEND_URL` env var. Configured in `app-setup.ts`.

## Do NOT

- Hand-edit `geo-car-helpdesk.ts` — `sync:data` will overwrite it
- Commit anything under `crawlers/data/`
- Add filter values without updating both DTO and frontend types
- Write tests using Jest — use `node:test` and `assert` from the standard library
- Import from `dist/` — use `tsx` for all script execution
