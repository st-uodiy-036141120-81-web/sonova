-- Username: max 7 alphanumeric chars (reject longer names)
alter table public.profiles drop constraint if exists username_format;
alter table public.profiles add constraint username_format check (username ~ '^[a-zA-Z0-9]{1,7}$');
