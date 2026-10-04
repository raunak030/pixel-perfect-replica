# CardVault — Visiting-card manager

Photograph a visiting card → review the extracted details → save → search, call, email, WhatsApp, map.
Nothing from OCR is ever saved without your confirmation.

## Stack

- React 19 + TanStack Start (file-router) + TypeScript — spec asked for Next.js; this repo ships the
  equivalent production React stack already wired to Lovable Cloud (Vite + SSR + file routes).
  All product requirements below are implemented on this stack.
- Tailwind CSS 4 + shadcn/ui + Lucide
- Supabase: Postgres, Auth, Storage (`cards` bucket), Row Level Security
- OCR behind a replaceable `OcrProvider` interface (`src/lib/ocr/`), mock mode when unconfigured

## Pages

| Route | Page |
|---|---|
| `/` | Marketing landing (redirects to dashboard when signed in) |
| `/auth` | Login — email/password + Google OAuth |
| `/dashboard` | Stats (cards, contacts, companies, needs review), global search, Scan CTA, recent contacts |
| `/contacts` | Instant search (name, company, mobile, email, city, designation, category, event, notes) + filters (category, company, city, event, date added, date met) + CSV/Excel/vCard export |
| `/contacts/$id` | Contact profile: call, WhatsApp, email, website, LinkedIn, Google Maps, edit, delete, original card image |
| `/scan` | Single-card upload: drag-drop, file picker, mobile camera capture, preview, Extract → editable review form → duplicate check → save |
| `/bulk` | Multi-image import (up to 500): progress `done / total`, per-card status (Queued / Processing / Extracted / Needs review / Failed), worker-pool of 3 so the UI never blocks |
| `/companies` | Companies derived from contacts + `companies` table, with contact counts |
| `/categories` | Default + custom categories with counts |
| `/settings` | OCR mode notice + category management |

## Run locally

```sh
npm i
npm run dev
```

App runs on the Vite dev server (see terminal output, typically http://localhost:5173).

## Configure Supabase

1. Create a project at https://supabase.com.
2. Copy `.env.example` to `.env` and fill `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
   (plus the `VITE_` twins for client code).
3. Apply the schema:

```sh
# option A — Supabase CLI
supabase db push
# option B — paste supabase/migrations/0001_cardvault.sql into the Supabase SQL editor
```

This creates `contacts`, `companies`, `scan_records`, `categories`, the private `cards`
storage bucket, indexes for search fields, `updated_at` triggers, and RLS so a user
only ever sees their own rows/images.

4. Auth: email/password works out of the box. For Google sign-in, enable the Google
   provider in Supabase Auth (the UI calls `lovable.auth.signInWithOAuth("google", …)` on
   Lovable hosting; on self-host use `supabase.auth.signInWithOAuth({ provider: "google" })`).

## Configure OCR

`src/lib/ocr/providers.server.ts` exports `getOcrProvider(): OcrProvider`.

- Default: `mockProvider` returns clearly-labelled **sample data** (banner: “Practice mode”)
  so the whole app is testable with no keys.
- To connect a real API: implement `OcrProvider { name, extract({imageBase64, mimeType}) → OcrResult }`,
  return it from `getOcrProvider()` when `OCR_PROVIDER` is set, and add keys to `.env`
  (`OCR_API_KEY`, `OCR_ENDPOINT`). The server function `extractCard`
  (`src/lib/ocr/ocr.functions.ts`) validates auth + MIME type and stays unchanged.

`OcrResult` shape:

```ts
{ provider, mock, raw_text, confidence, data: {
  full_name, designation, company_name, mobile, alternate_mobile, email,
  whatsapp, website, linkedin, address, city, state, country, pincode, notes } }
```

## Database migrations

- Canonical SQL: `supabase/migrations/0001_cardvault.sql` (`supabase db push` or SQL editor).
- `drizzle/migrations/0000_migration.sql` mirrors the same schema for the Drizzle toolchain.

## Deploy

Vercel (or any Node host):

```sh
npm run build
```

Deploy the build output. Set the same env vars (`SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_*`, optional `OCR_*`) in the host dashboard.
No Lovable history is rewritten — push to the connected branch and Lovable syncs.

## How bulk processing works

`src/routes/_authenticated/bulk.tsx`:

1. Files are validated client-side (JPG/PNG/WEBP, ≤10 MB, ≤500).
2. Optional bulk defaults (event/source, date met, category) attach to every card.
3. `Start import` runs a worker-pool (`CONCURRENCY = 3`): each worker loops
   `extract → upload to Storage → insert contact (needs_review when mock/low-confidence/
   nameless) → insert scan_record`, updating per-card status without blocking the UI.
4. Progress is `done / total` + a progress bar; `Stop` sets a flag workers check between cards.
5. Each finished row links to its contact for review. Expansion path: move `processOne`
   into a background queue (e.g. Supabase Edge Function + pg-boss) — the status enum and
   `scan_records` log already support it.

## Environment variables

| Var | Used where | Required |
|---|---|---|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | server / client Supabase | yes |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | server / client Supabase | yes |
| `OCR_PROVIDER` | `getOcrProvider()` switch | no (mock otherwise) |
| `OCR_API_KEY`, `OCR_ENDPOINT` | your future provider | no |

## Error handling

Invalid image type/size, extraction failure (falls back to manual entry), missing name
(blocks save), duplicates (dialog: View / Merge / Save anyway), network/DB/auth failures —
all surface as `sonner` toasts with actionable text, never silent.

## Project layout

- `src/routes/` — pages (TanStack file router)
- `src/components/` — `AppShell`, `ContactForm`, `ContactRow`, `DuplicateDialog`, `ui/`
- `src/lib/contacts.ts` — Supabase queries (kept out of components)
- `src/lib/export.ts` — CSV / Excel-SpreadsheetML / vCard
- `src/lib/ocr/` — `types.ts`, `ocr.functions.ts` (server fn), `providers.server.ts`
- `src/integrations/supabase/` — client + auth middleware + generated `Database` types
