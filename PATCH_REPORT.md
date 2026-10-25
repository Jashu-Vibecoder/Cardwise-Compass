# Cardwise Compass bug audit patch report

Audit source: `Cardwise Compass Bug Report and Patch Prompt.docx` (25 October 2026). Branch `fix/bug-audit-oct-2026` was merged into `main` at `3f1a2dc` and pushed to GitHub. Vercel production deployment is READY at `https://cardwise-compass.vercel.app`; `/` and `/transactions` both returned HTTP 200. No live Supabase database was queried or modified; database-dependent checks remain pending.

## Issue summary

| ID | Title | Status | Commit(s) | Files changed | Regression tests |
|---|---|---|---|---|---|
| H1 | Isolated public demo mode | needs manual verification | `13183f9`, `d3370af`, `aef8bc6` | `src/domain/workspace-mode.ts`, `src/lib/data.ts`, `src/lib/app-context.tsx`, `src/app.tsx`, `src/components/AppShell.tsx`, `src/components/TransactionForm.tsx`, `README.md`, `docs/acceptance-status.md` | `src/domain/workspace-mode.test.ts` |
| H2 | Reward rule eligibility and double counting | fixed | `0f357ec`, `8ee590a` | `src/domain/types.ts`, `src/domain/finance.ts`, `src/lib/data.ts`, `src/pages/RewardsPage.tsx` | `src/domain/finance.test.ts` |
| H3 | Month picker loses current month | fixed | `bef8515` | `src/components/AppShell.tsx`, `src/domain/months.ts` | `src/domain/months.test.ts` |
| H4 | Custom-category budget blocks account deletion | needs manual verification | `09f05b3`, `482863e` | `supabase/migrations/202610250002_h4_budget_category_cascade.sql`, `supabase/functions/delete-account/index.ts` | Live Postgres test unavailable; inspect migration and function manually |
| H5 | Vercel deep-link 404 | fixed | `e840726`, `46cfa0b` | `vercel.json` | Vercel preview `/transactions` returned HTTP 200 |
| M1 | Category chart omits uncategorized spend | fixed | `651dd14` | `src/domain/finance.ts` | `src/domain/finance.test.ts` |
| M2 | Transaction loading silently stops at 1,000 | fixed | `ddd7b49` | `src/domain/pagination.ts`, `src/lib/data.ts` | `src/domain/pagination.test.ts` |
| M3 | Catalogue search misses multi-word queries | needs manual verification | `23504ea` | `src/domain/catalog-search.ts`, `src/lib/data.ts`, `src/components/AddCardDialog.tsx` | `src/domain/catalog-search.test.ts` |
| M4 | CSV validation, duplicates, and partial imports | needs manual verification | `276d58f`, `e5fc5dc` | `src/lib/csv.ts`, `src/lib/data.ts`, `src/components/CsvImportDialog.tsx`, `src/pages/TransactionsPage.tsx`, `src/domain/transaction-dedupe.ts` | `src/lib/csv.test.ts`, `src/domain/transaction-dedupe.test.ts` |
| M5 | CSV formula/control-character injection | fixed | `6e8a472`, `7312d4e` | `src/lib/csv.ts` | `src/lib/csv.test.ts` |
| M6 | Transaction dates depend on browser timezone | needs manual verification | `9ede3ee` | `src/domain/dates.ts`, `src/lib/format.ts`, callers | `src/domain/dates.test.ts`, `src/lib/format.test.ts` |
| M7 | Signed-in user sees sign-in flash | fixed | `6c7ddd2` | `src/app.tsx`, `src/domain/session-state.ts` | `src/domain/session-state.test.ts` |
| M8 | Mixed currencies enter totals | needs manual verification | `fb52912`, `6843123` | `src/domain/finance.ts`, `src/lib/data.ts`, `src/components/AddCardDialog.tsx`, `src/components/BudgetForm.tsx`, `src/components/TransactionForm.tsx`, `src/pages/BudgetsPage.tsx`, `src/pages/CardDetailsPage.tsx`, `src/pages/CardsPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/InsightsPage.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/RewardsPage.tsx`, `src/pages/TransactionsPage.tsx`, migrations `003` and `007` | `src/domain/finance.test.ts`; SQL/live data check pending |
| M9 | Account deletion hides server error | needs manual verification | `317feb7` | `src/lib/data.ts`, `src/lib/function-errors.ts` | `src/lib/function-errors.test.ts` |
| M10 | Duplicate card type edits instead of adding | needs manual verification | `0a94e82` | `src/domain/wallet-cards.ts`, `src/components/TransactionForm.tsx`, `src/components/AddCardDialog.tsx`, `src/lib/data.ts`, migration `004` | `src/domain/wallet-cards.test.ts` |
| L1 | Budget create overwrites an existing budget | fixed | `0067549` | `src/domain/budgets.ts`, `src/lib/data.ts`, `src/pages/BudgetsPage.tsx` | `src/domain/budgets.test.ts` |
| L2 | Insights answers category questions incorrectly | fixed | `024abb0` | `src/domain/insights.ts`, `src/pages/InsightsPage.tsx` | `src/domain/insights.test.ts` |
| L3 | Transaction search is limited to selected month | fixed | `a389878` | `src/domain/transaction-filter.ts`, `src/pages/TransactionsPage.tsx` | `src/domain/transaction-filter.test.ts` |
| L4 | Modal focus, IDs, Escape, dirty close | needs manual verification | `8ac5f19` | `src/components/Modal.tsx`, `src/components/TransactionForm.tsx`, `src/components/AddCardDialog.tsx` | `src/components/Modal.test.tsx` |
| L5 | Preview card removal leaves stale transaction links | fixed | `02d1a10` | `src/domain/wallet-cards-links.ts`, `src/lib/data.ts`, `src/components/AppShell.tsx` | `src/domain/wallet-cards-links.test.ts` |
| L6 | RPC month start and demo/category data guards | needs manual verification | `6371059` | `supabase/migrations/202610250005_l6_data_integrity_guards.sql` | SQL execution pending |
| L7 | Forgot-password flow | needs manual verification | `aef8bc6` | `src/lib/password-recovery.ts`, `src/lib/data.ts`, `src/pages/PasswordRecoveryPage.tsx`, `src/pages/SignInPage.tsx`, `src/app.tsx` | `src/lib/password-recovery.test.ts` (helper-level only) |
| L8 | Immediate CSV download URL revocation | fixed | `edab326` | `src/lib/download.ts`, `src/pages/TransactionsPage.tsx`, `src/pages/ProfilePage.tsx` | `src/lib/download.test.ts` |
| L9 | CI and repository documentation; license | partially fixed | `8c258d2` | `.github/workflows/ci.yml`, `README.md` | CI workflow added; CI service not run here |
| L10 | Hardcoded Supabase ref and external CSV path | fixed | `38bbf2e` | `scripts/import-catalogue.mjs`, `scripts/provision-demo-users.mjs`, `README.md` | `node --check` on both scripts |
| L11 | Preview persona differs from seeded demo | fixed | `7ef6568` | `src/lib/data.ts` | Existing workspace tests; local migration behavior reviewed |
| L12 | Utilization precision differs by screen | fixed | `b8d90f0` | `src/domain/finance.ts`, card detail/dashboard callers | `src/domain/finance.test.ts` |
| L13 | Dashboard bundle is about 400 kB | fixed | `8dbbfea` | `vite.config.ts` | Production build output |
| L14 | Catalogue issuer links point to generic sources | needs manual verification | `01bda6f` | catalogue seed/source data, migration `006` | Source URLs reviewed; live catalogue migration pending |
| L15 | Delete-data copy omits custom categories | fixed | `e9625d2` | `src/pages/ProfilePage.tsx` | No behavioral test required; copy reviewed |

