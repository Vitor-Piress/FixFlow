-- ============================================================================
-- FixFlow — Business Profile (Singleton Provider Settings)
-- ============================================================================

create table public.business_profile (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default '',
  owner_name text not null default '',
  document text,
  phone text,
  email text,
  city_state text,
  specialties text,
  pix_key text,
  default_payment_terms text,
  default_quote_validity_days smallint not null default 15
    check (default_quote_validity_days between 1 and 90),
  default_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_business_profile_updated_at
  before update on public.business_profile
  for each row execute function public.set_updated_at();

alter table public.business_profile enable row level security;

create policy "Authenticated full access on business_profile"
  on public.business_profile for all to authenticated using (true) with check (true);

-- Seed initial singleton row so .single() never fails on first load
insert into public.business_profile (
  id,
  business_name,
  owner_name,
  city_state
)
values (
  1,
  'João Cleberson — Serviços e Manutenção',
  'João Cleberson Oliveira da Rosa',
  'São José - SC'
)
on conflict (id) do nothing;