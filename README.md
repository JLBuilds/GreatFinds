# GreatFind

Every restaurant anyone's ever recommended to you — saved, mapped, and ready
for "where should we eat?"

A mobile-first PWA (install it from Safari/Chrome like an app) shared by an
invite-only group of friends & family. Built on the same foundation as Groove:
Next.js App Router + Supabase (auth, Postgres with RLS) + Tailwind, deployed
on Vercel. Restaurant lookup and the map are powered by Google Maps Platform.

## Features

- **Add a place** — search Google (Places autocomplete) and the name, address,
  cuisine, price and location fill in automatically; or enter manually.
- **Shared list** — everyone in the group sees every place, attributed to
  whoever added it, with search and status filters.
- **Map** — every saved place pinned, colour-coded: want to try / been /
  favourite.
- **Invite-only** — admins invite by email; strangers can request access.

## Setup

1. **Supabase**: create a project, then run
   `supabase/migrations/0001_initial_schema.sql` in the SQL editor.
2. **Google Maps Platform**: create an API key with **Maps JavaScript API**
   and **Places API (New)** enabled.
3. Copy `.env.example` to `.env.local` and fill everything in.
4. `npm install && npm run dev`

### First account

Signup is invite-gated, so bootstrap the first user (you) manually:
Supabase Studio → Authentication → Add user (email + password, auto-confirm).
Make sure that email is in `ADMIN_EMAILS` — then invite everyone else from
the app at `/you/invites`.

## Deploy

Deployed on Vercel. Set the env vars from `.env.example` in
Project → Settings → Environment Variables, then redeploy.
