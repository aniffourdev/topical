create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  subscription_status text not null default 'trial' check (subscription_status in ('trial','active','expired')),
  free_requests_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  preferred_ai_provider text not null default 'gemini' check (preferred_ai_provider in ('gemini','groq','openai','anthropic')),
  gemini_api_key text,
  groq_api_key text,
  openai_api_key text,
  anthropic_api_key text,
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  niche text not null,
  description text,
  wp_site_url text,
  wp_username text,
  wp_app_password text,
  n8n_webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pillars (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  url_slug text not null,
  focus_keyword text,
  search_volume integer,
  generation_method text not null check (generation_method in ('manual','csv_upload')),
  article_status text not null default 'pending' check (article_status in ('pending','writing','published','failed')),
  wp_post_id integer,
  wp_post_url text,
  created_at timestamptz not null default now()
);

create table if not exists clusters (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid not null references pillars(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  url_slug text not null,
  focus_keyword text,
  search_volume integer,
  article_status text not null default 'pending' check (article_status in ('pending','writing','published','failed')),
  wp_post_id integer,
  wp_post_url text,
  created_at timestamptz not null default now()
);

create table if not exists article_briefs (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null,
  content_type text not null check (content_type in ('pillar','cluster')),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  focus_keyword text,
  secondary_keywords text[],
  word_count_target integer,
  outline jsonb,
  meta_description text,
  created_at timestamptz not null default now(),
  unique(content_id, content_type)
);

create table if not exists workflow_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  content_id uuid not null,
  content_type text not null check (content_type in ('pillar','cluster')),
  webhook_url text not null,
  payload_sent jsonb,
  status text not null check (status in ('sent','success','failed','timeout')),
  wp_post_id integer,
  wp_post_url text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table projects enable row level security;
alter table pillars enable row level security;
alter table clusters enable row level security;
alter table article_briefs enable row level security;
alter table workflow_history enable row level security;

create or replace function create_owner_policies(tbl text) returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I_select on %I', tbl, tbl);
  execute format('drop policy if exists %I_insert on %I', tbl, tbl);
  execute format('drop policy if exists %I_update on %I', tbl, tbl);
  execute format('drop policy if exists %I_delete on %I', tbl, tbl);
  execute format('create policy %I_select on %I for select using (auth.uid() = user_id)', tbl, tbl);
  execute format('create policy %I_insert on %I for insert with check (auth.uid() = user_id)', tbl, tbl);
  execute format('create policy %I_update on %I for update using (auth.uid() = user_id)', tbl, tbl);
  execute format('create policy %I_delete on %I for delete using (auth.uid() = user_id)', tbl, tbl);
end;
$$;

select create_owner_policies('user_settings');
select create_owner_policies('projects');
select create_owner_policies('pillars');
select create_owner_policies('clusters');
select create_owner_policies('article_briefs');
select create_owner_policies('workflow_history');

-- profiles uses id instead of user_id
create policy profiles_select on profiles for select using (auth.uid() = id);
create policy profiles_insert on profiles for insert with check (auth.uid() = id);
create policy profiles_update on profiles for update using (auth.uid() = id);
create policy profiles_delete on profiles for delete using (auth.uid() = id);
