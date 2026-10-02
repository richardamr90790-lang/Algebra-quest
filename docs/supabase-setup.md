# Setting up accounts (Supabase)

Accounts and synced progress need a free Supabase project. Without one the app still works, saving to the device only.

## 1. Create the project
1. Sign in at https://supabase.com and click **New project**. Any name and region; save the database password somewhere safe.
2. Wait about a minute for it to finish provisioning.

## 2. Create the tables
1. In the project, open **SQL Editor -> New query**.
2. Paste the contents of `supabase/migrations/0001_learners_and_progress.sql` and click **Run**.
3. This creates `learners` and `progress` and turns on row-level security, so each parent can only ever see their own learners.

## 3. Sign-in settings (recommended for a family app)
**Authentication -> Providers -> Email**: for a home setup you can turn **Confirm email** off, so signing up works instantly. Leave it on if you prefer verified addresses (new accounts then confirm by email before signing in).

**Authentication -> URL Configuration**: set **Site URL** to your deployed address (e.g. `https://your-app.vercel.app`).

## 4. Connect the app
Go to **Project Settings -> API** and copy:
- **Project URL**
- **anon / publishable key** (the public one; never use the `service_role` key)

Locally: copy `.env.example` to `.env.local` and paste them in, then `npm run dev`.

On Vercel: **Project -> Settings -> Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then redeploy.

## How it behaves
- Parent signs in, then picks (or adds) a learner on the "Who's playing?" screen.
- Progress saves on the device immediately and uploads a couple of seconds later. If offline, the bar shows "Offline - will sync" and retries.
- Two devices merge instead of overwriting: XP and best streak take the higher value, mastered problems are combined, and a reset made later than another device's last edit wins.
- "Play without an account" keeps the old device-only mode.
