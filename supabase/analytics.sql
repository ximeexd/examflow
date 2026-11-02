-- analytics.sql — ready-to-run reports for the Supabase SQL Editor (read-only).
-- Days are counted in Moscow time. Funnel/source data starts only from the
-- moment growth.sql + the new client/API were deployed; older players have no
-- acquisition row and show as 'direct'.

-- 1. New players per day by source
select (p.created_at at time zone 'Europe/Moscow')::date as day,
       coalesce(a.source, 'direct') as source,
       count(*) as new_players
from public.players p
left join public.acquisition a using (telegram_id)
group by 1, 2
order by 1 desc, 3 desc;

-- 2. Funnel: distinct users per step (all time)
select name, count(distinct telegram_id) as users, count(*) as events
from public.funnel_events
group by name
order by users desc;

-- 3. Retention by first-open cohort: D1 and D7 = opened the app exactly 1 / 7 days later
with first_open as (
    select telegram_id, min((created_at at time zone 'Europe/Moscow')::date) as d0
    from public.funnel_events where name = 'app_open' group by 1
), opens as (
    select distinct telegram_id, (created_at at time zone 'Europe/Moscow')::date as d
    from public.funnel_events where name = 'app_open'
)
select f.d0 as cohort_day,
       count(distinct f.telegram_id) as users,
       count(distinct a1.telegram_id) as d1,
       count(distinct a7.telegram_id) as d7
from first_open f
left join opens a1 on a1.telegram_id = f.telegram_id and a1.d = f.d0 + 1
left join opens a7 on a7.telegram_id = f.telegram_id and a7.d = f.d0 + 7
group by 1
order by 1 desc;

-- 4. Referrals per inviter: invited / first lesson done / reward granted
select referrer,
       count(*) as invited,
       count(completed_at) as activated,
       count(rewarded_at) as rewarded
from public.referrals
group by 1
order by invited desc;

-- 5. App opens that came from a reminder message vs all opens, per day
select (created_at at time zone 'Europe/Moscow')::date as day,
       count(*) filter (where props->>'src' = 'remind') as from_reminder,
       count(*) as total_opens
from public.funnel_events
where name = 'app_open'
group by 1
order by 1 desc;

-- 6. Active players: opened the app in the last 1 / 7 days
select count(distinct telegram_id) filter (where created_at > now() - interval '1 day') as dau,
       count(distinct telegram_id) filter (where created_at > now() - interval '7 days') as wau
from public.funnel_events
where name = 'app_open';
