-- growth.sql — acquisition source, referrals, funnel analytics.
-- Run in Supabase SQL Editor after anticheat.sql and reminders.sql.
-- All tables are service-role only (RLS on, everything revoked), like players.

create table if not exists public.acquisition (
    telegram_id text primary key,
    source text,
    referrer text,
    first_seen timestamptz not null default now()
);

create table if not exists public.referrals (
    referee text primary key,
    referrer text not null,
    created_at timestamptz not null default now(),
    completed_at timestamptz,
    rewarded_at timestamptz,
    check (referee <> referrer)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer);

create table if not exists public.funnel_events (
    id bigint generated always as identity primary key,
    telegram_id text not null,
    name text not null,
    props jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);
create index if not exists funnel_events_name_idx on public.funnel_events (name, created_at);
create index if not exists funnel_events_user_idx on public.funnel_events (telegram_id, created_at);

alter table public.acquisition enable row level security;
alter table public.referrals enable row level security;
alter table public.funnel_events enable row level security;
revoke all on public.acquisition from public, anon, authenticated;
revoke all on public.referrals from public, anon, authenticated;
revoke all on public.funnel_events from public, anon, authenticated;
