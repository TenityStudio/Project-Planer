# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Projekt Planer** is a materials planning application for managing projects, materials, and shopping lists with real-time team collaboration. React SPA backed by Supabase PostgreSQL.

**Language:** German (UI, variable names, comments, documentation)  
**Tech Stack:** React 18, Supabase JS SDK v2, lucide-react (icons), xlsx  
**Deployment:** Vercel (auto-deploys on push to `main`) + Supabase hosted DB

---

## Commands

```bash
npm install       # install deps
npm start         # dev server at http://localhost:3000
npm run build     # production build
npm test          # run tests (no test suite configured)
```

**Environment:** Create `.env.local` with:
```
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

**DB setup:** Run `supabase-schema.sql` in Supabase → SQL Editor → New Query.

---

## Architecture

### Data layer

`src/hooks/useData.js` is the single source of truth. It:
- Loads `projects[]` (with nested `materials[]`) and `catalog[]` on mount
- Subscribes to realtime Postgres changes on all three tables
- Exposes handlers: `addProject`, `saveProject`, `removeProject`, `archive`, `restore`, `duplicate`, `addCatalogItem`, `saveCatalogItem`, `removeCatalogItem`
- `saveProject` is debounced 600ms per project — updates state immediately (optimistic) then writes to DB

`src/lib/supabase.js` contains all Supabase calls plus normalizer (`normalizeX`) and serializer (`toDbX`) functions that convert between DB snake_case and app camelCase. **Important:** `amount` and `pricePerUnit` on materials are stored as **strings** in app state (normalized that way so inputs work directly). Parse before arithmetic.

`upsertMaterials` uses a **delete-all-then-reinsert** strategy (not a real upsert) — deletes all rows for a project then inserts fresh ones. This means `sort_order` is always the array index at save time.

### View layer

`src/App.js` is a state-machine router with 5 views: `list | detail | shopping | catalog | archive`. No routing library — `view` state + `activeId` switch which component renders.

All views receive data and callbacks as props from App. No context, no state management library.

### Styling

All inline styles, no CSS files. Color system via `COLORS` and `STATUS_COLORS` objects in `src/lib/utils.js`. Typography: DM Sans (body) + Playfair Display (headings) via Google Fonts loaded inline in App.js.

---

## Key Patterns

### Naming
- German variable names, UI labels, and comments throughout
- JS: `camelCase`; DB columns: `snake_case`
- Converters named `normalizeX` (DB→app) / `toDbX` (app→DB)

### Adding a project field
1. Add column to `supabase-schema.sql` and run it in Supabase
2. Update `normalizeProject()` and `toDbProject()` in `src/lib/supabase.js`
3. Add input in `src/components/ProjectDetail.js`

### Project list sort order
Priority flag first → deadline ascending → name alphabetical (German locale `'de'`).

### Shopping list aggregation
Includes only non-archived projects **excluding** status `"Bau"` and `"Abgeschlossen"`. Aggregates by `${name.toLowerCase()}|||${unit}` key, sums quantities with per-project buffer applied, fills missing prices from catalog. Exports via XLSX library (Excel), HTML blob printed as PDF, or tab-separated clipboard text.

### Cost calculation
`calcCost(mat, buffer)` = `applyBuffer(amount, buffer) × pricePerUnit`  
`applyBuffer(amount, buffer)` = `amount × (1 + buffer/100)`

### Material autocomplete
`MatAutoComplete` in ProjectDetail filters catalog by name (case-insensitive). Selecting an item fills unit, price, link. No enforcement — project materials and catalog are independent.

### Dates
Stored as `date` column (YYYY-MM-DD). Displayed via `formatDate()` → `DD.MM.YYYY`. Deadline proximity shown as colored badge (red = overdue, orange = ≤7 days).

---

## Database Schema

- `projects`: id, name, status, priority, start_date, deadline, notes, buffer, archived, archived_at, created_at, updated_at
- `materials`: id, project_id (FK→projects cascade delete), name, amount, unit, price_per_unit, link, sort_order, created_at
- `catalog`: id, name, unit, price, link, supplier, created_at, updated_at

Realtime enabled on all tables. `updated_at` auto-trigger on `projects` and `catalog`. RLS disabled (open access).
