// examflow-remind — due-selection logic for daily reminders.
// Deliberately plain JavaScript with `export` keywords only: valid as a Deno
// TS module AND directly evaluable by tests (strip `export ` to load it as a
// classic script — see due.test.js / run_tests.py).
//
// A player is due when ALL of these hold at the same instant:
//   - not remind_blocked (Telegram rejected a previous send with 403)
//   - settings.remind !== false        (default true)
//   - local time >= settings.time AND < settings.time + 3h (10-min cron ticks
//     get a 3h grace window for users whose time passed while we were down)
//   - last_reminded_on !== localDay    (once per local day)
//   - econ.lastActive !== localDay     (already studied today — Duo never nags)

const DEFAULT_TZ = 180;       // minutes east of UTC — MSK when no device tz yet
const REMIND_WINDOW_MIN = 180; // 3h late window
const DEFAULT_TIME_MIN = 18 * 60; // '18:00'

export function clampTz(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return DEFAULT_TZ;
    return Math.min(840, Math.max(-720, Math.round(n)));
}

// Player-local date + minutes-since-midnight: shift epoch by tz then read UTC
// fields — DST-safe because tz is a fixed offset, not a zone.
export function localParts(nowUtcMs, tzMin) {
    const d = new Date(nowUtcMs + clampTz(tzMin) * 60000);
    const day = d.getUTCFullYear() + '-' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(d.getUTCDate()).padStart(2, '0');
    return { day: day, min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export function parseTimeMin(v) {
    const m = typeof v === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
    return m ? (+m[1]) * 60 + (+m[2]) : DEFAULT_TIME_MIN;
}

// p: {remind_blocked, last_reminded_on:'YYYY-MM-DD'|null,
//     econ:{streak,lastActive}, profile:{exam,settings:{remind,time,tz}}}
// Returns {due, reason, localDay, localMin}.
export function decideDue(p, nowUtcMs) {
    if (!p || p.remind_blocked) return { due: false, reason: 'blocked' };
    const s = (p.profile && p.profile.settings) || {};
    if (s.remind === false) return { due: false, reason: 'off' };
    const loc = localParts(nowUtcMs, s.tz);
    const want = parseTimeMin(s.time);
    const r = { due: false, localDay: loc.day, localMin: loc.min };
    if (loc.min < want) return Object.assign(r, { reason: 'early' });
    if (loc.min >= want + REMIND_WINDOW_MIN) return Object.assign(r, { reason: 'late' });
    if (p.last_reminded_on === loc.day) return Object.assign(r, { reason: 'done' });
    if (p.econ && p.econ.lastActive === loc.day) return Object.assign(r, { reason: 'studied' });
    return Object.assign(r, { due: true, reason: 'due' });
}

// Duolingo-style Russian copy; deterministic pick by local day so repeated
// runs/tests are stable and different days vary.
const VARIANTS_STREAK = [
    function (n) { return '🔥 Серия ' + n + ' дн. под угрозой! 5 минут — и она продолжится.'; },
    function (n) { return '🔥 ' + n + ' дн. подряд — не дай серии сгореть. 5 минут в ExamFlow!'; },
    function (n) { return '🔥 Серия ' + n + ' дн. — сохрани её за 5 минут сегодня.'; },
];
const VARIANTS_PLAIN = [
    function (e) { return 'Привет! 5 минут сегодня — и подготовка ' + e + ' идёт сама 💪'; },
    function (e) { return 'Добрый день! Один маленький урок ' + e + ' — прямо в Telegram 💪'; },
    function (e) { return '5 минут на занятие ' + e + ' — маленький шаг каждый день 💪'; },
];
const VARIANTS_FIRST = [
    function (e) { return 'Ты выбрал(а) подготовку ' + e + ' — первое занятие займёт 5 минут, а серия начнётся сразу 🔥'; },
    function (e) { return 'Тебя ждёт первое занятие ' + e + ' — всего 5 минут, а старт уже за тобой 🔥'; },
    function (e) { return '5 минут на первое занятие ' + e + ' — маленький шаг, который начинает серию 🔥'; },
];
export function reminderText(streak, exam, localDay, neverStudied) {
    const ex = exam === 'oge' ? 'к ОГЭ' : exam === 'ege' ? 'к ЕГЭ' : 'к экзамену';
    let h = 0;
    for (const ch of String(localDay)) h = ((h * 31) + ch.charCodeAt(0)) | 0;
    h = Math.abs(h);
    if (streak >= 2) return VARIANTS_STREAK[h % VARIANTS_STREAK.length](streak);
    if (neverStudied) return VARIANTS_FIRST[h % VARIANTS_FIRST.length](ex);
    return VARIANTS_PLAIN[h % VARIANTS_PLAIN.length](ex);
}
