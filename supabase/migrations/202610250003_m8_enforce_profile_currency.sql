-- New writes must use the workspace currency so totals never combine units.
-- Existing rows are not rewritten; the application filters them out of totals
-- when their currency differs and operators should review those records.
create or replace function public.enforce_profile_currency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  profile_currency text;
begin
  select preferred_currency into profile_currency
  from public.profiles
  where id = new.user_id;

  if profile_currency is null then
    raise exception 'Profile currency is unavailable for this user.' using errcode = '23514';
  end if;

  if new.currency is distinct from profile_currency then
    raise exception 'Record currency must match the profile currency (%).', profile_currency using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_profile_currency_guard on public.transactions;
create trigger transactions_profile_currency_guard
before insert or update of user_id, currency on public.transactions
for each row execute function public.enforce_profile_currency();

drop trigger if exists budgets_profile_currency_guard on public.budgets;
create trigger budgets_profile_currency_guard
before insert or update of user_id, currency on public.budgets
for each row execute function public.enforce_profile_currency();
