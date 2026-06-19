-- ============================================================
-- SendivTech Finance Ledger — Full Database Schema
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. EXPENSES TABLE
create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  amount        numeric not null check (amount > 0),
  date          date not null,
  category      text not null,
  note          text,
  receipt_path  text,       -- storage path inside the "receipts" bucket
  receipt_name  text,       -- original filename shown to the user
  created_at    timestamptz default now()
);

alter table expenses enable row level security;

create policy "Users manage their own expenses"
  on expenses for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. CLIENT PROJECTS TABLE
create table if not exists projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  client     text not null,
  project    text,
  service    text not null,
  total      numeric not null check (total > 0),
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "Users manage their own projects"
  on projects for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. PAYMENTS TABLE
--    Each project has up to 3 payment rows: advance, middle, final.
--    Cascade delete keeps the DB clean when a project is removed.
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       numeric not null check (amount > 0),
  date         date not null,
  note         text,
  receipt_path text,
  receipt_name text,
  created_at   timestamptz default now()
);

alter table payments enable row level security;

create policy "Users manage their own payments"
  on payments for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. STORAGE BUCKET (receipt images and PDFs)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Files live under a folder named after the owner's user id.
-- The policy checks the first path segment, so no user can ever
-- read, overwrite, or delete another user's files.
create policy "Users read their own receipts"
  on storage.objects for select
  using (bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload their own receipts"
  on storage.objects for insert
  with check (bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own receipts"
  on storage.objects for delete
  using (bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text);
