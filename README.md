# Cardwise Reward Compass

<div align="center">
  <p><strong>A clearer view of every card, payment, and purchase.</strong></p>
  <p>Track credit cards, spending, and budgets in one responsive personal finance workspace.</p>
  <p><a href="https://github.com/Jashu-Vibecoder/Cardwise-Compass">GitHub repository</a></p>
</div>

## Overview

Cardwise Reward Compass brings card details and everyday money tracking together. Review spending by month, follow budgets, record statement details, and keep upcoming payment dates in view.

The app can run locally with a fictional preview workspace. Connect your own Supabase project when you want authentication and persistent, user-specific data.

## Features

- **Spending dashboard:** Monthly summaries, cash flow, category breakdowns, and budget progress.
- **Transactions:** Add, edit, remove, filter, preview CSV imports, and export records.
- **Budgets:** Track overall and category budgets against recorded transactions.
- **Card wallet:** Search the card catalogue and record your own limits, outstanding amounts, due dates, reward points, and notes.
- **Payment overview:** See combined credit utilization and upcoming due dates when the required statement details have been entered.
- **Reward estimates:** Estimates use verified reward rules when available. No reward rules are included by default, so estimates may be empty.
- **Local preview:** Explore fictional sample data without a Supabase account. Preview changes are saved in this browser only and are not shared with the hosted database.

## Technology

- **Frontend:** React 19, TypeScript, Vite 6
- **Navigation and charts:** React Router 7, Recharts 3, Lucide React
- **Optional backend:** Supabase Auth, PostgreSQL, and a Deno Edge Function
- **Quality tools:** ESLint, TypeScript, Vitest, Testing Library, and jsdom

## Quick start

### Prerequisites

- Node.js 22.12+ or a newer supported LTS release
- npm
- Git

### Run the local preview

1. Clone the repository:

   ```sh
   git clone https://github.com/Jashu-Vibecoder/Cardwise-Compass.git
   ```

2. Enter the project folder:

   ```sh
   cd Cardwise-Compass
   ```

3. Install the locked dependencies:

   ```sh
   npm ci
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Open the local URL printed by Vite. By default, it is `http://localhost:5173`.

No environment file is needed for the fictional preview workspace. It is available in development when Supabase is not configured. A public demo can also be opened with `?demo=1` or the **Explore demo** button. The demo uses a separate browser-storage key and never reads from or writes to Supabase; its fictional edits stay in that browser.

## Supabase setup

Supabase is optional for local preview. To use sign-in and persistent user data, create your own Supabase project and configure it for this app.

### Environment variables

Create a local environment file from the blank template:

```sh
cp .env.example .env.local
```

Set the following frontend variables in `.env.local` using values from your own Supabase project:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | The public client key used by the browser. The variable keeps the legacy `ANON_KEY` name used by this codebase. |

Find your project URL and public key in the Supabase Dashboard under **Project Settings -> API Keys**. Supabase's publishable key is intended for client applications; never put a secret or service-role key in a `VITE_` variable or browser code. The `.env.example` file contains blank placeholders only. Keep `.env.local` private and out of commits.

### Database and account deletion

