-- Allow a user's category to be removed without a restrictive budget FK
-- preventing account deletion. Transactions already use ON DELETE SET NULL.
alter table public.budgets
  drop constraint if exists budgets_category_id_fkey;

alter table public.budgets
  add constraint budgets_category_id_fkey
  foreign key (category_id)
  references public.categories(id)
  on delete cascade;
