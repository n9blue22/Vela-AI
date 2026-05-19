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

