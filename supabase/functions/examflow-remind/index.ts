// examflow-remind — scheduled Duolingo-style daily study reminders.
//
// Triggered by pg_cron/pg_net every ~10 minutes (see supabase/reminders.sql)
// with header `x-cron-secret`. For every player whose local time has reached
// their settings.time (within a 3h window) and who has neither studied nor
// been reminded today, sends one Telegram message via the existing bot token.
// telegram_id IS the private chat id, so sendMessage works directly.
//
// Safety: 403 (user blocked the bot / never pressed Start) marks
// remind_blocked=true — reset when the user opens the app again (auth action
// in examflow-api). 429 respects retry_after by stopping the whole run —
// the next cron tick resumes. Sends are throttled and capped per run.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { decideDue, reminderText } from "./due.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const cronSecret = Deno.env.get("CRON_SECRET") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const WEBAPP_URL = "https://ximeexd.github.io/examflow/";
const PAGE = 500;
const MAX_SENDS = 2000;
const SEND_INTERVAL_MS = 55; // ~18 msgs/s, safely under the 20/s bot limit

const admin = serviceKey && supabaseUrl ? createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
}) : null;

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Job { chatId: string; localDay: string; text: string }

async function sendTelegram(job: Job): Promise<Response> {
    return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: job.chatId,
            text: job.text,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Начать занятие", web_app: { url: `${WEBAPP_URL}?src=remind` } }],
                    [{ text: "Настроить напоминания", web_app: { url: `${WEBAPP_URL}profile.html?settings=1&src=remind` } }],
                ],
            },
        }),
    });
}

Deno.serve(async (request) => {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
        return json({ error: "unauthorized" }, 401);
    }
    if (!admin || !botToken) return json({ error: "not_configured" }, 503);

    const nowMs = Date.now();
    let sent = 0, skipped = 0, blocked = 0, stopped = false;
    try {
        // Pass 1 — collect due players. Selection happens fully before any
        // mutation: marking remind_blocked mid-scan could shift .range()
        // pages and skip rows (telegram_id is text, so >-cursor order is
        // unsafe for mixed-length ids).
        const due: Job[] = [];
        for (let from = 0; ; from += PAGE) {
            const { data, error } = await admin.from("players")
                .select("telegram_id,econ,profile,last_reminded_on")
                .eq("remind_blocked", false)
                .order("telegram_id")
                .range(from, from + PAGE - 1);
            if (error) throw error;
            if (!data || !data.length) break;
            for (const p of data) {
                const d = decideDue(p, nowMs);
                if (!d.due) { skipped++; continue; }
                const streak = Number((p.econ as Record<string, unknown>)?.streak) || 0;
                const exam = String((p.profile as Record<string, unknown>)?.exam || "");
                const neverStudied = !(p.econ as Record<string, unknown>)?.lastActive;
                due.push({
                    chatId: String(p.telegram_id),
                    localDay: d.localDay as string,
                    text: reminderText(streak, exam, d.localDay as string, neverStudied),
                });
            }
            if (data.length < PAGE || due.length >= MAX_SENDS) break;
        }

        // Pass 2 — send with throttle + cap.
        for (const job of due.slice(0, MAX_SENDS)) {
            const r = await sendTelegram(job);
            if (r.status === 429) {
                // Telegram rate limit: honour retry_after by stopping the run;
                // the next cron tick picks everyone up again (last_reminded_on
                // is only written on success, so nobody is skipped forever).
                stopped = true;
                break;
            }
            if (r.status === 403) {
                blocked++;
                await admin.from("players")
                    .update({ remind_blocked: true })
                    .eq("telegram_id", job.chatId);
            } else if (r.ok) {
                sent++;
                await admin.from("players")
                    .update({ last_reminded_on: job.localDay })
                    .eq("telegram_id", job.chatId);
            }
            // other statuses (4xx/5xx): leave untouched — next tick retries.
            await sleep(SEND_INTERVAL_MS);
        }
        return json({ sent, skipped, blocked, stopped }, 200);
    } catch {
        return json({ error: "server_error", sent, skipped, blocked }, 500);
    }
});
