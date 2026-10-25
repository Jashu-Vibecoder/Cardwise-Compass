-- A user may hold multiple instances of the same catalogue product.
-- Existing rows are preserved; only the uniqueness restriction is removed.
do $$
declare
  matching_constraint text;
begin
  select constraint_name.conname into matching_constraint
  from pg_constraint as constraint_name
  where constraint_name.conrelid = 'public.user_cards'::regclass
    and constraint_name.contype = 'u'
    and pg_get_constraintdef(constraint_name.oid) = 'UNIQUE (user_id, catalog_card_id)';

  if matching_constraint is not null then
    execute format('alter table public.user_cards drop constraint %I', matching_constraint);
  end if;
end
$$;
