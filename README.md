# Pawfect Match

Dating app for dog owners. React + TypeScript + Vite web app with a Supabase backend, packaged for iOS/Android via Capacitor.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind, shadcn/ui
- **Backend:** Supabase (Postgres + RLS, Auth, Realtime, Edge Functions)
- **Mobile:** Capacitor 8 (iOS + Android)

## Local development

```sh
npm install
npm run dev        # http://localhost:8080
```

Requires a `.env` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

## Production build

```sh
npm run build      # outputs to dist/
```

## iOS build (requires macOS + Xcode)

```sh
npm run build
npx cap add ios    # first time only
npx cap sync ios
npx cap open ios   # opens Xcode; sign & run from there
```

## Backend

Database migrations live in `supabase/migrations/`, edge functions in `supabase/functions/`. Managed via the Supabase CLI against project defined in `supabase/config.toml`.
