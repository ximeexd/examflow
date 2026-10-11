/* ExamFlow shared state — localStorage-backed progress, XP, coins, streak.
   Account-scoped: guest uses the base key, a signed-in account uses
   the same key suffixed with its user id. Guest cache is never imported
   into an account and account caches are kept on sign-out. */
(function () {
    'use strict';
    const KEY = 'examflow_state_v1';
    const PROFILE_KEY = 'examflow_profile_v2';
    const todayStr = () => new Date().toISOString().slice(0, 10);
    const yesterStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

    const num = (v, d, min, max) => {
        v = Number(v);
        return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
    };
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
            today: { date: '', started: 0, lessons: 0, correct: 0, mistakes: 0, clean: 0, claimed: 0, claimedIds: [], chest: 0 },
            week: { wk: '', correct: 0, lessons: 0, claimed: [] },
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

    // raw -> sanitized complete state with fresh nested objects.
    // Repairs corrupted/self-written values exactly like the original loader.
    function normalizeState(raw) {
        const s = Object.assign(freshDefaults(), (typeof raw === 'object' && raw) ? raw : {});
        s.today = Object.assign(freshDefaults().today, (typeof s.today === 'object' && s.today) ? s.today : {});
        s.week = Object.assign(freshDefaults().week, (typeof s.week === 'object' && s.week) ? s.week : {});
        s.xp = num(s.xp, 0, 0, 1e7);
        s.coins = num(s.coins, 0, 0, 1e7);
        s.streak = num(s.streak, 0, 0, 1e4);
        s.totalCorrect = num(s.totalCorrect, 0, 0, 1e7);
        s.cleanTotal = num(s.cleanTotal, 0, 0, 1e6);
        s.goal = num(s.goal, 10, 5, 120);
        s.onboarded = s.onboarded ? 1 : 0;
        s.name = String(s.name || 'Ученик').replace(/[<>&"']/g, '').slice(0, 50) || 'Ученик';
        s.exam = s.exam === 'ege' ? 'ege' : 'oge';
        s.active = String(s.active || 'Математика').slice(0, 60);
        s.lastActive = /^\d{4}-\d{2}-\d{2}$/.test(s.lastActive) ? s.lastActive : '';
        if (!Array.isArray(s.days)) s.days = [];
        s.days = s.days.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-120);
        if (!Array.isArray(s.mistakes)) s.mistakes = [];
        s.mistakes = s.mistakes.filter(m => m && typeof m === 'object' && m.id != null).slice(0, 60);
        if (s.subs !== null && !Array.isArray(s.subs)) s.subs = null;
        if (Array.isArray(s.subs)) s.subs = s.subs.filter(x => typeof x === 'string').slice(0, 30);
        if (typeof s.prog !== 'object' || !s.prog || Array.isArray(s.prog)) s.prog = {};
        for (const k in s.prog) {
            const v = num(s.prog[k], 0, 0, 10);
            if (v !== s.prog[k]) { if (v <= 0) delete s.prog[k]; else s.prog[k] = v; }
        }
        if (typeof s.dayLog !== 'object' || !s.dayLog || Array.isArray(s.dayLog)) s.dayLog = {};
        for (const k in s.dayLog) {
            const v = num(s.dayLog[k], 0, 0, 1e4);
            if (v !== s.dayLog[k]) { if (v <= 0) delete s.dayLog[k]; else s.dayLog[k] = v; }
        }
        ['started', 'lessons', 'correct', 'mistakes', 'clean', 'claimed', 'chest'].forEach(f => {
            s.today[f] = num(s.today[f], 0, 0, 1e6);
        });
        if (!Array.isArray(s.today.claimedIds)) s.today.claimedIds = [];
        ['correct', 'lessons'].forEach(f => { s.week[f] = num(s.week[f], 0, 0, 1e6); });
        if (!Array.isArray(s.week.claimed)) s.week.claimed = [];
        if (s.today.date !== todayStr()) s.today = Object.assign(freshDefaults().today, { date: todayStr() });
        if (s.week.wk !== wkStr()) s.week = { wk: wkStr(), correct: 0, lessons: 0, claimed: [] };
        return s;
    }

    let scope = null;                    // null = guest cache, string = account user id
    const storageKey = () => scope ? KEY + ':' + scope : KEY;
    const cacheKey = (userId) => userId ? KEY + ':' + userId : KEY;
    function load() {
        let raw = null;
        try { raw = JSON.parse(localStorage.getItem(storageKey())); } catch (e) {}
        return normalizeState(raw || {});
    }

    let s = load();

    // Local write that does NOT trigger the sync listener.
    function writeSilent() { try { localStorage.setItem(storageKey(), JSON.stringify(s)); } catch (e) {} }

    function save() {
        writeSilent();
        try { window.dispatchEvent(new CustomEvent('ef:state-saved')); } catch (e) {}
    }

    // Replace every key of s in place so existing EF.get() references stay valid.
    function replaceInPlace(next) {
        for (const k in s) delete s[k];
        Object.assign(s, next);
    }

    const EF = {
        get: () => s,
        save,
        today: () => s.today,
        week: () => s.week,
        day: todayStr,
        storageKey,
        cacheKey,
        defaults: () => normalizeState({}),
        normalizeState,
        profileKey: () => (scope ? PROFILE_KEY + ':' + scope : PROFILE_KEY),
        profileBaseKey: PROFILE_KEY,
        userId: () => scope,
        weekDaysCount() { const wk = wkStr(); return s.days.filter(d => isoWeek(new Date(d + 'T12:00:00')) === wk).length; },

        // Switch storage scope to a guest (null) or an account (user id).
        // Loads that scope's cache; returns whether a scoped cache existed.
        bindAccount(userId) {
            scope = userId || null;
            const existed = localStorage.getItem(storageKey()) !== null;
            replaceInPlace(load());
            return existed;
        },
        // Full sanitized replacement from a remote snapshot (no merge).
        restore(raw) {
            replaceInPlace(normalizeState(raw));
            writeSilent();
        },

        examName: () => s.exam === 'ege' ? 'ЕГЭ' : 'ОГЭ',
        setExam(exam) { if (s.exam !== exam) { s.exam = exam; const subs = EF.subjects(); if (!subs.includes(s.active)) s.active = subs[0]; save(); } },

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
            n = Math.min(50, Math.max(0, Math.floor(Number(n) || 0))); // не больше 50 за раз
            s.xp += n; s.today.xp = (s.today.xp || 0) + n; save();
        },
        addCoins(n) {
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
                const iso = x.toISOString().slice(0, 10);
                out.push({ label: 'Пн Вт Ср Чт Пт Сб Вс'.split(' ')[i], on: s.days.includes(iso), future: iso > todayStr() });
            }
            return out;
        },

        startLesson() {
            const first = s.today.started === 0;
            s.today.started++; if (first) EF.addXP(5); EF.markActive(); save(); return first;
        },
        recordCorrect() { s.today.correct++; s.week.correct++; s.totalCorrect++; const bonus = s.today.correct === 5 ? 15 : 0; if (bonus) EF.addXP(bonus); save(); return bonus; },
        recordMistakeFixed() { s.today.mistakes++; save(); },
        recordClean() { s.today.clean++; s.cleanTotal++; save(); },
        claimDaily(id) { if (s.today.claimedIds.includes(id)) return false; s.today.claimedIds.push(id); save(); return true; },
        claimWeekly(id) { if (s.week.claimed.includes(id)) return false; s.week.claimed.push(id); save(); return true; },
        // Returns {isNew, doneNow}
        finishLesson(subject, topicKey) {
            const k = EF.progKey(subject, topicKey), cur = s.prog[k] || 0;
            const isNew = cur < 10;
            const n = EF.next(subject);
            if (n && n.topic.key === topicKey) { s.prog[k] = Math.min(10, cur + 1); }
            s.today.lessons++; s.week.lessons++;
            s.dayLog[todayStr()] = (s.dayLog[todayStr()] || 0) + 1;
            const doneNow = (s.prog[k] || 0) >= 10 && cur < 10;
            save();
            return { isNew, doneNow };
        },
        addMistake(q) {
            if (!s.mistakes.some(m => m.id === q.id)) s.mistakes.unshift(q);
            s.mistakes = s.mistakes.slice(0, 60); save();
        },
        dropMistake(id) { s.mistakes = s.mistakes.filter(m => m.id !== id); save(); },

        // Save a clean state under the current scope, upload it if sync is up, reload.
        reset() {
            EF.restore(EF.defaults());
            save();
            const flush = window.EFS && EFS.flush ? EFS.flush() : Promise.resolve();
            Promise.resolve(flush).catch(() => {}).finally(() => location.reload());
        }
    };
    window.EF = EF;
})();