## Issue details

### H1 — Isolated public demo mode

**Root cause:** `?demo=1` was not a production workspace mode, while local preview and Supabase-backed workspace paths shared write decisions. **Change:** the demo route uses its own browser-storage key and forces workspace data operations to local storage; app routing now initializes the demo context and documentation explains that fictional edits remain in that browser. **Example:** opening `/` with `?demo=1` uses demo records even when Supabase is configured; saving a demo transaction does not call Supabase. **Risk/follow-up:** confirm this with browser network inspection and an authenticated Supabase account before publishing the updated UI; no live account was used here.

### H2 — Reward rule eligibility and double counting

**Root cause:** application types/read mapping used `category_id` instead of DB `qualifying_category_id`; every matching rule independently paid the same transaction, and the page counted all loaded rules. **Change:** the model now uses the DB field, exclusions compare category slugs, each expense is allocated to the highest-rate matching rule (ties use lexically smallest rule ID), caps apply to that rule’s monthly estimate, and only rules with eligible spend are shown/counted. **Example:** one 10,000-minor-unit purchase matching 2% and 5% rules now earns 500, not 700. **Risk/follow-up:** verified catalogue rule rows and actual issuer terms still need review; only unit fixtures were tested.

### H3 — Month picker loses current month

**Root cause:** options were calculated relative to the selected month. **Change:** options are anchored to `currentMonth()` and include the previous 24 months plus the current month regardless of selection. **Example:** selecting September no longer removes October. **Risk/follow-up:** none found in unit tests; visual picker review remains pending.

