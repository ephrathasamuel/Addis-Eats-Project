# Supabase Authentication Setup

The app uses Supabase Auth for email/password sign-in and a `public.profiles`
row for each account's trusted application role. New signups always receive the
`customer` role. Roles are not taken from browser-submitted signup fields.

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
   that creates customer-only profiles for new Auth users.
6. Restart the app after saving `.env.local`:

   ```powershell
   npm run dev -- --hostname 0.0.0.0 --port 3001
   ```

## Assign privileged roles

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

Sign-in and customer registration accept passwords from 6 to 256 characters.
Six-character passwords are weak; choose a longer, unique password when
possible. Supabase Auth handles password verification and session tokens.

Accounts in the old local JSON authentication store are not automatically
imported. Users must register with Supabase; existing local order records are
not automatically reassigned to the new Supabase user IDs.
