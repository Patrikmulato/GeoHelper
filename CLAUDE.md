@AGENTS.md

## Quick Reference

- Next.js 16 App Router + TypeScript + Tailwind v4
- Leaflet map loaded client-side only (`next/dynamic`, `ssr: false`)
- NestJS backend in `backend/` is source of truth for map/filter data
- API routes: `GET /api/data/geojson`, `GET /api/data/map`, `POST /api/data/filter`
- Build frontend: `pnpm build` | Dev frontend: `pnpm dev`
- Build backend: `pnpm build:backend` | Dev backend: `pnpm dev:backend`
- Backend tests: `pnpm --filter geoguessr-helper-backend test`
- Guide crawler: `pnpm --filter geoguessr-helper-backend crawl:guides`
- Consolidate crawler data: `pnpm --filter geoguessr-helper-backend consolidate:guides`
- Extract structured crawler data: `pnpm --filter geoguessr-helper-backend extract:guides`
- Merge extracted missing data into backend datasets: `pnpm --filter geoguessr-helper-backend merge:crawlers`
- `pnpm --filter geoguessr-helper-backend sync:data` regenerates GeoCarHelpDesk data and then reapplies the crawler append-only merge