### H4 — Account deletion blocked by category budgets

**Root cause:** `budgets.category_id` used `ON DELETE RESTRICT`, allowing custom-category deletion to fail during account cascade. **Change:** migration `002` changes it to `ON DELETE CASCADE`; the Edge Function now pins its import, restricts CORS to `ALLOWED_ORIGIN` with a safe default, logs the underlying error, and returns a stable code; client parsing reads the function JSON message. **Example:** a budget referencing a custom category should cascade away when the account is deleted. **Risk/follow-up:** migration application and an end-to-end deletion test are explicitly pending; no real user or database was touched.

### H5 — Vercel deep links

**Root cause:** BrowserRouter routes had no Vercel history fallback. **Change:** `vercel.json` rewrites app paths to `/index.html`. **Example:** `/transactions` should load the SPA when opened directly. **Risk/follow-up:** verify after deployment; not deployed from this branch.

### M1 — Uncategorized category totals

**Root cause:** null/unknown category IDs were excluded from chart slices. **Change:** finance totals add an “Uncategorized” slice and account for refunds. **Example:** 100 groceries plus 300 uncategorized now displays 25% and 75%. **Risk/follow-up:** none identified in unit tests.

### M2 — Transaction pagination

**Root cause:** a silent `.limit(1000)` omitted older transactions. **Change:** the workspace loader fetches pages until the final partial/empty page, so duplicate checks see the same complete data. **Example:** 1,001 rows load across multiple requests. **Risk/follow-up:** large-account latency should be measured against the live project.

### M3 — Catalogue search

**Root cause:** a whole query had to match one field, unsafe wildcard/reserved characters were passed to PostgREST, and stale responses could replace newer results. **Change:** token-based matching covers issuer, card name, aliases; query escaping and request counters protect remote search and UI state. **Example:** “hdfc millennia” can match issuer + product name. **Risk/follow-up:** hosted query behavior needs Supabase verification.

### M4 — CSV import

**Root cause:** lenient date parsing accepted impossible dates, amount parsing rejected common formats, same-day rows were over-collapsed, and imports lacked clear batch/delimiter reporting. **Change:** strict calendar validation, currency-aware parsing (rupee/Rs/space separators), negative-without-type handling, comma/semicolon/tab detection, exact-field dedupe candidates with explicit confirmation, batched inserts with `dedupe_key`, succeeded/failed counts, and UI refresh after partial outcomes. **Example:** `2026-02-31` is rejected; two same-day purchases with different descriptions are kept separate; exact repeats are marked and need confirmation. **Risk/follow-up:** Supabase bulk insert and partial-failure behavior need a sandbox project test.

### M5 — CSV export injection

**Root cause:** exported text cells could begin with formula markers or control characters. **Change:** cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return receive a leading apostrophe before CSV quoting. **Example:** a merchant value beginning with `=HYPERLINK(...)` or tab is emitted as text. **Risk/follow-up:** spreadsheet-specific import behavior should be checked in Excel/LibreOffice.

### M6 — Timezone dates

**Root cause:** browser-local `Date` conversion and a fixed `+05:30` offset disagreed with profile timezone. **Change:** date-only display and local-noon timestamps use the profile timezone. **Example:** a stored October 2 transaction stays October 2 in Los Angeles instead of shifting to October 1. **Risk/follow-up:** verify visually in a non-IST browser.

### M7 — Auth loading flash

**Root cause:** an effect cleared loading before `getSession()` resolved. **Change:** loading remains active until the initial session result is ready. **Example:** a returning authenticated user is not briefly shown sign-in. **Risk/follow-up:** live Supabase session behavior pending.

### M8 — Currency consistency

**Root cause:** totals and RPC summed minor units across currencies while UI formatting implied one currency. **Change:** writes are checked against profile currency, UI calculations/formatting use that currency, migration `003` guards new writes, and migration `007` filters `get_monthly_summary` to the profile currency. **Example:** a USD row is not combined into an INR workspace total. **Risk/follow-up:** old mixed-currency rows are not rewritten or deleted; review them before applying the migrations and verify RPC output on a test database.