1. In your own Supabase project, open **SQL Editor**.
2. Open [`supabase/migrations/202610250001_core.sql`](supabase/migrations/202610250001_core.sql), review it, and paste its contents into the SQL Editor to apply it to a new, empty project. The migration itself warns that an existing schema and its data must be inspected before applying it.
3. This repository does not include a `supabase/config.toml`, so it does not have a configured Supabase CLI migration workflow. If you plan to manage future schema changes with the CLI, set up and link your own project first; avoid mixing untracked dashboard edits with CLI migrations.
4. Account deletion uses the [`delete-account` Edge Function](supabase/functions/delete-account/index.ts). Its code reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` at runtime. Deploy the function separately and make sure those runtime variables are available in your own Supabase project. Follow the [Supabase Edge Functions guide](https://supabase.com/docs/guides/functions/quickstart). The function is not deployed by `npm run dev`.

The browser app only needs the two `VITE_` variables above. `SUPABASE_SERVICE_ROLE_KEY` is privileged: keep it in trusted server-side configuration and never expose it to the browser. The template also has blank server-only fields for optional administrative tooling; they are not needed for the local preview or normal browser app.

### Optional administration scripts

The catalogue importer requires an explicit CSV path (or `CARD_CATALOGUE_CSV`), `CARDWISE_PROJECT_REF`, `SUPABASE_URL`, and a server-side `SUPABASE_SERVICE_ROLE_KEY`. Run it only after checking the target project and CSV:

```powershell
$env:CARDWISE_PROJECT_REF = "your-project-ref"
$env:CARD_CATALOGUE_CSV = ".\catalogue.csv"
npm run catalogue:import
```

The demo provisioning script also requires `CARDWISE_PROJECT_REF` and the matching Supabase server credentials. These scripts do not run as part of the browser app or CI.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run the TypeScript project checks. |
| `npm test` | Run the Vitest suite once. |
| `npm run build` | Type-check and create a production build in `dist/`. |
| `npm run preview` | Preview an existing production build locally. Run `npm run build` first. |
| `npm run catalogue:import -- <csv-path>` | Review and import catalogue candidates from a CSV into the configured Supabase project. Requires explicit target confirmation and server credentials. |
| `npm run demo:provision` | Provision demo personas in the explicitly confirmed Supabase project. Requires administrative credentials; do not run against production user data. |
| `npm audit` | Check the installed dependency tree for reported vulnerabilities. |

## Project structure

```text
Cardwise-Compass/
|-- src/
|   |-- components/     Reusable interface components
|   |-- domain/         Finance types and calculations
|   |-- lib/            Data access, Supabase client, and shared helpers
|   `-- pages/          Dashboard and application screens
|-- docs/               Acceptance notes and project documentation
|-- scripts/            Catalogue import and demo provisioning tools
|-- .github/workflows/  CI checks for pull requests and main branch pushes
|-- supabase/
|   |-- functions/      Edge Functions
|   `-- migrations/     Database schema and review-only follow-up migrations
|-- .env.example        Blank local configuration template
|-- package.json        Dependencies and npm scripts
`-- vite.config.ts      Vite and test configuration
```

## Security and privacy

- The local preview uses fictional data in browser storage. Do not treat it as a backup or put real financial records in public screenshots, issues, or commits.
- Frontend `VITE_` variables are bundled for the browser. Use only a public Supabase client key there.
- Never commit `.env.local`, credentials, private financial data, or privileged Supabase keys. Secret and service-role keys bypass normal row-level access policies and belong only in trusted server-side configuration.
- Review Supabase Row Level Security and authentication settings for your own project before using real data. This repository does not claim a production security review or hosted deployment.

## Troubleshooting

- **The preview data is showing:** This is expected in development when both Supabase variables are not configured. It is fictional and stored in the current browser.
- **Supabase sign-in or data loading fails:** Check that both frontend variables are set for the same project, restart the Vite server after editing `.env.local`, and confirm the database migration has been applied.
- **Database tables are missing:** Apply the migration to your own new project after reviewing it. For an existing project, inspect its schema and data before making changes.
- **The local page uses a different port:** If port `5173` is already occupied, use the alternate URL printed by Vite.
- **`npm ci` fails:** Confirm Node.js and npm are installed, then retry from the repository root.

## Contributing and license

Bug reports and improvement proposals are welcome through [GitHub Issues](https://github.com/Jashu-Vibecoder/Cardwise-Compass/issues). For a code change, open a pull request with a short summary and the checks you ran.

No license file is currently included, so reuse and redistribution terms have not been specified.

## Helpful references

- [Node.js downloads](https://nodejs.org/en/download)
- [Vite guide](https://vite.dev/guide/)
- [Supabase React setup](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
- [Supabase API keys and security](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase SQL Editor](https://supabase.com/features/sql-editor)
- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
