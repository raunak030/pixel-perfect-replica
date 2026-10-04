create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  full_name text not null default '',
  designation text default '', company_name text default '',
  mobile text default '', alternate_mobile text default '', email text default '',
  whatsapp text default '', website text default '', linkedin text default '',
  address text default '', city text default '', state text default '', country text default '', pincode text default '',
  notes text default '', category text default '', event_source text default '', date_met date,
  card_image_url text, needs_review boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contacts to authenticated;
grant all on public.contacts to service_role;
alter table public.contacts enable row level security;
create policy "own contacts" on public.contacts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index contacts_user_idx on public.contacts(user_id, created_at desc);
create index contacts_mobile_idx on public.contacts(user_id, mobile);
create index contacts_email_idx on public.contacts(user_id, lower(email));
create index contacts_company_idx on public.contacts(user_id, company_name);
create index contacts_city_idx on public.contacts(user_id, city);
create index contacts_event_idx on public.contacts(user_id, event_source);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  company_name text not null, website text default '', industry text default '',
  address text default '', city text default '', state text default '', country text default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, company_name)
);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "own companies" on public.companies for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.scan_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  contact_id uuid references public.contacts(id) on delete set null,
  original_image_url text, ocr_raw_text text,
  extraction_status text not null default 'pending', confidence_score numeric,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.scan_records to authenticated;
grant all on public.scan_records to service_role;
alter table public.scan_records enable row level security;
create policy "own scans" on public.scan_records for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null, created_at timestamptz not null default now(),
  unique (user_id, name)
);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "own categories" on public.categories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger contacts_touch before update on public.contacts for each row execute function public.touch_updated_at();
create trigger companies_touch before update on public.companies for each row execute function public.touch_updated_at();

create policy "own card images read" on storage.objects for select to authenticated using (bucket_id = 'cards' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own card images insert" on storage.objects for insert to authenticated with check (bucket_id = 'cards' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own card images delete" on storage.objects for delete to authenticated using (bucket_id = 'cards' and (storage.foldername(name))[1] = auth.uid()::text);