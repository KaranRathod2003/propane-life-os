# LifeOS

A mobile-first **Progressive Web App** for managing your personal life — **Expenses**, **Habits**, and a **Journal** — with a calm, bento-grid dashboard. Built single-user today, architected to grow into a multi-user product (every row is scoped by `user_id` with Supabase Row Level Security).

- **Stack:** Vite + React 18 + TypeScript, Tailwind + shadcn/ui, Supabase (auth + Postgres), TanStack Query, Zustand, React Router, Recharts, date-fns
- **Locale:** Indian Rupees (₹), `en-IN` number grouping (e.g. ₹26,129), `Asia/Kolkata` timezone
- **PWA:** installable on Android, offline app-shell caching (data needs network for v1)

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the project's **SQL Editor** → **New query**.
3. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and **Run**. This creates all tables, indexes, RLS policies, and a trigger that seeds your starter habits on first sign-up.
4. (Recommended) Run the schema **before** you create your account, so the habit-seed trigger fires for your user. If you already signed up, you can simply add habits from the Habits tab.
5. **Email auth:** under **Authentication → Providers → Email**, ensure Email is enabled. For the fastest solo setup you may turn **"Confirm email"** off (Authentication → Sign In / Providers) so you can log in immediately.

### Where to find your keys

**Project Settings → API**:

- `VITE_SUPABASE_URL` → **Project URL**
- `VITE_SUPABASE_PUBLISHABLE_KEY` → the **anon / publishable** key (safe to ship to the browser — RLS protects your data)

---

## 2. Configure environment

```bash
cp .env.example .env
```

Then edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
```

---

## 3. Run locally

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). Sign up, then sign in.

Other scripts:

```bash
npm run build      # type-check + production build to /dist
npm run preview     # serve the production build locally
npm run gen:icons   # regenerate the placeholder PWA icons in /public
```

### Installing as a PWA (Android)

Open the app in Chrome on Android → menu → **Install app** / **Add to Home screen**. It launches standalone with the LifeOS icon. (PWA install is most reliable when served over HTTPS, i.e. after deploying.)

---

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com), **New Project → Import** the repo. Vercel auto-detects Vite:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Add **Environment Variables** (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. **Deploy.**

> SPA routing: a [`vercel.json`](./vercel.json) rewrite sends all paths to `index.html` so deep links like `/expenses` work on refresh.

In Supabase, add your Vercel URL under **Authentication → URL Configuration → Site URL / Redirect URLs**.

---

## How the money works (no AI, pure logic — it's a bank ledger)

The app is a **manual ledger that mirrors your real bank account** (no bank login — you keep it in sync by logging spends).

- **Opening balance:** after salary credits, you enter your **real bank balance** (post-credit). That's the anchor.
- **Transactions** deduct from it: every expense / lent / repayment lowers the balance; income raises it. **What's Left** (the hero number) = `opening balance + income in − money out`, i.e. it should equal your bank.
- **Plan buckets** are estimates (Food, Rickshaw, Medical…). They don't deduct anything — they're your forecast. You tag real spends to a bucket to see **spent vs estimate**.
- **Projected savings** = `What's Left − money still planned to spend`. **Yours to waste** = `projected savings − saving target`.
- **Saving target is a floor.** When projected savings dip **below** it, the app turns **red** — the over-budget buckets and the transactions that broke them get flagged with the exact rupee damage. It highlights, never preaches.

---

## Project structure

```
src/
  components/
    ui/            # shadcn/ui primitives (button, card, sheet, slider, …)
    layout/        # AppLayout, BottomNav, ProtectedRoute, ThemeToggle
    common/        # PageHeader, EmptyState, ErrorState, ProgressRing
  features/
    auth/          # AuthProvider, LoginPage
    dashboard/     # bento-grid home
    expenses/      # api, hooks, computations (safe-to-spend), QuickAdd, charts
    habits/        # api, hooks, streak/heatmap logic, daily checklist
    journal/       # api, hooks, entries + goals
  lib/             # supabase client, format (₹), date (IST), utils, queryClient
  stores/          # Zustand UI store (theme, selected month, quick-add sheet)
  types/           # shared TypeScript models
supabase/
  schema.sql       # tables + RLS + habit seed trigger
```

---

## Roadmap toward multi-user

The data model is already multi-tenant: every table carries `user_id` and an `owner_all` RLS policy. To productise: add profiles/onboarding, optional email confirmation + password reset flows, and offline-first sync (queue mutations locally and reconcile) — the app shell already caches via the service worker.