### M9 — Account deletion errors

**Root cause:** `functions.invoke` surfaced a generic non-2xx message. **Change:** the client extracts JSON error messages from `FunctionsHttpError` and retains a safe fallback. **Example:** a server response with a stable deletion error code is shown instead of only “non-2xx”. **Risk/follow-up:** live Edge Function deployment/test pending.

### M10 — Multiple cards of the same type

**Root cause:** a unique `(user_id, catalog_card_id)` constraint made adding a second copy act like editing the first. **Change:** migration `004` drops the uniqueness constraint, edits target a wallet-card ID, and selecting a catalogue card opens the detailed card-entry dialog before linking the transaction. **Example:** two Millennia copies can be stored separately using their own nickname/last four. **Risk/follow-up:** apply the migration to a staging database and verify add/edit/link flows.

### L1 — Budget overwrite

**Root cause:** creating a same-category/month budget updated an existing record without clear feedback; edit copy used the selected month. **Change:** conflicts are rejected with an edit-existing message and edit copy reflects the budget’s own month. **Example:** adding a second October dining budget is reported as a conflict. **Risk/follow-up:** none identified in tests.

### L2 — Insights questions

**Root cause:** broad keyword matching treated “spend on dining” like total spend. **Change:** category intent is parsed for supported questions and “Set a budget” uses router navigation. **Example:** “How much did I spend on dining?” returns dining spend. **Risk/follow-up:** unsupported phrasings should continue to get a safe fallback; this is not a general language model.

### L3 — Search across months

**Root cause:** transaction filtering always constrained results to the selected month. **Change:** an all-months toggle switches the date scope without changing other filters. **Example:** search can find an older merchant from the current Transactions page. **Risk/follow-up:** browser journey pending.

### L4 — Modal accessibility and dirty close

**Root cause:** modal IDs were fixed and keyboard focus/escape behavior was incomplete. **Change:** IDs are unique, the top modal traps focus and restores it, Escape is scoped to the top modal, and dirty forms ask before discarding. **Example:** Escape inside the card combobox no longer closes its dialog. **Risk/follow-up:** screen-reader/browser interaction review pending.

### L5 — Preview card links

**Root cause:** removing a preview card left transaction `card_id` values pointing to a removed record, and preview exit was hidden. **Change:** local removal clears links; preview has a labeled exit/reset action. **Example:** deleted card transactions show no stale card reference. **Risk/follow-up:** local browser flow pending.

### L6 — SQL data guards

**Root cause:** summary RPC returned the input date rather than month start, and authenticated users could set demo markers or collide with system category slugs. **Change:** migration `005` fixes the RPC result and adds triggers blocking those writes. **Example:** a signed-in row cannot be marked `source='demo'`; custom categories cannot reuse a system slug. **Risk/follow-up:** SQL execution and RLS tests pending.

### L7 — Forgot password

**Root cause:** sign-in had no reset path. **Change:** the committed flow requests `resetPasswordForEmail`, handles the recovery event, and lets the user save a new password; helper tests pass. **Example:** a reset request targets `/reset-password`. **Risk/follow-up:** configure the allowed Supabase redirect URL and test a real recovery email before treating this as complete. Shared demo credentials were not included in the commit; the app offers a separate fictional demo path.

### L8 — Download URL lifetime

**Root cause:** `URL.revokeObjectURL` ran immediately after click. **Change:** revocation is deferred. **Example:** browser has a short interval to start a CSV download. **Risk/follow-up:** Safari download behavior not visually verified.

### L9 — Repository hygiene and license

**Root cause:** no CI workflow and README omitted scripts/docs details. **Change:** GitHub Actions runs lint, typecheck, tests, and build; README describes setup, scripts, docs, and license status. **Example:** CI uses Node 22 and `npm ci`. **Risk/follow-up:** no `LICENSE` was added because selecting reuse/redistribution terms is an owner decision; choose a license before inviting external reuse.

### L10 — Import scripts

**Root cause:** catalogue import depended on a CSV outside the repository and provisioning hardcoded a project ref. **Change:** scripts take explicit input/project configuration and README documents usage; scripts pass `node --check`. **Example:** catalogue import requires a supplied CSV path. **Risk/follow-up:** scripts were not run against Supabase and require carefully scoped administrative credentials.

### L11 — Preview persona

