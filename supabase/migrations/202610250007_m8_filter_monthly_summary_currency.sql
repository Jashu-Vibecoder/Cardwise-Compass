-- Keep the summary RPC consistent with the profile currency enforced for new writes.
-- Existing mixed-currency rows remain untouched and require owner review.
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
  profile_currency text;
  month_start_at timestamptz;
  next_month_at timestamptz;
  previous_month_at timestamptz;
  previous_start_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select timezone, preferred_currency into tz, profile_currency
  from public.profiles where id = auth.uid();
  tz := coalesce(tz, 'Asia/Kolkata');
  if profile_currency is null then raise exception 'Profile currency is unavailable.'; end if;
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
    where user_id = auth.uid() and currency = profile_currency
      and occurred_at >= month_start_at and occurred_at < next_month_at
  ), previous_rows as (
    select coalesce(sum(amount_minor) filter (where transaction_type = 'expense'), 0)::bigint as gross_expenses,
           coalesce(sum(amount_minor) filter (where transaction_type = 'refund'), 0)::bigint as refunds
    from public.transactions
    where user_id = auth.uid() and currency = profile_currency
      and occurred_at >= previous_start_at and occurred_at < previous_month_at
  )
  select date_trunc('month', p_month)::date, c.gross_expenses - c.refunds, c.income, c.refunds,
         c.income - (c.gross_expenses - c.refunds), p.gross_expenses - p.refunds
  from current_rows c cross join previous_rows p;
end;
$$;
