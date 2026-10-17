# Supabase Authentication Setup

The app uses Supabase Auth for customer email/password sign-in and Google
sign-in, and a `public.profiles` row for each account's application role. New
signups always receive the `customer` role. Roles are not taken from
browser-submitted signup fields.

Kitchen staff, couriers and the admin use the app's own local accounts (see
[AUTH.md](./AUTH.md)); create them at `/admin/staff` rather than in Supabase.

## Configure the project

1. Create a Supabase project and enable **Email** under Authentication providers.
   Confirm the project allows passwords of at least six characters.
2. In Authentication URL Configuration, set the local Site URL to
   `http://localhost:3001` and add `http://localhost:3001/**` to Redirect URLs.
3. In Project Settings > API, copy the Project URL and the publishable key
   (the legacy anon key is also accepted).
4. Create `.env.local` in the repository root, next to `package.json`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
   ```

   Never put a Supabase `service_role` key in a `NEXT_PUBLIC_` variable or in
   this application. The app only needs the project URL and public publishable
   key.

5. In the Supabase SQL Editor, run
   [`supabase/migrations/20261017000000_profiles_auth.sql`](./supabase/migrations/20261017000000_profiles_auth.sql).
   It creates the role profile table, row-level security policy, and a trigger
   that creates customer-only profiles for new Auth users. Then run
   [`supabase/migrations/20261017120000_profiles_google_names.sql`](./supabase/migrations/20261017120000_profiles_google_names.sql)
   so Google accounts get their real display name.
6. Restart the app after saving `.env.local`:

   ```powershell
   npm run dev -- --hostname 0.0.0.0 --port 3001
   ```

## Enable Google sign-in

1. In Google Cloud Console, create an OAuth client (type **Web application**).
   Add `https://your-project-ref.supabase.co/auth/v1/callback` as an authorized
   redirect URI.
2. In Supabase, open Authentication > Providers > Google, enable it and paste
   the client ID and secret.
3. In Authentication > URL Configuration, add every origin you use to Redirect
   URLs, for example `http://localhost:3000/**` and your production URL with
   `/**`. The app sends users back to `<current origin>/auth/callback`.

The **Continue with Google** button opens Google's account chooser every time,
so people pick which Google account to use.

## Assign privileged roles (optional)

First create an account through the app's customer registration form and
complete email confirmation if it is enabled. Then, in the Supabase SQL Editor,
promote that account using its email:

```sql
update public.profiles as profile
set role = 'admin'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('admin@example.com');
```

Use `staff` for kitchen accounts or `delivery` for courier accounts. Run one
update per account, replacing the role and email. Check that exactly one profile
was updated. Only trusted project administrators should run these updates;
ordinary signed-in users have read-only access to their own profile and cannot
change their role.

## Passwords and existing local accounts

Customer registration requires passwords of at least 8 characters. Supabase
Auth handles password verification and session tokens for customers.

Accounts in the old local JSON authentication store are not automatically
imported. Users must register with Supabase; existing local order records are
not automatically reassigned to the new Supabase user IDs.
