# Create Event on Profile — What Actually Matters

## In the app (after latest changes)

1. **Log in** (any way).
2. Open **Profile** (bottom nav).
3. You should **always** see **Create Event**:
   - Under your name / university, and  
   - Again next to the **Upcoming / Attended** tabs.
4. **First time** on a demo login (`user_…` id): the first click **turns on “organization hosting”** in the background (saved in `localStorage`) **and** opens the form. You don’t have to hunt for a checkbox anymore.

If you still don’t see the buttons, hard-refresh the app (`Cmd+Shift+R`) so you’re not on an old bundle.

---

## If you want Supabase to treat you as a real org (UUID, RLS, tickets)

1. **Authentication → Users**  
   Sign in with that email/password on the login screen (not only mock login).

2. **`public.users`** row for that user’s UUID  
   Set `is_organization = true` (and `full_name` = org name, `university`, etc.).

   **Or** a row in **`organizations`** with either:
   - `user_id` = that user’s UUID, or  
   - `email` = same email as Auth.

3. **RLS** must allow that user to `SELECT` their `users` row and matching `organizations` rows (otherwise the app can’t confirm org status from the DB).

Demo ids like `user_123…` **cannot** be used as `registrations.user_id` in Postgres (UUID column) — that’s expected; use real Auth for tickets/registrations.

---

## Quick reference

| Goal | What to do |
|------|------------|
| See **Create Event** on Profile | Open Profile — buttons are always shown; click to open the modal. |
| Demo org without Supabase | First click enables hosting + opens modal (persisted in `localStorage`). |
| Full Supabase org | Auth sign-in + `users.is_organization` or `organizations` row linked to your UUID. |
