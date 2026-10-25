-- Keep the RPC's date return value aligned with the month whose totals it uses.
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
  select date_trunc('month', p_month)::date, c.gross_expenses - c.refunds, c.income, c.refunds,
         c.income - (c.gross_expenses - c.refunds), p.gross_expenses - p.refunds
  from current_rows c cross join previous_rows p;
end;
$$;

create or replace function public.reject_user_demo_records()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and new.is_demo then
    raise exception 'Demo records cannot be written to a signed-in account.' using errcode = '23514';
  end if;
  if tg_table_name = 'transactions' and auth.uid() is not null and new.source = 'demo' then
    raise exception 'Demo transaction sources cannot be written to a signed-in account.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_reject_demo_records on public.transactions;
create trigger transactions_reject_demo_records
before insert or update of is_demo, source on public.transactions
for each row execute function public.reject_user_demo_records();

drop trigger if exists budgets_reject_demo_records on public.budgets;
create trigger budgets_reject_demo_records
before insert or update of is_demo on public.budgets
for each row execute function public.reject_user_demo_records();

drop trigger if exists user_cards_reject_demo_records on public.user_cards;
create trigger user_cards_reject_demo_records
before insert or update of is_demo on public.user_cards
for each row execute function public.reject_user_demo_records();

create or replace function public.reject_custom_system_category_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null and exists (
    select 1 from public.categories as system_category
    where system_category.owner_id is null and system_category.slug = new.slug
  ) then
    raise exception 'A custom category cannot reuse a system category slug.' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists categories_reject_system_slug_collision on public.categories;
create trigger categories_reject_system_slug_collision
before insert or update of owner_id, slug on public.categories
for each row execute function public.reject_custom_system_category_slug();
