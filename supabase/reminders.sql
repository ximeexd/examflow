-- reminders.sql — daily Duolingo-style study reminders.
-- Run in Supabase SQL Editor after anticheat.sql (+ anticheat_data.sql).
--
-- Adds reminder bookkeeping to players. RLS posture unchanged: `revoke all`
-- from anticheat.sql already limits reads/writes to the service role, which
-- is what the examflow-remind Edge Function uses.

alter table public.players
    add column if not exists last_reminded_on date,
    add column if not exists remind_blocked boolean not null default false;

-- last_reminded_on: player's LOCAL date (from their settings.tz offset) on
--   which the last reminder was sent — dedupes the 10-min cron ticks.
-- remind_blocked:   Telegram answered 403 (bot blocked / never /start-ed);
--   cleared by examflow-api `auth` when the user opens the app again.

-- ---------------------------------------------------------------------------
-- Scheduler — enable extensions once, then create the job (edit <ref> and
-- <CRON_SECRET>):
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select cron.schedule(
--   'examflow-remind',
--   '*/10 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://<ref>.supabase.co/functions/v1/examflow-remind',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', '<CRON_SECRET>'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- Inspect:  select * from cron.job;
-- Remove:   select cron.unschedule('examflow-remind');
