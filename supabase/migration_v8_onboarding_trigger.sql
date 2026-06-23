-- OAuth / email signup: only auto-create profile when username is valid (1–7 alnum).
-- Skip until onboarding when username is missing (OAuth) or invalid length.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text := nullif(trim(new.raw_user_meta_data->>'username'), '');
  dname text := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), uname);
begin
  if uname is not null and uname ~ '^[a-zA-Z0-9]{1,7}$' then
    insert into public.profiles (id, username, display_name)
    values (new.id, uname, dname)
    on conflict (id) do nothing;
    insert into public.studios (owner_id, name, description)
    values (new.id, coalesce(dname, uname) || '''s Studio', '')
    on conflict (owner_id) do nothing;
  end if;
  return new;
end;
$$;
