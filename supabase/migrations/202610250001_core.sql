-- Cardwise Reward Compass core schema.
-- Apply only after inspecting the target project's existing schema and data.
create extension if not exists pgcrypto;

do $$ begin
  create type public.card_verification_status as enum ('unverified', 'identity_verified', 'benefits_verified', 'verified');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Cardwise member' check (char_length(display_name) between 1 and 80),
  city text check (city is null or char_length(city) <= 100),
  occupation text check (occupation is null or char_length(occupation) <= 100),
  monthly_income_minor bigint check (monthly_income_minor is null or monthly_income_minor >= 0),
  preferred_currency text not null default 'INR' check (preferred_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#9aa5b5' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists categories_system_slug_uidx on public.categories(slug) where owner_id is null;
create unique index if not exists categories_owner_slug_uidx on public.categories(owner_id, slug) where owner_id is not null;
create index if not exists categories_owner_idx on public.categories(owner_id);

insert into public.categories (owner_id, slug, name, color, is_system) values
  (null, 'housing', 'Housing', '#8f7ee8', true),
  (null, 'groceries', 'Groceries', '#38a88b', true),
  (null, 'dining', 'Food & dining', '#f69d56', true),
  (null, 'transport', 'Transport', '#6aa9ea', true),
  (null, 'utilities', 'Utilities', '#edba4d', true),
  (null, 'shopping', 'Shopping', '#dc7c9b', true),
  (null, 'health', 'Health', '#55aeaa', true),
  (null, 'subscriptions', 'Subscriptions', '#7784a0', true),
  (null, 'education', 'Education', '#68927f', true),
  (null, 'uncategorized', 'Uncategorized', '#9aa5b5', true)
on conflict do nothing;

create table if not exists public.credit_card_catalog (
  id uuid primary key default gen_random_uuid(),
  issuer_name text not null check (char_length(issuer_name) between 2 and 100),
  card_name text not null check (char_length(card_name) between 2 and 140),
  category text,
  aliases text[] not null default '{}',
  benefit_summary text,
  joining_fee_minor bigint check (joining_fee_minor is null or joining_fee_minor >= 0),
  annual_fee_minor bigint check (annual_fee_minor is null or annual_fee_minor >= 0),
  official_product_url text,
  source_url text,
  verification_status public.card_verification_status not null default 'unverified',
  last_verified_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (issuer_name, card_name),
  check ((verification_status = 'unverified') or (source_url is not null and last_verified_at is not null))
);
create index if not exists credit_card_catalog_search_idx on public.credit_card_catalog using gin (to_tsvector('simple', issuer_name || ' ' || card_name || ' ' || coalesce(category, '')));
create index if not exists credit_card_catalog_active_idx on public.credit_card_catalog(is_active, issuer_name);

-- These four catalogue identities were checked against issuer sources on 2026-10-25.
-- No reward rates, fees, caps, or benefit claims are seeded as verified facts.
insert into public.credit_card_catalog
  (issuer_name, card_name, category, aliases, source_url, official_product_url, verification_status, last_verified_at)
values
  ('HDFC Bank', 'Millennia', 'Cashback & Shopping', array['Millennia Credit Card'],
   'https://www.hdfcbank.com/content/api/contentstream-id/723fb80a-2dde-42a3-9793-7ae1be57c87f/ef2bb403-39aa-46ae-aa45-bcd1ac8a538b',
   'https://www.hdfcbank.com/content/api/contentstream-id/723fb80a-2dde-42a3-9793-7ae1be57c87f/ef2bb403-39aa-46ae-aa45-bcd1ac8a538b',
   'identity_verified', '2026-10-25'),
  ('SBI Card', 'Cashback SBI Card', 'Cashback & Shopping', array['CASHBACK SBI Card'],
   'https://www.sbicard.com/en/personal/credit-cards.html',
   'https://www.sbicard.com/en/personal/credit-cards.html',
   'identity_verified', '2026-10-25'),
  ('Axis Bank', 'ACE Credit Card', 'Cashback & Utility', array['Axis ACE'],
   'https://www.axisbank.com/docs/default-source/default-document-library/ace-card-new.pdf',
   'https://www.axisbank.com/docs/default-source/default-document-library/ace-card-new.pdf',
   'identity_verified', '2026-10-25'),
  ('ICICI Bank', 'Amazon Pay ICICI Bank Credit Card', 'Cashback & Shopping', array['Amazon Pay ICICI'],
   'https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card/amazon-pay-faq',
   'https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card/amazon-pay-faq',
   'identity_verified', '2026-10-25')
on conflict (issuer_name, card_name) do nothing;

create table if not exists public.card_reward_rules (
  id uuid primary key default gen_random_uuid(),
  catalog_card_id uuid not null references public.credit_card_catalog(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  channel text not null check (channel in ('any', 'online', 'offline', 'unknown')),
  rate_basis_points integer not null check (rate_basis_points >= 0 and rate_basis_points <= 10000),
  monthly_cap_minor bigint check (monthly_cap_minor is null or monthly_cap_minor >= 0),
  cap_period text not null default 'none' check (cap_period in ('calendar_month', 'statement_cycle', 'none')),
  qualifying_category_id uuid references public.categories(id) on delete set null,
  excluded_categories text[] not null default '{}',
  source_url text not null,
  verified_at date,
  valid_from date not null,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from),
  check ((verified_at is null) or source_url ~ '^https://')
);
create index if not exists card_reward_rules_catalog_active_idx on public.card_reward_rules(catalog_card_id, is_active, valid_from);

create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_card_id uuid not null references public.credit_card_catalog(id) on delete restrict,
  nickname text check (nickname is null or char_length(nickname) <= 80),
  card_type text not null default 'credit' check (card_type in ('credit', 'debit', 'prepaid', 'other')),
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  monthly_budget_minor bigint check (monthly_budget_minor is null or monthly_budget_minor > 0),
  credit_limit_minor bigint check (credit_limit_minor is null or credit_limit_minor > 0),
  statement_balance_minor bigint check (statement_balance_minor is null or statement_balance_minor >= 0),
  due_date date,
  minimum_due_minor bigint check (minimum_due_minor is null or minimum_due_minor >= 0),
  reward_points bigint check (reward_points is null or reward_points >= 0),
  personal_notes text check (personal_notes is null or char_length(personal_notes) <= 500),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, catalog_card_id),
  unique (id, user_id)
);
alter table public.user_cards add column if not exists credit_limit_minor bigint check (credit_limit_minor is null or credit_limit_minor > 0);
alter table public.user_cards add column if not exists statement_balance_minor bigint check (statement_balance_minor is null or statement_balance_minor >= 0);
alter table public.user_cards add column if not exists due_date date;
alter table public.user_cards add column if not exists minimum_due_minor bigint check (minimum_due_minor is null or minimum_due_minor >= 0);
alter table public.user_cards add column if not exists reward_points bigint check (reward_points is null or reward_points >= 0);
alter table public.user_cards add column if not exists personal_notes text check (personal_notes is null or char_length(personal_notes) <= 500);
create index if not exists user_cards_owner_idx on public.user_cards(user_id, created_at desc);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  limit_minor bigint not null check (limit_minor > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);
create unique index if not exists budgets_owner_month_overall_uidx on public.budgets(user_id, period_start) where category_id is null;
create unique index if not exists budgets_owner_month_category_uidx on public.budgets(user_id, period_start, category_id) where category_id is not null;
create index if not exists budgets_owner_period_idx on public.budgets(user_id, period_start desc, period_end);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  transaction_type text not null check (transaction_type in ('expense', 'income', 'refund', 'transfer')),
  merchant text not null check (char_length(merchant) between 1 and 160),
  description text check (description is null or char_length(description) <= 500),
  category_id uuid references public.categories(id) on delete set null,
  occurred_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual', 'csv_import', 'android_alert', 'bank_provider', 'demo')),
  source_reference text,
  dedupe_key text,
  is_demo boolean not null default false,
  recurring boolean not null default false,
  spend_channel text not null default 'unknown' check (spend_channel in ('online', 'offline', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (card_id, user_id) references public.user_cards(id, user_id) on delete set null (card_id)
);
create unique index if not exists transactions_dedupe_key_uidx on public.transactions(user_id, dedupe_key) where dedupe_key is not null;
create index if not exists transactions_owner_occurred_idx on public.transactions(user_id, occurred_at desc, id);
create index if not exists transactions_owner_category_idx on public.transactions(user_id, category_id, occurred_at desc);
create index if not exists transactions_owner_type_idx on public.transactions(user_id, transaction_type, occurred_at desc);

create or replace function public.validate_transaction_category_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  category_owner uuid;
begin
  if new.category_id is null then return new; end if;
  select owner_id into category_owner from public.categories where id = new.category_id;
  if not found then raise exception 'Category does not exist.'; end if;
  if category_owner is not null and category_owner <> new.user_id then
    raise exception 'Transaction category belongs to a different user.';
  end if;
  return new;
end;
$$;
drop trigger if exists transactions_category_owner_guard on public.transactions;
create trigger transactions_category_owner_guard before insert or update of category_id, user_id on public.transactions
for each row execute function public.validate_transaction_category_owner();

create or replace function public.validate_budget_category_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  category_owner uuid;
begin
  if new.category_id is null then return new; end if;
  select owner_id into category_owner from public.categories where id = new.category_id;
  if not found then raise exception 'Category does not exist.'; end if;
  if category_owner is not null and category_owner <> new.user_id then
    raise exception 'Budget category belongs to a different user.';
  end if;
  return new;
end;
$$;
drop trigger if exists budgets_category_owner_guard on public.budgets;
create trigger budgets_category_owner_guard before insert or update of category_id, user_id on public.budgets
for each row execute function public.validate_budget_category_owner();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists catalog_set_updated_at on public.credit_card_catalog;
create trigger catalog_set_updated_at before update on public.credit_card_catalog for each row execute function public.set_updated_at();
drop trigger if exists user_cards_set_updated_at on public.user_cards;
create trigger user_cards_set_updated_at before update on public.user_cards for each row execute function public.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Cardwise member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_cardwise on auth.users;
create trigger on_auth_user_created_cardwise after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.credit_card_catalog enable row level security;
alter table public.card_reward_rules enable row level security;
alter table public.user_cards enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists categories_read_available on public.categories;
create policy categories_read_available on public.categories for select to authenticated using (owner_id is null or owner_id = (select auth.uid()));
drop policy if exists categories_insert_own on public.categories;
create policy categories_insert_own on public.categories for insert to authenticated with check (owner_id = (select auth.uid()) and not is_system);
drop policy if exists categories_update_own on public.categories;
create policy categories_update_own on public.categories for update to authenticated using (owner_id = (select auth.uid()) and not is_system) with check (owner_id = (select auth.uid()) and not is_system);
drop policy if exists categories_delete_own on public.categories;
create policy categories_delete_own on public.categories for delete to authenticated using (owner_id = (select auth.uid()) and not is_system);

drop policy if exists catalog_read_active on public.credit_card_catalog;
create policy catalog_read_active on public.credit_card_catalog for select to authenticated using (is_active);
drop policy if exists reward_rules_read_verified on public.card_reward_rules;
create policy reward_rules_read_verified on public.card_reward_rules for select to authenticated using (is_active and verified_at is not null);

drop policy if exists user_cards_select_own on public.user_cards;
create policy user_cards_select_own on public.user_cards for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists user_cards_insert_own on public.user_cards;
create policy user_cards_insert_own on public.user_cards for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists user_cards_update_own on public.user_cards;
create policy user_cards_update_own on public.user_cards for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists user_cards_delete_own on public.user_cards;
create policy user_cards_delete_own on public.user_cards for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own on public.budgets for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own on public.budgets for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own on public.budgets for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own on public.budgets for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own on public.transactions for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.get_monthly_summary(p_month date)
returns table (
  month_start date,
  expenses_minor bigint,
  income_minor bigint,
  refunds_minor bigint,
  net_minor bigint,
  previous_expenses_minor bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  tz text;
  month_start_at timestamptz;
  next_month_at timestamptz;
  previous_month_at timestamptz;
  previous_start_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select timezone into tz from public.profiles where id = auth.uid();
  tz := coalesce(tz, 'Asia/Kolkata');
  month_start_at := date_trunc('month', p_month)::timestamp at time zone tz;
  next_month_at := (date_trunc('month', p_month) + interval '1 month')::timestamp at time zone tz;
  previous_start_at := (date_trunc('month', p_month) - interval '1 month')::timestamp at time zone tz;
  previous_month_at := month_start_at;
  return query
  with current_rows as (
    select
      coalesce(sum(amount_minor) filter (where transaction_type = 'expense'), 0)::bigint as gross_expenses,
      coalesce(sum(amount_minor) filter (where transaction_type = 'refund'), 0)::bigint as refunds,
      coalesce(sum(amount_minor) filter (where transaction_type = 'income'), 0)::bigint as income
    from public.transactions
    where user_id = auth.uid() and occurred_at >= month_start_at and occurred_at < next_month_at
  ), previous_rows as (
    select coalesce(sum(amount_minor) filter (where transaction_type = 'expense'), 0)::bigint as gross_expenses,
           coalesce(sum(amount_minor) filter (where transaction_type = 'refund'), 0)::bigint as refunds
    from public.transactions
    where user_id = auth.uid() and occurred_at >= previous_start_at and occurred_at < previous_month_at
  )
  select p_month, c.gross_expenses - c.refunds, c.income, c.refunds,
         c.income - (c.gross_expenses - c.refunds), p.gross_expenses - p.refunds
  from current_rows c cross join previous_rows p;
end;
$$;
revoke all on function public.get_monthly_summary(date) from public;
grant execute on function public.get_monthly_summary(date) to authenticated;

create or replace function public.delete_my_financial_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  delete from public.transactions where user_id = auth.uid();
  delete from public.budgets where user_id = auth.uid();
  delete from public.user_cards where user_id = auth.uid();
  delete from public.categories where owner_id = auth.uid() and not is_system;
end;
$$;
revoke all on function public.delete_my_financial_data() from public;
grant execute on function public.delete_my_financial_data() to authenticated;

grant select on public.categories, public.credit_card_catalog, public.card_reward_rules to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.user_cards, public.budgets, public.transactions to authenticated;
