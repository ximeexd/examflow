// examflow-api — server-authoritative progression for the Telegram Mini App.
//
// Browser code still computes rewards locally for instant feedback; this
// function is the only writer of the durable economy state. Every mutation
// arrives as an idempotent client event that is validated here:
//   finish_lesson — answer picks checked against answer_keys, lesson gating
//     and unlock order checked against curriculum_topics, duration floor,
//     per-day XP cap.
//   practice      — mix / mistakes review sessions.
//   claim         — daily/weekly quests and the daily chest, conditions
//     recomputed from server counters only.
//   profile       — whitelisted non-economy fields (name, exam, settings...).
//   migrate       — one-time import of existing local progress, allowed only
//     while the account row does not exist.
//   reset         — wipe economy and profile.
// Auth: `auth` verifies Telegram initData once and returns a 30-day session
// token (stateless HMAC). All other actions take {session}.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// ---- Telegram initData validation (first-party HMAC per
// https://core.telegram.org/bots/webapps: every field except `hash` goes into
// the sorted data-check string; `signature` stays). Bot token is only ever an
// HMAC key and is never returned. -------------------------------------------
const encoder = new TextEncoder();

async function hmacBytes(key: Uint8Array, value: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)));
}
function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function validateTelegramInitData(
  initData: string,
  botToken: string,
  nowSeconds: number,
): Promise<{ id: string; name: string }> {
  if (!botToken || typeof initData !== "string" || !initData || initData.length > 8192) {
    throw new Error("invalid_init_data");
  }
  const params = new URLSearchParams(initData);
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) throw new Error("invalid_init_data");
  const hash = params.get("hash");
  const timestamp = params.get("auth_date");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash) || !timestamp || !/^\d{10,}$/.test(timestamp)) {
    throw new Error("invalid_init_data");
  }
  const issued = Number(timestamp);
  if (!Number.isSafeInteger(issued) || issued > nowSeconds + 30 || nowSeconds - issued > 300) {
    throw new Error("expired_init_data");
  }
  const check = keys
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${params.get(key)}`)
    .join("\n");
  const secret = await hmacBytes(encoder.encode("WebAppData"), botToken);
  const expected = await hmacBytes(secret, check);
  const given = new Uint8Array(hash.match(/.{2}/g)!.map((pair) => parseInt(pair, 16)));
  if (!timingSafeEqual(expected, given)) throw new Error("invalid_init_data");
  let user: { id?: unknown; first_name?: unknown } | null = null;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    throw new Error("invalid_init_data");
  }
  if (!user || !Number.isSafeInteger(user.id) || (user.id as number) <= 0) {
    throw new Error("invalid_init_data");
  }
  return {
    id: String(user.id),
    name: typeof user.first_name === "string" ? user.first_name.trim().slice(0, 50) : "",
  };
}

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const origins = new Set((Deno.env.get("APP_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean));
const admin = serviceKey && supabaseUrl ? createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) : null;

const SESSION_TTL = 30 * 24 * 3600; // seconds

// ---- economy constants: mirror state.js exactly ---------------------------
const DAILY_REWARDS: Record<string, { xp: number; c: number }> = {
  d1: { xp: 30, c: 10 }, d2: { xp: 20, c: 5 }, d3: { xp: 25, c: 10 }, d4: { xp: 50, c: 20 },
};
const WEEKLY_REWARDS: Record<string, { xp: number; c: number }> = {
  w1: { xp: 150, c: 60 }, w2: { xp: 100, c: 40 }, w3: { xp: 200, c: 100 },
};
const CHEST = { xp: 100, c: 50 };
const XP_CAP_DAY = 1200;
const PRACTICE_CAP_DAY = 40;
const MIN_LESSON_MS = 0;
const MAX_LESSON_MS = 2 * 3600 * 1000;
const MAX_XP = 1e7;
const LESSON_CAP_DAY = 40;
const MAX_BODY_BYTES = 65536;
const EVENTS_PER_MINUTE = 150;
const EVENT_KINDS = new Set(["finish_lesson", "practice", "claim", "profile", "reset"]);
const EVENT_ID_RE = /^[\w.:-]{1,80}$/;
const QID_RE = /^[^\s",()\\]{1,200}$/u;
// Set MIGRATION_OPEN=0 in the function secrets once the one-time import of
// pre-server progress is no longer needed: new accounts then start from zero.
const MIGRATION_OPEN = Deno.env.get("MIGRATION_OPEN") !== "0";

const SUBJECT_ALIASES: Record<string, Record<string, string>> = {
  oge: { "Базовая математика": "Математика", "Профильная математика": "Математика", "Английский язык": "Английский" },
  ege: { "Математика": "Базовая математика", "Английский язык": "Английский" },
};

// ---- helpers ---------------------------------------------------------------
const json = (body: unknown, status: number, origin: string) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    Vary: "Origin",
  },
});

function err(message: string): never { throw new Error(message); }

// Reads the body with a hard byte limit; the Content-Length header alone can
// be absent (chunked) or wrong.
async function readJsonLimited(request: Request, max: number): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) err("invalid_request");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader!.read();
    if (done) break;
    total += value.length;
    if (total > max) { await reader!.cancel(); err("too_large"); }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.length; }
  try { return JSON.parse(new TextDecoder().decode(all)); } catch { err("invalid_request"); }
}

const num = (v: unknown, d: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : d;
};
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
const validDay = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + "T00:00:00Z").getTime());
const validWk = (v: unknown) => typeof v === "string" && /^\d{4}-W\d{1,2}$/.test(v);

function dayStrUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function plusDays(day: string, delta: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return dayStrUTC(d);
}
function isoWeekUTC(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return x.getUTCFullYear() + "-W" + Math.ceil((((x.getTime() - y0.getTime()) / 864e5) + 1) / 7);
}
interface Econ {
  xp: number; coins: number;
  streak: number; lastActive: string;
  days: string[]; dayLog: Record<string, number>;
  prog: Record<string, number>;
  totalCorrect: number; cleanTotal: number;
  mistakeIds: string[];
  today: { date: string; started: number; lessons: number; correct: number; mistakes: number; clean: number; chest: number; claimedIds: string[]; xp: number };
  week: { wk: string; correct: number; lessons: number; claimed: string[] };
  xpDay: { date: string; earned: number };
  practiceDay: { date: string; count: number };
}
const freshToday = (date: string) => ({ date, started: 0, lessons: 0, correct: 0, mistakes: 0, clean: 0, chest: 0, claimedIds: [] as string[], xp: 0 });
const freshWeek = (wk: string) => ({ wk, correct: 0, lessons: 0, claimed: [] as string[] });
const freshEcon = (): Econ => ({
  xp: 0, coins: 0, streak: 0, lastActive: "", days: [], dayLog: {}, prog: {},
  totalCorrect: 0, cleanTotal: 0, mistakeIds: [],
  today: freshToday(""), week: freshWeek(""), xpDay: { date: "", earned: 0 }, practiceDay: { date: "", count: 0 },
});

const DANGER = new Set(["__proto__", "constructor", "prototype"]);

// Sanitize a stored/migrated economy snapshot: same clamps as client
// normalizeState. Pass knownTopicKeys only for untrusted migration input;
// stored server state was already validated when written.
function normEcon(raw: unknown, knownTopicKeys: Set<string> | null): Econ {
  const r = (typeof raw === "object" && raw && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  const e = freshEcon();
  e.xp = num(r.xp, 0, 0, MAX_XP);
  e.coins = num(r.coins, 0, 0, MAX_XP);
  e.streak = num(r.streak, 0, 0, 1e4);
  e.totalCorrect = num(r.totalCorrect, 0, 0, MAX_XP);
  e.cleanTotal = num(r.cleanTotal, 0, 0, 1e6);
  e.lastActive = validDay(r.lastActive) ? str(r.lastActive, 10) : "";
  if (Array.isArray(r.days)) e.days = [...new Set(r.days.filter(validDay))].slice(-120) as string[];
  if (typeof r.prog === "object" && r.prog) {
    for (const k of Object.keys(r.prog as object)) {
      if (DANGER.has(k)) continue;
      const val = num((r.prog as Record<string, unknown>)[k], 0, 0, 10);
      if (val > 0 && k.length <= 300 && (!knownTopicKeys || knownTopicKeys.has(k))) e.prog[k] = val;
    }
  }
  if (typeof r.dayLog === "object" && r.dayLog) {
    for (const k of Object.keys(r.dayLog as object)) {
      if (DANGER.has(k) || !validDay(k)) continue;
      const val = num((r.dayLog as Record<string, unknown>)[k], 0, 0, 1e4);
      if (val > 0) e.dayLog[k] = val;
    }
  }
  const t = (typeof r.today === "object" && r.today) ? r.today as Record<string, unknown> : {};
  e.today.date = validDay(t.date) ? str(t.date, 10) : "";
  for (const f of ["started", "lessons", "correct", "mistakes", "clean", "chest", "xp"] as const) {
    e.today[f] = num(t[f], 0, 0, 1e6);
  }
  if (Array.isArray(t.claimedIds)) {
    e.today.claimedIds = [...new Set((t.claimedIds as unknown[]).filter((x) => typeof x === "string" && x in DAILY_REWARDS))] as string[];
  }
  const w = (typeof r.week === "object" && r.week) ? r.week as Record<string, unknown> : {};
  e.week.wk = validWk(w.wk) ? str(w.wk, 10) : "";
  e.week.correct = num(w.correct, 0, 0, 1e6);
  e.week.lessons = num(w.lessons, 0, 0, 1e6);
  if (Array.isArray(w.claimed)) {
    e.week.claimed = [...new Set((w.claimed as unknown[]).filter((x) => typeof x === "string" && x in WEEKLY_REWARDS))] as string[];
  }
  if (Array.isArray(r.mistakeIds)) {
    e.mistakeIds = [...new Set((r.mistakeIds as unknown[]).filter((x) => typeof x === "string"))].slice(0, 60) as string[];
  } else if (Array.isArray((r as Record<string, unknown>).mistakes)) {
    const ids = ((r as Record<string, unknown>).mistakes as unknown[])
      .map((m) => (m && typeof m === "object" ? (m as Record<string, unknown>).id : null))
      .filter((x) => typeof x === "string") as string[];
    e.mistakeIds = [...new Set(ids)].slice(0, 60);
  }
  return e;
}

function normProfile(raw: unknown): Record<string, unknown> {
  const r = (typeof raw === "object" && raw && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  const p: Record<string, unknown> = {};
  if (typeof r.name === "string") p.name = r.name.replace(/[<>&"']/g, "").slice(0, 50) || "Ученик";
  if (r.exam === "oge" || r.exam === "ege") p.exam = r.exam;
  if (typeof r.active === "string") p.active = r.active.slice(0, 60);
  if (r.onboarded !== undefined) p.onboarded = r.onboarded ? 1 : 0;
  if (r.subs === null) p.subs = null;
  else if (Array.isArray(r.subs)) p.subs = r.subs.filter((x) => typeof x === "string").map((x) => x.slice(0, 60)).slice(0, 30);
  if (r.goal !== undefined) p.goal = num(r.goal, 10, 5, 120);
  if (typeof r.settings === "object" && r.settings && !Array.isArray(r.settings)) {
    const s = r.settings as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    out.goal = num(s.goal, 10, 5, 120);
    if (typeof s.remind === "boolean") out.remind = s.remind;
    if (typeof s.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) out.time = s.time;
    // minutes east of UTC (client sends -getTimezoneOffset()) — used by
    // examflow-remind to fire at the player's local settings.time
    if (Number.isFinite(Number(s.tz))) out.tz = Math.min(840, Math.max(-720, Math.round(Number(s.tz))));
    if (typeof s.sound === "boolean") out.sound = s.sound;
    if (typeof s.dates === "object" && s.dates) {
      const d: Record<string, string> = {};
      for (const k of ["oge", "ege"]) {
        const v = (s.dates as Record<string, unknown>)[k];
        if (validDay(v)) d[k] = str(v, 10);
      }
      out.dates = d;
    }
    if (typeof s.cust === "object" && s.cust) {
      const c: Record<string, boolean> = {};
      for (const k of ["oge", "ege"]) {
        if (typeof (s.cust as Record<string, unknown>)[k] === "boolean") c[k] = !!(s.cust as Record<string, unknown>)[k];
      }
      out.cust = c;
    }
    p.settings = out;
  }
  return p;
}

// Untrusted one-time import: keep only values a real history could explain.
// Volatile period state (today/week/caps/claims) is never imported, otherwise a
// brand-new account could fabricate quest progress and claim rewards at once.
function sanitizeMigration(e: Econ, todayUtc: string): Econ {
  const horizon = plusDays(todayUtc, 1);
  e.days = e.days.filter((d) => d <= horizon).slice(-60);
  for (const k of Object.keys(e.dayLog)) {
    if (k > horizon) delete e.dayLog[k];
    else e.dayLog[k] = Math.min(e.dayLog[k], 60);
  }
  const progVals = Object.values(e.prog);
  const lessons = progVals.reduce((a, b) => a + b, 0);
  const done = progVals.filter((v) => v >= 10).length;
  const activeDays = Math.max(1, e.days.length);
  e.xp = Math.min(e.xp, lessons * 35 + done * 30 + activeDays * 1500);
  e.coins = Math.min(e.coins, lessons * 10 + done * 15 + activeDays * 400);
  e.totalCorrect = Math.min(e.totalCorrect, lessons * 5 + activeDays * 400);
  e.cleanTotal = Math.min(e.cleanTotal, e.totalCorrect);
  e.streak = Math.min(e.streak, e.days.length < 60 ? e.days.length : 365);
  if (e.lastActive > horizon) e.lastActive = "";
  e.today = freshToday("");
  e.week = freshWeek("");
  e.xpDay = { date: "", earned: 0 };
  e.practiceDay = { date: "", count: 0 };
  return e;
}

// ---- economy transitions ---------------------------------------------------
function rollPeriods(e: Econ, day: string, wk: string) {
  if (e.today.date !== day) e.today = freshToday(day);
  if (e.week.wk !== wk) e.week = freshWeek(wk);
  if (e.lastActive && e.lastActive < plusDays(day, -1) && e.streak !== 0) e.streak = 0;
}
function markActive(e: Econ, day: string) {
  if (e.lastActive === day) { if (!e.days.includes(day)) e.days.push(day); return; }
  e.streak = e.lastActive === plusDays(day, -1) ? e.streak + 1 : 1;
  e.lastActive = day;
  if (!e.days.includes(day)) e.days.push(day);
  e.days = e.days.slice(-60);
}
// Earned XP from lessons/practice is capped per client-day; quest rewards are
// self-limiting and bypass the cap.
function grant(e: Econ, xp: number, day: string): number {
  if (e.xpDay.date !== day) e.xpDay = { date: day, earned: 0 };
  const room = Math.max(0, XP_CAP_DAY - e.xpDay.earned);
  const g = Math.min(Math.max(0, xp), room, MAX_XP - e.xp);
  e.xp += g; e.xpDay.earned += g; e.today.xp += g;
  return g;
}
function grantUncapped(e: Econ, xp: number, coins: number) {
  e.xp = Math.min(MAX_XP, e.xp + Math.max(0, xp));
  e.today.xp += Math.max(0, xp);
  e.coins = Math.min(MAX_XP, e.coins + Math.max(0, coins));
}
function weekDays(e: Econ, wk: string): number {
  return new Set(e.days.filter((d) => d <= e.today.date && isoWeekUTC(new Date(d + "T12:00:00Z")) === wk)).size;
}

async function sessionSecret(): Promise<Uint8Array> {
  return hmacBytes(encoder.encode("examflow-session-v1"), botToken);
}
async function issueSession(tg: string, now: number): Promise<string> {
  const exp = now + SESSION_TTL;
  const payload = `ef1.${tg}.${exp}`;
  return `${payload}.${hex(await hmacBytes(await sessionSecret(), payload))}`;
}
async function readSession(token: unknown, now: number): Promise<string> {
  if (typeof token !== "string" || !/^ef1\.\d{1,20}\.\d{10,}\.[0-9a-f]{64}$/.test(token)) err("bad_session");
  const parts = token.split(".");
  const payload = parts.slice(0, 3).join(".");
  const expected = hex(await hmacBytes(await sessionSecret(), payload));
  if (!timingSafeEqual(encoder.encode(expected), encoder.encode(parts[3]))) err("bad_session");
  if (Number(parts[2]) < now) err("expired_session");
  return parts[1];
}

// Canonical prog key uses the subject exactly as the client displays it,
// because client progress keys do the same.
const progKey = (exam: string, subject: string, topic: string) => `${exam}:${subject}:${topic}`;

interface Ctx { admin: NonNullable<typeof admin>; tg: string; e: Econ; now: Date }

async function applyEvent(ctx: Ctx, ev: Record<string, unknown>): Promise<void> {
  const { admin, e } = ctx;
  const now = ctx.now;
  const kind = str(ev.kind, 32);
  const p = (typeof ev.payload === "object" && ev.payload) ? ev.payload as Record<string, unknown> : {};
  let day = validDay(ev.day) ? str(ev.day, 10) : "";
  if (!day) err("bad_day");
  // future days are rejected; days older than the plausible window are
  // clamped so long-queued offline events keep their reward instead of
  // being dropped (daily caps still bound the effect)
  if (day > plusDays(dayStrUTC(now), 1)) err("bad_day");
  if (day < plusDays(dayStrUTC(now), -1)) day = plusDays(dayStrUTC(now), -1);
  // periods never roll backwards: an out-of-order event from an earlier day
  // merges into the current period instead of wiping its counters
  if (e.today.date && day < e.today.date) day = e.today.date;
  // the week is always derived from the clamped day — the client's wk is a
  // hint only and never trusted
  rollPeriods(e, day, isoWeekUTC(new Date(day + "T12:00:00Z")));

  if (kind === "finish_lesson") {
    const exam = str(p.exam, 8);
    if (exam !== "oge" && exam !== "ege") err("bad_exam");
    const subject = str(p.subject, 60);
    const canonical = SUBJECT_ALIASES[exam]?.[subject] || subject;
    const topic = str(p.topic, 200);
    const lesson = num(p.lesson, 0, 0, 100);
    const duration = num(p.durationMs, 0, 0, 1e9);
    if (lesson < 1 || lesson > 10) err("bad_lesson");
    if (duration < MIN_LESSON_MS || duration > MAX_LESSON_MS) err("bad_duration");
    if (e.today.lessons >= LESSON_CAP_DAY) err("rate_limited");

    const { data: topicRow } = await admin.from("curriculum_topics")
      .select("ord").eq("exam", exam).eq("subject", subject).eq("topic_key", topic).maybeSingle();
    if (!topicRow) err("unknown_topic");

    const rawAnswers = Array.isArray(p.answers) ? p.answers : [];
    if (rawAnswers.length !== 5) err("bad_answers");
    const ids = new Set<string>();
    const picks = new Map<string, number>();
    for (const a of rawAnswers) {
      const id = str((a as Record<string, unknown>)?.id, 200);
      const pick = num((a as Record<string, unknown>)?.pick, -1, -1, 10);
      if (!id || !QID_RE.test(id) || pick < 0 || pick > 3 || ids.has(id)) err("bad_answers");
      ids.add(id); picks.set(id, pick);
    }
    const { data: keys } = await admin.from("answer_keys")
      .select("qid,ans,exam,subject,topic_key,lesson").in("qid", [...ids]);
    if (!keys || keys.length !== 5) err("bad_answers");
    for (const k of keys) {
      if (k.exam !== exam || k.subject !== canonical || k.topic_key !== topic || k.lesson !== lesson) {
        err("bad_answers");
      }
    }

    // unlock order: previous topic (ord-1) must be finished
    if ((topicRow.ord as number) > 0) {
      const { data: prev } = await admin.from("curriculum_topics")
        .select("topic_key").eq("exam", exam).eq("subject", subject).eq("ord", (topicRow.ord as number) - 1).maybeSingle();
      if (prev && (e.prog[progKey(exam, subject, prev.topic_key)] || 0) < 10) err("locked");
    }
    const key = progKey(exam, subject, topic);
    const cur = e.prog[key] || 0;
    if (lesson > cur + 1) err("locked");

    markActive(e, day);
    e.today.started++;
    const first = e.today.started === 1;

    let right = 0;
    const wrongIds: string[] = [];
    for (const k of keys) {
      if (picks.get(k.qid) === k.ans) right++;
      else wrongIds.push(k.qid);
    }
    const prevCorrect = e.today.correct;
    e.today.correct += right; e.week.correct += right; e.totalCorrect += right;
    const bonus = prevCorrect < 5 && e.today.correct >= 5 ? 15 : 0;
    for (const id of wrongIds) {
      e.mistakeIds = [id, ...e.mistakeIds.filter((x) => x !== id)].slice(0, 60);
    }
    const advance = lesson === cur + 1 && cur < 10;
    let xp = 2 * right + bonus + (first ? 5 : 0);
    let coins = 0;
    if (advance) {
      e.prog[key] = cur + 1;
      xp += 20; coins += 10;
      if (cur + 1 >= 10) { xp += 30; coins += 15; }
    } else {
      xp += 5;
    }
    if (right === 5) { e.today.clean++; e.cleanTotal++; }
    e.today.lessons++; e.week.lessons++;
    e.dayLog[day] = (e.dayLog[day] || 0) + 1;
    grant(e, xp, day);
    grantUncapped(e, 0, coins);
    return;
  }

  if (kind === "practice") {
    const mode = str(p.mode, 16);
    if (mode !== "mix" && mode !== "mistakes") err("bad_mode");
    if (e.practiceDay.date !== day) e.practiceDay = { date: day, count: 0 };
    if (e.practiceDay.count >= PRACTICE_CAP_DAY) err("rate_limited");
    e.practiceDay.count++;

    markActive(e, day);
    e.today.started++;
    const first = e.today.started === 1;

    const rawAnswers = Array.isArray(p.answers) ? p.answers : [];
    if (!rawAnswers.length || rawAnswers.length > 10) err("bad_answers");
    const ids = new Set<string>();
    const picks = new Map<string, number>();
    for (const a of rawAnswers) {
      const id = str((a as Record<string, unknown>)?.id, 200);
      const pick = num((a as Record<string, unknown>)?.pick, -1, -1, 10);
      if (!id || !QID_RE.test(id) || pick < 0 || pick > 3 || ids.has(id)) err("bad_answers");
      ids.add(id); picks.set(id, pick);
    }
    let right = 0;
    const correctIds: string[] = [];
    if (ids.size) {
      const { data: keys } = await admin.from("answer_keys").select("qid,ans").in("qid", [...ids]);
      const found = new Map((keys || []).map((k) => [k.qid, k.ans]));
      for (const [id, pick] of picks) {
        if (!found.has(id)) err("bad_answers");
        if (found.get(id) === pick) { right++; correctIds.push(id); }
      }
    }
    const prevCorrect = e.today.correct;
    e.today.correct += right; e.week.correct += right; e.totalCorrect += right;
    const bonus = prevCorrect < 5 && e.today.correct >= 5 ? 15 : 0;
    if (mode === "mistakes") {
      // a correctly-answered question leaves the review list, like the client
      for (const id of correctIds) {
        if (e.mistakeIds.includes(id)) {
          e.mistakeIds = e.mistakeIds.filter((x) => x !== id);
          e.today.mistakes++;
        }
      }
    }
    if (rawAnswers.length === 5 && right === 5) { e.today.clean++; e.cleanTotal++; }
    grant(e, 5 + 2 * right + bonus + (first ? 5 : 0), day);
    return;
  }

  if (kind === "claim") {
    const what = str(p.kind, 16);
    const id = str(p.id, 8);
    if (what === "daily") {
      const conds: Record<string, boolean> = {
        d1: e.today.lessons >= 1, d2: e.today.correct >= 5,
        d3: e.today.mistakes >= 1, d4: e.today.clean >= 1,
      };
      if (!(id in DAILY_REWARDS) || !conds[id] || e.today.claimedIds.includes(id)) err("claim_denied");
      e.today.claimedIds.push(id);
      const r = DAILY_REWARDS[id];
      grantUncapped(e, r.xp, r.c);
      return;
    }
    if (what === "weekly") {
      const w = e.week.wk;
      const conds: Record<string, boolean> = {
        w1: weekDays(e, w) >= 5, w2: e.week.correct >= 50, w3: e.streak >= 7,
      };
      if (!(id in WEEKLY_REWARDS) || !conds[id] || e.week.claimed.includes(id)) err("claim_denied");
      e.week.claimed.push(id);
      const r = WEEKLY_REWARDS[id];
      grantUncapped(e, r.xp, r.c);
      return;
    }
    if (what === "chest") {
      const all = Object.keys(DAILY_REWARDS).every((d) => e.today.claimedIds.includes(d));
      if (!all || e.today.chest) err("claim_denied");
      e.today.chest = 1;
      grantUncapped(e, CHEST.xp, CHEST.c);
      return;
    }
    err("bad_claim");
  }

  if (kind === "profile") {
    // handled by caller (profile column), nothing to do in econ
    return;
  }

  if (kind === "reset") {
    const fresh = freshEcon();
    for (const k of Object.keys(e)) delete (e as Record<string, unknown>)[k];
    Object.assign(e, fresh);
    return;
  }

  err("bad_kind");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") || "";
  if (!origins.has(origin)) return new Response(null, { status: 403 });
  if (request.method === "OPTIONS") return json({}, 200, origin);
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (!admin || !botToken) return json({ error: "not_configured" }, 503, origin);
  try {
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return json({ error: "too_large" }, 413, origin);
    const body = await readJsonLimited(request, MAX_BODY_BYTES) as Record<string, any>;
    const action = str(body?.action, 16);
    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);

    if (action === "ping") return json({ ok: true }, 200, origin);

    if (action === "auth") {
      if (typeof body?.initData !== "string") return json({ error: "invalid_request" }, 400, origin);
      const telegram = await validateTelegramInitData(body.initData, botToken, nowSec);
      // opening the app proves the chat is reachable — re-enable reminders
      // if Telegram once rejected them (403 → remind_blocked). One cheap
      // guarded update; the column may not exist before reminders.sql runs.
      try {
        await admin.from("players").update({ remind_blocked: false })
          .eq("telegram_id", telegram.id).eq("remind_blocked", true);
      } catch { /* reminders optional */ }
      const { data: player } = await admin.from("players")
        .select("econ,profile,revision").eq("telegram_id", telegram.id).maybeSingle();
      const session = await issueSession(telegram.id, nowSec);
      return json({
        session,
        state: player ? { econ: player.econ, profile: player.profile, revision: player.revision } : null,
      }, 200, origin);
    }

    const tg = await readSession(body?.session, nowSec);
    const { data: player, error: loadError } = await admin.from("players")
      .select("econ,profile,revision,migrated").eq("telegram_id", tg).maybeSingle();
    if (loadError) throw loadError;

    if (action === "state") {
      return json({ state: player ? { econ: player.econ, profile: player.profile, revision: player.revision } : null }, 200, origin);
    }

    if (action === "migrate") {
      if (player) return json({ migrated: false, state: { econ: player.econ, profile: player.profile, revision: player.revision } }, 200, origin);
      const { data: topicRows } = await admin.from("curriculum_topics").select("exam,subject,topic_key");
      const known = new Set((topicRows || []).map((t) => `${t.exam}:${t.subject}:${t.topic_key}`));
      const econ = MIGRATION_OPEN
        ? sanitizeMigration(normEcon(body?.progress, known), dayStrUTC(now))
        : freshEcon();
      // keep only mistake ids that really exist
      if (econ.mistakeIds.length) {
        const { data: found } = await admin.from("answer_keys").select("qid").in("qid", econ.mistakeIds);
        const ok = new Set((found || []).map((f) => f.qid));
        econ.mistakeIds = econ.mistakeIds.filter((id) => ok.has(id));
      }
      const profile = normProfile(body?.profile);
      const { error: insErr } = await admin.from("players")
        .insert({ telegram_id: tg, econ, profile, revision: 1, migrated: true });
      if (insErr) {
        const { data: again } = await admin.from("players")
          .select("econ,profile,revision").eq("telegram_id", tg).maybeSingle();
        if (again) return json({ migrated: false, state: { econ: again.econ, profile: again.profile, revision: again.revision } }, 200, origin);
        throw insErr;
      }
      return json({ migrated: true, state: { econ, profile, revision: 1 } }, 200, origin);
    }

    if (!player) return json({ error: "no_account" }, 409, origin);

    if (action === "events") {
      const rawEvents = Array.isArray(body?.events) ? body.events : [];
      if (!rawEvents.length || rawEvents.length > 50) return json({ error: "invalid_request" }, 400, origin);
      // Idempotency gate first: every event id is recorded exactly once. A
      // retry of an already-processed event is skipped, never re-applied.
      const since = new Date(now.getTime() - 60000).toISOString();
      const { count: recent } = await admin.from("events")
        .select("id", { count: "exact", head: true }).eq("telegram_id", tg).gte("processed_at", since);
      if ((recent || 0) + rawEvents.length > EVENTS_PER_MINUTE) return json({ error: "rate_limited" }, 429, origin);
      const fresh: Record<string, unknown>[] = [];
      const skipped: string[] = [];
      const preRejected: { id: string; error: string }[] = [];
      for (const raw of rawEvents) {
        const ev = (typeof raw === "object" && raw) ? raw as Record<string, unknown> : {};
        const id = str(ev.id, 80);
        if (!id || !EVENT_ID_RE.test(id)) continue;
        if (!EVENT_KINDS.has(str(ev.kind, 32))) { preRejected.push({ id, error: "bad_kind" }); continue; }
        const { error: dupErr } = await admin.from("events")
          .insert({ telegram_id: tg, id, kind: str(ev.kind, 32) || "?" });
        if (dupErr) skipped.push(id); else fresh.push(ev);
      }

      // Optimistic concurrency: apply to a copy of the stored state and
      // compare-and-swap on revision. On conflict the not-yet-processed
      // events are replayed onto the fresh base (applyEvent is
      // deterministic); verdicts from the successful attempt are returned.
      for (let attempt = 1; attempt <= 3; attempt++) {
        const row = attempt === 1 ? player : (await admin.from("players")
          .select("econ,profile,revision").eq("telegram_id", tg).single()).data;
        if (!row) return json({ error: "no_account" }, 409, origin);
        const e = normEcon(row.econ, null); // stored state was validated when written
        const prof = (typeof row.profile === "object" && row.profile && !Array.isArray(row.profile))
          ? { ...(row.profile as Record<string, unknown>) } : {};
        const applied: string[] = [];
        const rejected: { id: string; error: string }[] = [];
        for (const ev of fresh) {
          const id = str(ev.id, 80);
          try {
            if (str(ev.kind, 32) === "profile") {
              const patch = normProfile(ev.payload);
              for (const k of Object.keys(patch)) prof[k] = patch[k];
            } else {
              await applyEvent({ admin, tg, e, now }, ev);
            }
            applied.push(id);
          } catch (ex) {
            rejected.push({ id, error: ex instanceof Error ? ex.message : "failed" });
          }
        }
        const nextRev = (row.revision as number) + 1;
        const { data: upd, error: upErr } = await admin.from("players")
          .update({ econ: e, profile: prof, revision: nextRev, updated_at: now.toISOString() })
          .eq("telegram_id", tg).eq("revision", row.revision)
          .select("revision");
        if (upErr) throw upErr;
        if (upd && upd.length) {
          return json({
            state: { econ: e, profile: prof, revision: nextRev },
            applied, skipped, rejected: rejected.concat(preRejected),
          }, 200, origin);
        }
        // revision moved under us — replay on the fresh base
      }
      return json({ error: "conflict" }, 409, origin);
    }

    return json({ error: "unknown_action" }, 400, origin);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "server_error";
    if (["invalid_init_data", "expired_init_data", "bad_session", "expired_session"].includes(msg)) {
      return json({ error: msg }, 401, origin);
    }
    if (msg === "too_large") return json({ error: msg }, 413, origin);
    if (msg === "invalid_request") return json({ error: msg }, 400, origin);
    return json({ error: "server_error" }, 500, origin);
  }
});