**Root cause:** local preview identified as Aarav while seeded demo used Mira. **Change:** fixture profile aligns to Mira and migrates only the known legacy local profile. **Example:** preview profile displays the same seeded persona. **Risk/follow-up:** verify migration against a disposable local-storage fixture.

### L12 — Utilization precision

**Root cause:** dashboard rounded utilization differently from card detail. **Change:** both use one-decimal precision. **Example:** 22.46% displays as 22.5% in both views. **Risk/follow-up:** none identified.

### L13 — Dashboard bundle

**Root cause:** chart library code was included in the initial dashboard bundle. **Change:** charts are split into a separate Vite chunk. **Example:** DashboardPage is 15.21 kB (gzip 4.67 kB); chart chunk is 399.06 kB (gzip 116.32 kB). **Risk/follow-up:** monitor on production builds.

### L14 — Catalogue sources

**Root cause:** catalogue entries pointed to generic listings/FAQ/PDF rather than specific issuer product pages. **Change:** catalogue entries and migration `006` store official product URLs and verification timestamps. **Example:** each of the four reported cards opens its issuer-specific product page. **Risk/follow-up:** issuer pages and reward terms can change; recheck before making benefit claims.

### L15 — Delete-data copy

**Root cause:** confirmation omitted that custom categories would also be deleted. **Change:** profile copy names custom categories and clarifies system categories remain. **Example:** user sees category deletion before confirming. **Risk/follow-up:** none identified.

## Verification

Final commands were run after the last source changes:

```text
> npm run lint
> cardwise-compass@0.1.0 lint
> eslint .

Exit code: 0
```

```text
> npm run typecheck
> cardwise-compass@0.1.0 typecheck
> tsc -b --pretty

Exit code: 0
```

```text
> npm test
> cardwise-compass@0.1.0 test
> vitest run

RUN  v5.0.5 E:/Card_Manager_Project_Docs/Cardwise-Compass
Test Files  19 passed (19)
Tests       57 passed (57)
Start at    22:07:26
Duration    2.92s (environment 79%, setup 16%, tests 2%, worker 2%, import 1%, transform 1%)
Exit code: 0
```

```text
> npm run build
> cardwise-compass@0.1.0 build
> tsc -b && vite build

vite v6.4.5 building for production...
✓ 2266 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                             1.23 kB │ gzip:   0.57 kB
dist/assets/index-F721cO6H.css             72.51 kB │ gzip:  15.70 kB
dist/assets/plus-DJPvXAcZ.js                 0.32 kB │ gzip:   0.25 kB
dist/assets/PageHeader-DYE-G7E-.js           0.36 kB │ gzip:   0.22 kB
dist/assets/info-CyMb3rVf.js                 0.37 kB │ gzip:   0.28 kB
dist/assets/pencil-DhAmEavK.js               0.45 kB │ gzip:   0.32 kB
dist/assets/trash-2-DnqaGqZa.js              0.53 kB │ gzip:   0.35 kB
dist/assets/arrow-up-right-D2CdSlBo.js       0.62 kB │ gzip:   0.31 kB
dist/assets/calendar-days-BuRpkxzy.js        0.66 kB │ gzip:   0.37 kB
dist/assets/search-B9LDO4nQ.js               0.69 kB │ gzip:   0.35 kB
dist/assets/Modal-BXwnJsb-.js                2.12 kB │ gzip:   0.92 kB
dist/assets/download-CvlElS2d.js             4.38 kB │ gzip:   2.23 kB
dist/assets/finance-u2wkm62i.js              4.48 kB │ gzip:   1.71 kB
dist/assets/TransactionForm-DGj9Kqi-.js      5.64 kB │ gzip:   1.89 kB
dist/assets/RewardsPage-BXUYE8mP.js           6.73 kB │ gzip:   2.20 kB
dist/assets/BudgetsPage-BDzajJgm.js           7.81 kB │ gzip:   2.81 kB
dist/assets/CardsPage-CQfuWbOZ.js             8.42 kB │ gzip:   2.75 kB
dist/assets/CardDetailsPage-DAGAFLK5.js       8.94 kB │ gzip:   2.72 kB
dist/assets/ProfilePage-CVArbrOz.js           9.65 kB │ gzip:   3.17 kB
dist/assets/AddCardDialog-Cr7wywvu.js        10.95 kB │ gzip:   3.69 kB
dist/assets/InsightsPage-BXeZBE8d.js         11.69 kB │ gzip:   3.88 kB
dist/assets/TransactionsPage-DSP-dgNA.js     13.38 kB │ gzip:   4.43 kB
dist/assets/DashboardPage-DL6w_8dY.js        15.21 kB │ gzip:   4.67 kB
dist/assets/supabase-s3XNS0mn.js            227.08 kB │ gzip:  58.97 kB
dist/assets/index-BTrcuhyu.js               297.51 kB │ gzip:  93.88 kB
dist/assets/charts-DVGNoKX2.js              399.06 kB │ gzip: 116.32 kB
✓ built in 5.74s
Exit code: 0
```

