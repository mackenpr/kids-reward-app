-- ============================================================
-- Kids Rewards App – Supabase Setup
-- Run this entire file in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Tasks
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text not null check (category in ('daily','weekly','adhoc')),
  points integer not null default 10 check (points > 0),
  assigned_to text not null check (assigned_to in ('camden','ethan','both')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Profiles (one per auth user)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  role text not null check (role in ('kid','master')),
  avatar text default 'star',
  created_at timestamptz default now()
);

-- Task completions
create table if not exists task_completions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  kid_username text not null check (kid_username in ('camden','ethan')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz default now(),
  approved_at timestamptz,
  rejection_reason text
);

-- Point transactions (audit log)
create table if not exists point_transactions (
  id uuid default gen_random_uuid() primary key,
  kid_username text not null check (kid_username in ('camden','ethan')),
  amount integer not null,
  type text not null check (type in ('earned','redeemed','bonus')),
  description text not null,
  related_completion_id uuid references task_completions(id),
  related_redemption_id uuid,
  created_at timestamptz default now()
);

-- Redemption requests
create table if not exists redemption_requests (
  id uuid default gen_random_uuid() primary key,
  kid_username text not null check (kid_username in ('camden','ethan')),
  points_amount integer not null check (points_amount > 0),
  prize_description text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz default now(),
  approved_at timestamptz,
  rejection_reason text
);

-- Prizes
create table if not exists prizes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  points_cost integer,
  prize_type text not null default 'activity' check (prize_type in ('activity','dollar','custom')),
  dollar_value decimal(10,2),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- App settings (singleton row)
create table if not exists app_settings (
  id integer primary key default 1,
  points_per_dollar decimal(10,4),
  weekly_bonus_multiplier decimal(4,2) default 1.5,
  updated_at timestamptz default now(),
  constraint singleton check (id = 1)
);
insert into app_settings (id) values (1) on conflict do nothing;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table task_completions enable row level security;
alter table point_transactions enable row level security;
alter table redemption_requests enable row level security;
alter table prizes enable row level security;
alter table app_settings enable row level security;

-- Helper: current user's role
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- Helper: current user's username
create or replace function get_my_username()
returns text language sql security definer stable as $$
  select username from profiles where id = auth.uid()
$$;

-- Profiles
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Tasks
drop policy if exists "tasks_select" on tasks;
drop policy if exists "tasks_master_insert" on tasks;
drop policy if exists "tasks_master_update" on tasks;
drop policy if exists "tasks_master_delete" on tasks;
create policy "tasks_select" on tasks for select using (true);
create policy "tasks_master_insert" on tasks for insert with check (get_my_role() = 'master');
create policy "tasks_master_update" on tasks for update using (get_my_role() = 'master');
create policy "tasks_master_delete" on tasks for delete using (get_my_role() = 'master');

-- Task completions
drop policy if exists "completions_select" on task_completions;
drop policy if exists "completions_kid_insert" on task_completions;
drop policy if exists "completions_master_update" on task_completions;
create policy "completions_select" on task_completions for select using (true);
create policy "completions_kid_insert" on task_completions for insert with check (
  kid_username = get_my_username() or get_my_role() = 'master'
);
create policy "completions_master_update" on task_completions for update using (get_my_role() = 'master');

-- Point transactions
drop policy if exists "points_select" on point_transactions;
drop policy if exists "points_master_insert" on point_transactions;
create policy "points_select" on point_transactions for select using (true);
create policy "points_master_insert" on point_transactions for insert with check (get_my_role() = 'master');

-- Redemption requests
drop policy if exists "redemptions_select" on redemption_requests;
drop policy if exists "redemptions_kid_insert" on redemption_requests;
drop policy if exists "redemptions_master_update" on redemption_requests;
create policy "redemptions_select" on redemption_requests for select using (true);
create policy "redemptions_kid_insert" on redemption_requests for insert with check (
  kid_username = get_my_username() or get_my_role() = 'master'
);
create policy "redemptions_master_update" on redemption_requests for update using (get_my_role() = 'master');

-- Prizes
drop policy if exists "prizes_select" on prizes;
drop policy if exists "prizes_master_all" on prizes;
create policy "prizes_select" on prizes for select using (true);
create policy "prizes_master_all" on prizes for all using (get_my_role() = 'master');

-- App settings
drop policy if exists "settings_select" on app_settings;
drop policy if exists "settings_master_update" on app_settings;
create policy "settings_select" on app_settings for select using (true);
create policy "settings_master_update" on app_settings for update using (get_my_role() = 'master');
