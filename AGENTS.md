<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# GeoGuessr Helper — Agent Instructions

## Project Overview

A Next.js web app that helps players identify countries in GeoGuessr by visualizing geographic clues (driving side, road line markings, etc.) on an interactive Leaflet world map with filter toggles.

## Requirements

- **Node.js 22+** (`.nvmrc`, `.node-version`, `package.json` engines)
- pnpm 10.10.0+

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Map:** Leaflet + react-leaflet (loaded client-side via `next/dynamic` with `ssr: false`)
- **Backend:** NestJS 11 API in `backend/`
- **Package manager:** pnpm workspace
- **Path alias:** `@/*` → `./src/*`

## Project Structure

```
src/
  app/              # Next.js App Router pages and layouts
    layout.tsx      # Root layout
    page.tsx        # Main page — full-screen map with filter bar
    globals.css     # Global styles + Leaflet tooltip overrides
  components/       # Reusable React components
    WorldMap.tsx    # Leaflet map component (client-only)
    FilterDropdown.tsx  # Generic filter dropdown (grouped options, smart positioning)
  config/           # App configuration (API base URL, env vars)
  lib/api/          # API client + typed API wrappers
  types/            # Shared TypeScript contracts for API payloads
backend/
  crawlers/         # External guide scraping, consolidation, extraction, and merge scripts
  src/
    modules/data/   # GeoJSON/map/filter endpoints + DTO + service
.claude/
  commands/         # Project slash commands (see below)
  rules/            # Context-aware agent rules loaded by file glob
  settings.json     # Pre-allowed commands + hooks
public/
  countries.geo.json  # World boundaries source read by backend
```

## Claude Commands

Invoke these with `/command-name` in Claude Code:

| Command         | Purpose                                                             |
| --------------- | ------------------------------------------------------------------- |
| `/crawl`        | Run the full 4-stage crawler pipeline                               |
| `/sync-data`    | Sync GeoCarHelpDesk repo and regenerate `geo-car-helpdesk.ts`       |
| `/add-country`  | Guided flow to add a new country across all data files              |
| `/check-filter` | Verify backend DTO and frontend types are in sync for all 7 filters |

## Commands

| Command                                                     | Purpose                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                                                  | Start Next.js dev server                                       |
| `pnpm dev:backend`                                          | Start NestJS backend                                           |
| `pnpm build`                                                | Build frontend                                                 |
| `pnpm build:backend`                                        | Build backend                                                  |
| `pnpm test`                                                 | Run frontend tests                                             |
| `pnpm test:coverage`                                        | Run frontend tests with coverage                               |
| `pnpm --filter geoguessr-helper-backend test`               | Run backend tests                                              |
| `pnpm --filter geoguessr-helper-backend crawl:guides`       | Scrape country guide data                                      |
| `pnpm --filter geoguessr-helper-backend consolidate:guides` | Build consolidated crawler dataset                             |
| `pnpm --filter geoguessr-helper-backend extract:guides`     | Generate structured extracted crawler data                     |
| `pnpm --filter geoguessr-helper-backend merge:crawlers`     | Append missing extracted data into backend data files          |
| `pnpm --filter geoguessr-helper-backend sync:data`          | Regenerate GeoCarHelpDesk data and reapply crawler append step |

## CI/CD

The project uses GitHub Actions for continuous integration. The CI workflow (`.github/workflows/ci.yml`) runs on pull requests and pushes to main, performing:

- Dependency installation
- Frontend linting
- TypeScript type checking (frontend and backend)
- Backend build and testing
- Frontend testing with coverage reporting
- Frontend build
- Coverage upload to Codecov

All checks must pass for auto-merge to be enabled.

## Git Hooks (Husky)

The project uses Husky to enforce code quality, formatting, and testing at key git stages:

### Pre-Commit Hook

Runs on every commit attempt:

1. **TypeScript type checking** on `.ts`/`.tsx` files (`tsc --noEmit`)
2. **ESLint** auto-fixes style issues on changed code
3. **Prettier** formats code and JSON/CSS/Markdown files
4. **Jest** runs related tests in `--bail` mode (stops on first failure)

If any check fails, fix the issues and re-stage before retrying the commit.

### Commit Message Hook

Validates commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

Example: feat(filters): add new driving side filter
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

### Pre-Push Hook

Runs before pushing to remote:

1. Type checking for frontend and backend
2. Full test suite (not just related tests)
3. Frontend build validation

Prevents pushing code that doesn't compile or has failing tests.

### Bypass Hooks (Not Recommended)

- Commit only: `git commit --no-verify`
- Push only: `git push --no-verify`

## Key Conventions

2. **Backend-owned data/filtering** — API is source of truth for map data and filter results:

- `GET /api/data/geojson`
- `GET /api/data/map`
- `POST /api/data/filter`

3. **Validation** — Filter payload validation is defined in `backend/src/modules/data/dto/filter-request.dto.ts`.
4. **Tooltip ownership** — Tooltip HTML is composed server-side and delivered in `tooltipHtmlByCountry`.
5. **Frontend responsibilities** — UI state, map rendering, and API orchestration only.
6. **Styling** — Use Tailwind utility classes. Dark theme is the default. Custom CSS goes in `globals.css` only when Tailwind can't cover it.
7. **Crawler outputs are generated artifacts** — Files under `backend/crawlers/data/` are local/generated and should not be committed.
8. **GeoCarHelpDesk sync behavior** — `backend/src/data/geo-car-helpdesk.ts` is regenerated by `sync:data`; crawler-derived append-only data is reapplied automatically after every sync.
9. **Crawler source config** — `crawl:guides` reads `GUIDE_SOURCE_BASE_URL` and optional `GUIDE_SOURCE_SITEMAP_URL`, `GUIDE_CRAWL_LIMIT`, and `GUIDE_CRAWL_DELAY_MS` from env.

## Do NOT

- Bypass backend for map/filter data (frontend should call API wrappers in `src/lib/api/map-data.ts`)
- Use Leaflet on the server — always gate behind `"use client"` and dynamic import
- Install map tile providers that require API keys without asking first
- Commit generated crawler output from `backend/crawlers/data/`
- Hand-edit `backend/src/data/geo-car-helpdesk.ts` without considering that `sync:data` will regenerate it