```text
> npm audit
found 0 vulnerabilities
Exit code: 0
```

The browser tool exposed no browser window. A local Vite server started, but the in-app browser was unavailable, so visual/user-journey checks were not represented as completed. Read-only requests to the public Vercel production URL returned HTTP 200 for both `/` and `/transactions`. The production build is READY, but this report does not claim end-to-end Supabase verification.

## Migration notes

Apply to a staging Supabase project only after reviewing the schema. Preserve the existing core migration; apply in filename order after it:

1. `202610250002_h4_budget_category_cascade.sql` — rebuilds the budget/category foreign key with cascade behavior. Existing rows are preserved; future delete behavior changes.
2. `202610250003_m8_enforce_profile_currency.sql` — rejects mismatched-currency transaction/budget writes. Does not rewrite existing mixed-currency data; review those rows first.
3. `202610250004_m10_allow_duplicate_user_cards.sql` — removes unique catalogue-card-per-user constraint. Existing wallet cards are preserved.
4. `202610250005_l6_data_integrity_guards.sql` — updates summary RPC and adds write guards. Existing rows are not cleaned or deleted.
5. `202610250006_l14_card_product_sources.sql` — updates catalogue source fields for reported products. Verify the target catalogue rows before applying.
6. `202610250007_m8_filter_monthly_summary_currency.sql` — replaces the monthly summary RPC to filter to the profile currency. Existing mixed-currency rows remain untouched and excluded from that RPC.

No migration was applied to a live database. Required follow-up: apply and verify each migration on staging, check migration order and row counts, test RLS and summary RPC as a normal user, then prepare a separate reviewed production migration plan.

## Manual verification checklist

- [ ] Apply migrations in order to staging; confirm existing profiles/cards/transactions remain and check mixed-currency rows before M8 migrations.
- [ ] Exercise Supabase sign-in/sign-up/session restore, RLS isolation, demo `?demo=1` isolation, and no cross-account reads/writes.
- [ ] Add, edit, and delete an account with a custom category budget; verify Edge Function CORS, stable response, and client-visible error.
- [ ] Test CSV import in staging for semicolon/tab, exact duplicates, partial batch failure, and refreshed totals; test CSV exports in Excel/LibreOffice.
- [x] Request Vercel `/transactions` directly; production returned HTTP 200 through the SPA rewrite. Visual refresh check remains pending.
- [ ] Test timezone display in a non-IST browser and timezone-boundary transaction date entry.
- [ ] Use a browser for card search/add with multiple copies, reward calculation and caps, month navigation, transaction totals, modal keyboard behavior, and responsive/mobile layout.
- [ ] Complete the forgot-password redirect allowlist and recovery-email flow against the intended Supabase project.
- [ ] Recheck official issuer product pages and all reward terms before publishing benefit claims.

## Deferred and pending items

- L7 has helper-level tests and a worktree implementation, but shared uncommitted branding/demo-auth edits overlap the integration files. The changes were left unstaged so those edits and user-provided demo credentials are not accidentally committed. Integrate the recovery flow separately without committing credentials; configure and test Supabase redirect URLs.
- L9 license selection requires the project owner to choose reuse/redistribution terms. README documents that no license is provided; no legal text was invented.
- H4, H5, M3, M4, M8, M9, M10, L6, and L14 require staging/live integration checks listed above. Live Supabase and Vercel were not changed.
- Browser journeys, mobile layout, contrast, chart rendering, and non-IST visual checks remain pending because no browser window was available in this session.
- Existing mixed-currency data needs owner review before enforcing the new rule. It was not modified.

## Commit information

All issue fix commits are pushed on `origin/fix/bug-audit-oct-2026` and merged into `origin/main`. Follow-up commits exist for H1, H2, H4, H5, M4, M5, and M8. The user-requested brand image and public-demo/recovery integration were committed in `aef8bc6`; the credential file remains untracked and was not committed. Production commit `3f1a2dc` is READY on Vercel; Supabase migrations remain unapplied.
