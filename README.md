# Cardwise Reward Compass

Cardwise is a personal finance and credit card companion for tracking monthly spending, budgets, statement balances, payment dates, reward points, and verified reward estimates. The app is built with React, TypeScript, Vite, and Supabase.

## Local preview

Use Node.js 22.12 or newer.

```powershell
npm install
npm run dev
```

Without Supabase settings, the development server opens a clearly marked, fictional preview workspace stored in this browser. It contains no real account, and its sample transactions and budgets are not uploaded. A production build without Supabase settings shows a setup screen instead of the preview.

## Connect Supabase

1. Create or select the Supabase project for this app. Before applying the migration to an existing project, inspect its current schema and data.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and publishable key. These are build-time client settings. Do not put the service role key in a `VITE_` variable or commit it.
3. Install and authenticate the Supabase CLI, link the intended project, review the migration plan, and apply `supabase/migrations/202610250001_core.sql`:

   ```powershell
   supabase login
   supabase link --project-ref hypqxmyhktewycnqluol
   supabase db push
   supabase functions deploy delete-account
   ```

   `db push` changes the linked database. Review the linked project and pending migrations first. The target project has not been inspected or migrated from this workspace.
4. Configure your hosting provider with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then build and deploy the generated `dist` folder. The service role key belongs only in trusted server environments. Supabase Edge Functions provide the account deletion endpoint; its service role access is server-side.

## Catalogue and demo data

The migration seeds default categories and four issuer-identified card entries. It does not seed reward rates, fees, or benefit claims. The source CSV's `Primary Benefit` claims are deliberately excluded until each claim is checked against current issuer terms. Reward estimates remain unavailable until verified rules are added.

To import the CSV candidates, set the project URL and service role key in a private PowerShell session. The script checks the target project reference and requires an explicit import flag. By default, it reads `indian_credit_cards_list.csv` from the parent project folder; pass a different file path as the first argument when needed.

```powershell
$env:CARDWISE_PROJECT_REF = 'hypqxmyhktewycnqluol'
$env:CARDWISE_IMPORT_CATALOGUE = 'YES'
$env:SUPABASE_URL = 'https://hypqxmyhktewycnqluol.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service role key>'
npm run catalogue:import
```

The demo provisioning script creates two separate fictional accounts and synthetic records. Set distinct, unused demo email addresses in `DEMO_USER_A_EMAIL` and `DEMO_USER_B_EMAIL`, plus the same project URL and service role key. It requires `CARDWISE_DEMO_SETUP=YES`. Generated passwords are written to a new gitignored `.demo-credentials-*.txt` file. Keep that file private; it is not suitable for publishing or sharing. The script refuses to overwrite an account that is not marked as a Cardwise demo or that has non-demo financial records.

## Commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

## Data and limitations

- Money is stored as integer minor units in INR. Expenses and refunds affect spending; income is reported separately; transfers are excluded from spend totals.
- Card limits, current outstanding, minimum due, due dates, points, and notes are entered by the user. Cardwise does not infer statement balances from transactions or calculate a bureau score.
- Rewards are estimates only and appear only when active, source-backed reward rules have a verification date.
- Insights are deterministic calculations. The app does not send personal finance data to an AI service.
- Local preview records live in this browser's local storage. Clearing browser storage removes them.
- Live account isolation depends on the Supabase row-level security policies in the migration. Remote policy behavior has not been verified until the migration is applied and tested in the selected project.

See [`docs/acceptance-status.md`](docs/acceptance-status.md) for the current verification and deployment state.
