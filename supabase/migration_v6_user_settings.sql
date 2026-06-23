-- User preferences (all settings in one JSON document)
alter table public.profiles add column if not exists settings jsonb not null default '{}'::jsonb;

create index if not exists idx_profiles_settings on public.profiles using gin (settings);

-- Self-service account deletion
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
