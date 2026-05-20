# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Projekt Planer** is a materials planning application for managing projects, materials, and shopping lists with real-time team collaboration. It's a React single-page application backed by Supabase PostgreSQL database.

**Language:** German (UI, data, documentation)  
**Tech Stack:** React 18, Supabase JS SDK, Xlsx library  
**Deployment:** Vercel with Supabase hosting

---

## Architecture

### Core Structure

The app follows a simple component-driven architecture with a custom data hook managing Supabase synchronization:

1. **App.js** (root)
   - Navigation between 5 main views (list, detail, shopping, catalog, archive)
   - State: active view, current project, new project form
   - Passes data & handlers to views via props

2. **useData hook** (src/hooks/useData.js)
   - Single source of truth for `projects[]` and `catalog[]` state
   - Real-time subscriptions to `projects`, `materials`, and `catalog` tables
   - Debounced saves (600ms) to avoid excessive DB writes while typing
   - Optimistic UI updates before async DB operations

3. **lib/supabase.js**
   - Supabase client initialization with env vars
   - CRUD operations for projects, materials, catalog
   - Normalizer/serializer functions (App ↔ DB format conversion)
   - Handles cascading deletes via FK constraints

4. **Components** (src/components/)
   - **UI.js**: Reusable buttons, inputs, selects, badges
   - **ProjectCard.js**: List item with status, priority, deadline
   - **ProjectDetail.js**: Full project editor with material rows and autocomplete
   - **CatalogView.js**: Material database CRUD
   - **ShoppingList.js**: Aggregated shopping list with Excel/PDF/plain text export
   - **ArchiveView.js**: Archived projects with restore/delete

5. **lib/utils.js**
   - Constants: units, statuses, colors (German/design system)
   - Helpers: formatDate, daysUntil, calcCost, applyBuffer, fmtEur

### Data Flow

```
useData hook (state)
  ├─ fetchProjects() + realtime sub → projects state
  ├─ fetchCatalog() + realtime sub → catalog state
  └─ async handlers (addProject, saveProject, archive, etc.)
     └─ updateProject/upsertMaterials (debounced)
         └─ Supabase JS SDK → PostgreSQL

App.js renders current view with projects + catalog
  └─ Views dispatch actions back to useData
     └─ Optimistic state update + debounced DB sync
```

### Database Schema

**Tables:**
- `projects` (UUID PK): name, status, priority, start_date, deadline, notes, buffer, archived, archived_at, created_at, updated_at
- `materials` (UUID PK): project_id (FK→projects, cascade), name, amount, unit, price_per_unit, link, sort_order, created_at
- `catalog` (UUID PK): name, unit, price, link, supplier, created_at, updated_at

**Features:**
- Realtime enabled on all tables via `supabase_realtime` publication
- Auto `updated_at` trigger on projects & catalog
- RLS disabled (open access) for simplicity
- Foreign key cascade deletes projects→materials

---

## Development Setup

### Environment

Create `.env.local` with:
```
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Get these from Supabase → Settings → API.

### Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000, hot reload)
npm start

# Build for production
npm build

# Run tests
npm test
```

---

## Key Patterns & Conventions

### Naming
- **German throughout**: variable names, UI labels, comments all in German
- **camelCase** for JS (e.g., `startDate`, `pricePerUnit`)
- **snake_case** for database columns (e.g., `start_date`, `price_per_unit`)
- **normalizeX/toDbX** for conversion functions

### Styling
- Inline styles (no CSS files)
- Color system via `COLORS` object from utils
- `COLORS.accent` (#2D5A3D, dark green), `COLORS.danger` (red), `COLORS.prio` (orange)
- Typography: DM Sans (body), Playfair Display (headings), loaded from Google Fonts

### Component Patterns
- Functional components + hooks only
- Props for data, callbacks for mutations
- Local state for form editing + debounced save
- No routing library; view switching via state machine in App.js

### Data Sync Strategy
- **Optimistic updates**: UI updates immediately, debounced DB write follows
- **Realtime subscriptions**: All clients see updates within ~1s via Postgres LISTEN/NOTIFY
- **Debounce timers**: 500–600ms per-project save (user typing in detail view)
- **Material order**: Preserved via `sort_order` integer on insert

### Material Autocomplete
- In ProjectDetail, `MatAutoComplete` component filters catalog by name (case-insensitive)
- Selecting a catalog item populates unit, price, link
- No sync constraint: projects can have materials not in catalog

### Shopping List Aggregation
- Materials from active projects (not "Bau" or "Abgeschlossen", not archived)
- Aggregated by `${name.toLowerCase()}|||${unit}` key
- Quantities summed with buffer % applied per project
- Prices filled from catalog if material price missing
- Grouping by supplier or flat list; export to Excel/PDF/plaintext

### Dates
- Input type: `date` (YYYY-MM-DD in UI)
- Stored as `date` column in Postgres
- Display: `formatDate()` → "DD.MM.YYYY"
- Deadlines trigger "days until" hints (red if overdue, orange if ≤7 days)

### Cost Calculations
- `calcCost(material, buffer)` = amount × price_per_unit × (1 + buffer/100)
- Buffer (%) applies to quantities, displayed separately in totals

---

## Common Tasks

### Add a Project Field
1. Add column to `projects` table in `supabase-schema.sql`
2. Update `normalizeProject()` & `toDbProject()` in lib/supabase.js
3. Update state shape in useData hook if needed
4. Add input in ProjectDetail component

### Add a Catalog Feature
- Catalog is simple CRUD: view, add, edit, delete
- CatalogView component handles all UI
- Realtime sync updates ShoppingList automatically

### Change Color Scheme
- Edit `COLORS` object in lib/utils.js
- Update `STATUS_COLORS` for status badges
- Inline styles reference `COLORS.X` throughout

### Modify Shopping List Export
- ShoppingList component has `exportExcel()`, `exportPdf()`, `copyList()`
- Excel: XLSX library, column widths hardcoded
- PDF: Generated as HTML blob, printed via browser print
- Plain text: Tab-separated, copied to clipboard

---

## Testing Notes

No test suite configured. Manual testing checklist:
- Create/edit/delete projects and materials
- Verify debounced saves (wait 600ms, check Supabase dashboard)
- Test realtime: open app in 2 browsers, change data in one, see live update in other
- Export shopping list (Excel, PDF, plaintext)
- Archive and restore projects
- Material autocomplete with catalog matching

---

## Deployment

Via Vercel:
1. Connect GitHub repo
2. Set env vars: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
3. Deploy
4. Share URL with team

Vercel auto-deploys on push to main branch.

---

## Notes for Future Development

- **No auth**: All users see all data. Add Supabase Auth + RLS for multi-tenant
- **No offline**: Always requires DB connection
- **No search/filter**: Projects list sorts by priority + deadline; consider adding filter by status
- **No undo**: Deletes are permanent (soft delete via `archived` flag exists but permanent delete button still present)
- **Keyboard shortcuts**: None implemented; consider adding for power users
