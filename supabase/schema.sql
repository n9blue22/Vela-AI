create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  plan text not null default 'mien_phi' check (plan in ('mien_phi', 'tiet_kiem', 'cao_cap')),
  is_email_verified boolean not null default false,
  email_verification_token_hash text not null default '',
  email_verification_expires_at timestamptz null,
  reset_password_token_hash text not null default '',
  reset_password_expires_at timestamptz null,
  daily_usage_date_key text not null default '',
  daily_content_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  source text not null default '',
  contact text not null default '',
  note text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'negotiating', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_owner_user_id_idx on public.leads(owner_user_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null default 'marketing' check (type in ('marketing', 'follow_up', 'booking', 'admin')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_owner_user_id_idx on public.tasks(owner_user_id);
create index if not exists tasks_owner_status_created_at_idx
on public.tasks(owner_user_id, status, created_at desc);
create index if not exists tasks_type_status_created_at_idx
on public.tasks(type, status, created_at desc);

create table if not exists public.content_generations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  channel text not null default '',
  goal text not null default '',
  audience text not null default '',
  product_or_service text not null default '',
  tone text not null default '',
  language text not null default '',
  special_note text not null default '',
  headline text not null,
  body text not null,
  cta text not null,
  reply_template text not null,
  hashtags text[] not null default '{}'::text[],
  provider text not null default 'ai',
  model text not null default '',
  is_fallback boolean not null default false,
  fallback_reason text not null default '',
  created_at timestamptz not null default now()
);

alter table public.content_generations
add column if not exists hashtags text[] not null default '{}'::text[];

create index if not exists content_generations_owner_user_id_created_at_idx
on public.content_generations(owner_user_id, created_at desc);

create table if not exists public.integration_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'unknown',
  event_type text not null default 'unknown',
  signature text not null default '',
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists integration_webhook_events_provider_received_at_idx
on public.integration_webhook_events(provider, received_at desc);

create table if not exists public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'zernio' check (provider in ('zernio')),
  provider_profile_id text not null,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, provider),
  unique(provider, provider_profile_id)
);

create index if not exists social_profiles_owner_provider_idx
on public.social_profiles(owner_user_id, provider);

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'zernio' check (provider in ('zernio')),
  platform text not null check (platform in ('facebook', 'instagram')),
  provider_profile_id text not null,
  provider_account_id text not null,
  display_name text not null default '',
  username text not null default '',
  profile_url text not null default '',
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'expired')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, provider, platform)
);

create index if not exists social_accounts_owner_provider_platform_idx
on public.social_accounts(owner_user_id, provider, platform);

create index if not exists users_role_created_at_idx
on public.users(role, created_at desc);

alter table public.users enable row level security;
alter table public.leads enable row level security;
alter table public.tasks enable row level security;
alter table public.content_generations enable row level security;
alter table public.integration_webhook_events enable row level security;
alter table public.social_profiles enable row level security;
alter table public.social_accounts enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_social_profiles_updated_at on public.social_profiles;
create trigger set_social_profiles_updated_at
before update on public.social_profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_social_accounts_updated_at on public.social_accounts;
create trigger set_social_accounts_updated_at
before update on public.social_accounts
for each row
execute procedure public.set_updated_at();
