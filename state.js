/* ExamFlow shared state — localStorage-backed progress, XP, coins, streak.
   Account-scoped: guest uses the base key, a signed-in account uses
   the same key suffixed with its user id. Guest cache is never imported
   into an account and account caches are kept on sign-out. */
(function () {
    'use strict';
    const KEY = 'examflow_state_v1';
    const PROFILE_KEY = 'examflow_profile_v2';
    // local calendar day keys (not UTC — quests/streaks are local-day based)
    const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = () => dayKey(new Date());
    const yesterStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
    // true only for a real calendar date 'YYYY-MM-DD'
    function validDate(v) {
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
        const d = new Date(v + 'T00:00:00');
        return !isNaN(d) && dayKey(d) === v;
    }

    const num = (v, d, min, max) => {
        v = Number(v);
        return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : d;
    };
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // iterate only own enumerable string-keyed entries, skipping keys that can
    // mutate the prototype chain when copied onto a fresh object
    const DANGER_KEYS = { __proto__: 1, constructor: 1, prototype: 1 };
    function eachSafe(o, fn) {
        if (!o || typeof o !== 'object') return;
        for (const k of Object.keys(o)) if (!DANGER_KEYS[k]) fn(k, o[k]);
    }
    const DAILY_IDS = ['d1', 'd2', 'd3', 'd4'], WEEKLY_IDS = ['w1', 'w2', 'w3'];
    function freshToday(date) {
        return { date: date || '', started: 0, lessons: 0, correct: 0, mistakes: 0, clean: 0, claimed: 0, claimedIds: [], chest: 0, xp: 0 };
    }
    function freshWeek(wk) {
        return { wk: wk || '', correct: 0, lessons: 0, claimed: [] };
    }
    function freshDefaults() {
        return {
            name: 'Даниил',
            exam: 'oge',
            active: 'Математика',
            onboarded: 0,
            subs: null,          // chosen subjects from onboarding, null = all
            goal: 10,
            xp: 0,
            coins: 0,
            streak: 0,
            lastActive: '',
            days: [],
            prog: {},          // 'exam:subject:topicKey' -> lessons done 0..10
            today: freshToday(),
            week: freshWeek(),
            totalCorrect: 0,
            cleanTotal: 0,
            dayLog: {},          // 'YYYY-MM-DD' -> lessons count
            mistakes: []
        };
    }

    function isoWeek(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
        const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return d.getUTCFullYear() + '-W' + Math.ceil((((d - y0) / 864e5) + 1) / 7);
    }
    const wkStr = () => isoWeek(new Date());

    // A stored question/mistake record: only known fields, strict shape so a
    // corrupted record degrades to an empty review instead of a .map crash.
    // 'id' is deliberately absent — it is validated above and preserved whole
    const QUESTION_FIELDS = ['topicId', 'subject', 'exam', 'topicKey', 'topic', 'courseTopic', 'title', 'cat', 'topicMatch', 'source'];
    function cleanQuestion(m) {
        if (!m || typeof m !== 'object') return null;
        const id = (typeof m.id === 'string' && m.id) || (typeof m.id === 'number' && Number.isFinite(m.id)) ? m.id : null;
        if (id === null) return null;
        // question text/explanation are preserved verbatim — the cloud byte cap
        // already guards storage, truncation could silently change an answer
        if (typeof m.q !== 'string' || !m.q) return null;
        const opts = m.opts;
        if (!Array.isArray(opts) || opts.length !== 4) return null;
        if (opts.some(o => typeof o !== 'string' || o === '') || new Set(opts).size !== 4) return null;
        if (typeof m.ans !== 'number' || !Number.isInteger(m.ans) || m.ans < 0 || m.ans > 3) return null;
        if (typeof m.exp !== 'string') return null;
        const out = { id, q: m.q, opts, ans: m.ans, exp: m.exp };
        for (const f of QUESTION_FIELDS) {
            const v = m[f];
            if (typeof v === 'string') out[f] = v.slice(0, 300);
            else if (typeof v === 'number' && isFinite(v)) out[f] = v;
            else if (typeof v === 'boolean') out[f] = v;
        }
        return out;
    }

    // raw -> sanitized complete state with fresh nested objects.
    // Only whitelisted fields are copied; maps drop __proto__/constructor keys.
    function normalizeState(raw) {
        const r = (typeof raw === 'object' && raw && !Array.isArray(raw)) ? raw : {};
        const s = freshDefaults();
        if (typeof r.name === 'string') s.name = r.name;
        if (r.exam === 'ege' || r.exam === 'oge') s.exam = r.exam;
        if (typeof r.active === 'string') s.active = r.active.slice(0, 60);
        s.onboarded = r.onboarded ? 1 : 0;
        if (Array.isArray(r.subs)) s.subs = r.subs.filter(x => typeof x === 'string').map(x => x.slice(0, 60)).slice(0, 30);
        else if (r.subs !== null && r.subs !== undefined) s.subs = null;
        s.goal = num(r.goal, 10, 5, 120);
        s.xp = num(r.xp, 0, 0, 1e7);
        s.coins = num(r.coins, 0, 0, 1e7);
        s.streak = num(r.streak, 0, 0, 1e4);
        s.totalCorrect = num(r.totalCorrect, 0, 0, 1e7);
        s.cleanTotal = num(r.cleanTotal, 0, 0, 1e6);
        s.lastActive = validDate(r.lastActive) ? r.lastActive : '';
        if (Array.isArray(r.days)) s.days = r.days.filter(validDate).slice(-120);
        if (typeof r.prog === 'object' && r.prog && !Array.isArray(r.prog)) {
            eachSafe(r.prog, (k, v) => {
                const val = num(v, 0, 0, 10);
                if (val > 0 && typeof k === 'string' && k.length <= 300) s.prog[k] = val;
            });
        }
        if (typeof r.dayLog === 'object' && r.dayLog && !Array.isArray(r.dayLog)) {
            eachSafe(r.dayLog, (k, v) => {
                const val = num(v, 0, 0, 1e4);
                if (val > 0 && validDate(k)) s.dayLog[k] = val;
            });
        }
        if (typeof r.today === 'object' && r.today) {
            const t = s.today;
            if (validDate(r.today.date)) t.date = r.today.date;
            ['started', 'lessons', 'correct', 'mistakes', 'clean', 'claimed', 'chest', 'xp'].forEach(f => { t[f] = num(r.today[f], 0, 0, 1e6); });
            if (Array.isArray(r.today.claimedIds)) t.claimedIds = [...new Set(r.today.claimedIds.filter(x => DAILY_IDS.indexOf(x) >= 0))];
            // the 'claimed' rollup is always derived from the real id list
            t.claimed = DAILY_IDS.every(id => t.claimedIds.indexOf(id) >= 0) ? 1 : 0;
        }
        if (typeof r.week === 'object' && r.week) {
            if (typeof r.week.wk === 'string' && /^\d{4}-W\d{1,2}$/.test(r.week.wk)) s.week.wk = r.week.wk;
            s.week.correct = num(r.week.correct, 0, 0, 1e6);
            s.week.lessons = num(r.week.lessons, 0, 0, 1e6);
            if (Array.isArray(r.week.claimed)) s.week.claimed = [...new Set(r.week.claimed.filter(x => WEEKLY_IDS.indexOf(x) >= 0))];
        }
        if (Array.isArray(r.mistakes)) {
            for (const m of r.mistakes) {
                const q = cleanQuestion(m);
                if (q) s.mistakes.push(q);
                if (s.mistakes.length >= 60) break;
            }
        }
        s.name = s.name.replace(/[<>&"']/g, '').slice(0, 50) || 'Ученик';
        // active must be inside the chosen subject list for the current exam
        const cur = (window.SCHOOL_CURRICULUM || {})[s.exam] || {};
        const skip = s.exam === 'ege' ? ['Математика'] : ['Базовая математика', 'Профильная математика'];
        let list = Object.keys(cur).filter(n => skip.indexOf(n) < 0);
        if (Array.isArray(s.subs) && s.subs.length) {
            const sel = list.filter(n => s.subs.indexOf(n) >= 0);
            if (sel.length) list = sel;
        }
        if (typeof s.active !== 'string' || list.indexOf(s.active) < 0) s.active = list[0] || 'Математика';
        refreshPeriods(s);
        return s;
    }

    // Roll daily/weekly buckets over in place (same object refs for T/WK).
    // Returns true when a reset happened; never dispatches save itself.
    function refreshPeriods(st) {
        const s = st || s2;
        let changed = false;
        if (s.today.date !== todayStr()) {
            const t = freshToday(todayStr());
            for (const k in s.today) delete s.today[k];
            Object.assign(s.today, t); changed = true;
        }
        if (s.week.wk !== wkStr()) {
            const w = freshWeek(wkStr());
            for (const k in s.week) delete s.week[k];
            Object.assign(s.week, w); changed = true;
        }
        // streak continuity: legacy records without lastActive derive it from
        // the last recorded practice day; a lastActive older than yesterday
        // means the streak is already broken — history itself stays untouched
        if (!s.lastActive && s.streak > 0) {
            const last = s.days.filter(d => validDate(d) && d <= todayStr()).sort().pop();
            if (last) s.lastActive = last; else s.streak = 0;
            changed = true;
        }
        if (s.lastActive && s.lastActive < yesterStr() && s.streak !== 0) { s.streak = 0; changed = true; }
        if (changed && st === undefined) writeSilent();
        return changed;
    }

    let scope = null;                    // null = guest cache, string = account user id
    const storageKey = () => scope ? KEY + ':' + scope : KEY;
    const cacheKey = (userId) => userId ? KEY + ':' + userId : KEY;
    function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function load() {
        let raw = null;
        try { raw = JSON.parse(safeGet(storageKey())); } catch (e) {}
        return normalizeState(raw || {});
    }

    let s = load();
    const s2 = s; // reference used by refreshPeriods when called without arg

    // Local write that does NOT trigger the sync listener; false on quota error.
    function writeSilent() { try { localStorage.setItem(storageKey(), JSON.stringify(s)); return true; } catch (e) { return false; } }

    function save() {
        const persisted = writeSilent();
        try { window.dispatchEvent(new CustomEvent('ef:state-saved', { detail: { persisted } })); } catch (e) {}
    }

    // Replace every key of s in place so existing EF.get() references stay valid.
    function replaceInPlace(next) {
        for (const k in s) delete s[k];
        Object.assign(s, next);
    }

    const DAILY_QUESTS = {
        d1: t => t.lessons >= 1,
        d2: t => t.correct >= 5,
        d3: t => t.mistakes >= 1,
        d4: t => t.clean >= 1
    };
    const WEEKLY_QUESTS = {
        w1: () => EF.weekDaysCount() >= 5,
        w2: () => EF.week().correct >= 50,
        w3: () => EF.get().streak >= 7
    };

    const EF = {
        get: () => { refreshPeriods(); return s; },
        save,
        escapeHTML: esc,
        validDate,
        today: () => { refreshPeriods(); return s.today; },
        week: () => { refreshPeriods(); return s.week; },
        refreshPeriods: () => refreshPeriods(),
        day: todayStr,
        storageKey,
        cacheKey,
        defaults: () => normalizeState({}),
        normalizeState,
        profileKey: () => (scope ? PROFILE_KEY + ':' + scope : PROFILE_KEY),
        profileBaseKey: PROFILE_KEY,
        userId: () => scope,
        weekDaysCount() {
            const wk = wkStr(), td = todayStr();
            return new Set(s.days.filter(d => validDate(d) && d <= td && isoWeek(new Date(d + 'T12:00:00')) === wk)).size;
        },

        // Switch storage scope to a guest (null) or an account (user id).
        // Loads that scope's cache; returns whether a scoped cache existed.
        bindAccount(userId) {
            const next = userId || null;
            if (scope === next) return safeGet(storageKey()) !== null;
            scope = next;
            const existed = safeGet(storageKey()) !== null;
            replaceInPlace(load());
            return existed;
        },
        // Full sanitized replacement from a remote snapshot (no merge).
        restore(raw) {
            replaceInPlace(normalizeState(raw));
            writeSilent();
        },

        examName: () => s.exam === 'ege' ? 'ЕГЭ' : 'ОГЭ',
        setExam(exam) {
            if (exam !== 'oge' && exam !== 'ege') return;
            if (s.exam !== exam) { s.exam = exam; const subs = EF.subjects(); if (!subs.includes(s.active)) s.active = subs[0]; save(); }
        },

        subjects() {
            const cur = (window.SCHOOL_CURRICULUM || {})[s.exam] || {};
            const skip = s.exam === 'ege' ? ['Математика'] : ['Базовая математика', 'Профильная математика'];
            const all = Object.keys(cur).filter(n => !skip.includes(n));
            if (Array.isArray(s.subs) && s.subs.length) {
                const sel = all.filter(n => s.subs.includes(n));
                if (sel.length) return sel;
            }
            return all;
        },
        topics(subject) {
            const cur = (window.SCHOOL_CURRICULUM || {})[s.exam] || {};
            return cur[subject] || [];
        },

        progKey(subject, topicKey) { return s.exam + ':' + subject + ':' + topicKey; },
        lessonsDone(subject, topicKey) { return s.prog[EF.progKey(subject, topicKey)] || 0; },
        // First topic with lessons < 10 -> {topic, index, lesson(1-10), done}
        next(subject) {
            const t = EF.topics(subject);
            for (let i = 0; i < t.length; i++) {
                const d = EF.lessonsDone(subject, t[i].key);
                if (d < 10) return { topic: t[i], index: i, lesson: d + 1, done: d };
            }
            return null;
        },
        isUnlocked(subject, index) {
            if (index <= 0) return true;
            const t = EF.topics(subject);
            return EF.lessonsDone(subject, t[index - 1].key) >= 10;
        },
        passedCount(subject) {
            return EF.topics(subject).filter(t => EF.lessonsDone(subject, t.key) >= 10).length;
        },
        totalLessons() { return Object.values(s.prog).reduce((a, b) => a + b, 0); },

        level() { return Math.floor(s.xp / 500) + 1; },
        levelPct() { return Math.round((s.xp % 500) / 5); },

        addXP(n) {
            refreshPeriods();
            n = Number(n);
            if (!Number.isFinite(n)) return 0;
            n = Math.min(Math.max(0, Math.floor(n)), Math.max(0, 1e7 - s.xp));
            s.xp += n; s.today.xp = (s.today.xp || 0) + n; save();
            return n;
        },
        addCoins(n) {
            refreshPeriods();
            n = Math.min(100, Math.max(0, Math.floor(Number(n) || 0)));
            s.coins += n; save();
        },

        markActive() {
            const t = todayStr();
            if (s.lastActive === t) { if (!s.days.includes(t)) { s.days.push(t); save(); } return; }
            s.streak = (s.lastActive === yesterStr()) ? s.streak + 1 : 1;
            s.lastActive = t;
            if (!s.days.includes(t)) s.days.push(t);
            s.days = s.days.slice(-60);
            save();
        },
        weekDays() {
            const out = [];
            const d = new Date(); const dow = (d.getDay() + 6) % 7;
            for (let i = 0; i < 7; i++) {
                const x = new Date(d); x.setDate(d.getDate() - dow + i);
                const iso = dayKey(x);
                out.push({ label: 'Пн Вт Ср Чт Пт Сб Вс'.split(' ')[i], on: s.days.includes(iso), future: iso > todayStr() });
            }
            return out;
        },

        startLesson() {
            refreshPeriods();
            const first = s.today.started === 0;
            s.today.started++; if (first) EF.addXP(5); EF.markActive(); save(); return first;
        },
        recordCorrect() { refreshPeriods(); s.today.correct++; s.week.correct++; s.totalCorrect++; const bonus = s.today.correct === 5 ? 15 : 0; if (bonus) EF.addXP(bonus); save(); return bonus; },
        recordMistakeFixed() { refreshPeriods(); s.today.mistakes++; save(); },
        recordClean() { refreshPeriods(); s.today.clean++; s.cleanTotal++; save(); },
        // Known quest ids only, with their real conditions; no repeats.
        // The id check happens BEFORE the dict lookup — prototype-inherited
        // members (constructor/toString) must never act as valid quests.
        claimDaily(id) {
            refreshPeriods();
            if (DAILY_IDS.indexOf(id) < 0) return false;
            const cond = DAILY_QUESTS[id];
            if (!cond || !cond(s.today) || s.today.claimedIds.includes(id)) return false;
            s.today.claimedIds.push(id); save(); return true;
        },
        claimWeekly(id) {
            refreshPeriods();
            if (WEEKLY_IDS.indexOf(id) < 0) return false;
            const cond = WEEKLY_QUESTS[id];
            if (!cond || !cond() || s.week.claimed.includes(id)) return false;
            s.week.claimed.push(id); save(); return true;
        },
        dailyConditions() { const t = EF.today(); return Object.keys(DAILY_QUESTS).map(id => condReady(id, t)); },
        claimChest() {
            refreshPeriods();
            if (s.today.chest || !EF.dailyConditions().every(Boolean)) return false;
            s.today.chest = 1; save(); return true;
        },
        // Returns {isNew, doneNow}. Advances progress only for the real next
        // lesson (li === done+1 <= 10) of a known, unlocked topic. Replays still
        // count as daily/weekly practice; locked/future lessons mutate nothing.
        finishLesson(subject, topicKey, lessonNumber) {
            refreshPeriods();
            const t = EF.topics(subject);
            const idx = t.findIndex(x => x.key === topicKey);
            if (idx < 0 || !EF.isUnlocked(subject, idx)) return { isNew: false, doneNow: false };
            const k = EF.progKey(subject, topicKey), cur = s.prog[k] || 0;
            const want = (lessonNumber == null) ? cur + 1 : Number(lessonNumber);
            if (!Number.isInteger(want) || want < 1 || want > 10 || want > cur + 1) return { isNew: false, doneNow: false };
            const advance = want === cur + 1 && cur < 10;
            if (advance) s.prog[k] = cur + 1;
            s.today.lessons++; s.week.lessons++;
            s.dayLog[todayStr()] = (s.dayLog[todayStr()] || 0) + 1;
            save();
            return { isNew: advance, doneNow: advance && s.prog[k] >= 10 };
        },
        addMistake(q) {
            const clean = cleanQuestion(q);
            if (!clean) return;
            clean._new = 1; // survives applyServer until the server confirms it
            if (!s.mistakes.some(m => m.id === clean.id)) s.mistakes.unshift(clean);
            s.mistakes = s.mistakes.slice(0, 60); save();
        },
        dropMistake(id) { s.mistakes = s.mistakes.filter(m => m.id !== id); save(); },

        // Server-authoritative overlay (examflow-api). Only whitelisted
        // economy fields are replaced; settings-like fields come via profile.
        applyServer(econ, profile) {
            if (!econ || typeof econ !== 'object') return;
            const e = econ;
            s.xp = num(e.xp, s.xp, 0, 1e7);
            s.coins = num(e.coins, s.coins, 0, 1e7);
            s.streak = num(e.streak, s.streak, 0, 1e4);
            s.totalCorrect = num(e.totalCorrect, s.totalCorrect, 0, 1e7);
            s.cleanTotal = num(e.cleanTotal, s.cleanTotal, 0, 1e6);
            if (e.lastActive === '') s.lastActive = '';
            else if (validDate(e.lastActive)) s.lastActive = e.lastActive;
            if (Array.isArray(e.days)) s.days = e.days.filter(validDate).slice(-120);
            if (typeof e.prog === 'object' && e.prog && !Array.isArray(e.prog)) {
                const p = {};
                eachSafe(e.prog, (k, v) => {
                    const val = num(v, 0, 0, 10);
                    if (val > 0 && typeof k === 'string' && k.length <= 300) p[k] = val;
                });
                s.prog = p;
            }
            if (typeof e.dayLog === 'object' && e.dayLog && !Array.isArray(e.dayLog)) {
                const d = {};
                eachSafe(e.dayLog, (k, v) => {
                    const val = num(v, 0, 0, 1e4);
                    if (val > 0 && validDate(k)) d[k] = val;
                });
                s.dayLog = d;
            }
            if (typeof e.today === 'object' && e.today) {
                const t = freshToday();
                if (validDate(e.today.date)) t.date = e.today.date;
                ['started', 'lessons', 'correct', 'mistakes', 'clean', 'chest', 'xp'].forEach(f => { t[f] = num(e.today[f], 0, 0, 1e6); });
                if (Array.isArray(e.today.claimedIds)) t.claimedIds = [...new Set(e.today.claimedIds.filter(x => DAILY_IDS.indexOf(x) >= 0))];
                t.claimed = DAILY_IDS.every(id => t.claimedIds.indexOf(id) >= 0) ? 1 : 0;
                s.today = t;
            }
            if (typeof e.week === 'object' && e.week) {
                const w = freshWeek();
                if (typeof e.week.wk === 'string' && /^\d{4}-W\d{1,2}$/.test(e.week.wk)) w.wk = e.week.wk;
                w.correct = num(e.week.correct, 0, 0, 1e6);
                w.lessons = num(e.week.lessons, 0, 0, 1e6);
                if (Array.isArray(e.week.claimed)) w.claimed = [...new Set(e.week.claimed.filter(x => WEEKLY_IDS.indexOf(x) >= 0))];
                s.week = w;
            }
            if (Array.isArray(e.mistakeIds)) {
                const ids = new Set(e.mistakeIds.filter(x => typeof x === 'string'));
                s.mistakes = s.mistakes.filter(m => ids.has(m.id) || m._new);
                for (const m of s.mistakes) if (ids.has(m.id)) delete m._new;
            }
            if (profile && typeof profile === 'object') {
                if (typeof profile.name === 'string') s.name = profile.name.replace(/[<>&"']/g, '').slice(0, 50) || s.name;
                if (profile.exam === 'oge' || profile.exam === 'ege') s.exam = profile.exam;
                if (typeof profile.active === 'string') s.active = profile.active.slice(0, 60);
                if (profile.subs === null) s.subs = null;
                else if (Array.isArray(profile.subs)) s.subs = profile.subs.filter(x => typeof x === 'string').map(x => x.slice(0, 60)).slice(0, 30);
                // onboarding is a UX flag, not economy: never downgrade it —
                // a stale server 0 must not reopen the welcome screen
                if (profile.onboarded !== undefined) s.onboarded = s.onboarded || (profile.onboarded ? 1 : 0);
                if (typeof profile.goal === 'number') s.goal = num(profile.goal, s.goal, 5, 120);
                if (typeof profile.settings === 'object' && profile.settings && window.EFS && EFS.setSettings) {
                    try { EFS.setSettings(profile.settings); } catch (x) { }
                }
            }
            // keep active inside the visible subject list for the current exam
            const cur = (window.SCHOOL_CURRICULUM || {})[s.exam] || {};
            const skip = s.exam === 'ege' ? ['Математика'] : ['Базовая математика', 'Профильная математика'];
            let list = Object.keys(cur).filter(n => skip.indexOf(n) < 0);
            if (Array.isArray(s.subs) && s.subs.length) {
                const sel = list.filter(n => s.subs.indexOf(n) >= 0);
                if (sel.length) list = sel;
            }
            if (list.indexOf(s.active) < 0) s.active = list[0] || s.active;
            refreshPeriods();
            save();
        },

        // Save a clean state under the current scope, upload it if sync is up, reload.
        reset() {
            EF.restore(EF.defaults());
            save();
            try { if (window.EFServer) EFServer.reset(); } catch (e) { }
            const flush = window.EFS && EFS.flush ? EFS.flush() : Promise.resolve();
            Promise.resolve(flush).catch(() => {}).finally(() => location.reload());
        }
    };
    function condReady(id, t) { return DAILY_QUESTS[id](t); }
    window.EF = EF;
})();
