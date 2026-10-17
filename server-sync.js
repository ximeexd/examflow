/* ExamFlow — server progression sync ("anti-cheat" layer).
   Active only for Telegram users: it wraps EFS.init, authenticates once via
   Telegram initData and then keeps a 30-day session. Economy fields (XP,
   coins, progression, streak, quest claims) are server-authoritative; local
   optimistic updates still render instantly and are corrected by the server
   overlay after every reply. Events queue in localStorage while offline and
   flush in order — the server deduplicates by event id, so replay is safe.
   Browser demo mode (no initData) is completely unchanged. */
(function () {
    'use strict';
    // Supabase project URL — public info, not a secret.
    // window.EF_SERVER_API exists only for local test harnesses.
    const API = window.EF_SERVER_API || 'https://lerqnybiqqtwocybhwbw.supabase.co/functions/v1/examflow-api';
    const QUEUE_KEY = 'ef_server_queue_v1';
    const SESSION_KEY = 'ef_server_session_v1';
    const MAX_QUEUE = 200;

    let session = null;
    let flushing = null;

    function initData() {
        try { return (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) || ''; }
        catch (e) { return ''; }
    }
    function active() { return !!initData() && API.indexOf('PROJECT_REF') < 0; }

    function loadQueue() {
        try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); return Array.isArray(q) ? q : []; }
        catch (e) { return []; }
    }
    function saveQueue(q) {
        try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(0, MAX_QUEUE))); }
        catch (e) { }
    }
    function uuid() {
        try { return crypto.randomUUID(); }
        catch (e) { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
    }

    async function call(body) {
        const r = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        let data = null;
        try { data = await r.json(); } catch (e) { }
        return { status: r.status, data: data || {} };
    }

    function applyServerState(state) {
        if (!state || typeof state !== 'object') return;
        try { if (window.EF && EF.applyServer) EF.applyServer(state.econ, state.profile); } catch (e) { }
        try { window.dispatchEvent(new CustomEvent('ef:server-state')); } catch (e) { }
    }

    async function auth() {
        const r = await call({ action: 'auth', initData: initData() });
        if (r.status !== 200 || !r.data.session) return null;
        session = r.data.session;
        try { localStorage.setItem(SESSION_KEY, session); } catch (e) { }
        return r.data;
    }

    async function ensureSession() {
        if (session) return session;
        try { session = localStorage.getItem(SESSION_KEY); } catch (e) { }
        if (session) return session;
        const r = await auth();
        return r && r.data ? session : null;
    }

    function profileSnapshot() {
        const S = EF.get();
        const st = (EFS.readSettings ? EFS.readSettings() : null) || {};
        return {
            name: S.name, exam: S.exam, active: S.active, onboarded: S.onboarded,
            subs: S.subs, goal: S.goal, settings: st
        };
    }

    async function boot() {
        if (!active()) return;
        try {
            let state = null;
            const stored = (() => { try { return localStorage.getItem(SESSION_KEY); } catch (e) { return null; } })();
            if (stored) {
                session = stored;
                const r = await call({ action: 'state', session });
                if (r.status === 401) { session = null; }
                else if (r.status === 200) state = r.data.state;
            }
            if (!session) {
                const r = await auth();
                if (!r) return;
                state = r.state;
            }
            if (state === null || state === undefined) {
                const m = await call({ action: 'migrate', session, progress: EF.get(), profile: profileSnapshot() });
                if (m.status === 200) state = m.data.state;
            }
            if (state) applyServerState(state);
            await flush();
        } catch (e) {
            // offline or server down — the app stays fully usable on local state
        }
    }

    function queue(kind, payload) {
        if (!active()) return null;
        const ev = {
            id: uuid(), kind: kind, payload: payload || {},
            day: EF.day(), wk: (EF.week() || {}).wk || ''
        };
        const q = loadQueue();
        q.push(ev);
        saveQueue(q);
        flush();
        return ev.id;
    }

    async function flush() {
        if (!active() || !session) return;
        if (flushing) return flushing;
        // The drain promise is assigned before being awaited — clearing
        // `flushing` inside the IIFE would run BEFORE this assignment and
        // leave the resolved promise stuck in `flushing` forever.
        const run = (async () => {
            let reauthed = false;
            for (;;) {
                const q = loadQueue();
                if (!q.length) break;
                try {
                    const r = await call({ action: 'events', session, events: q.slice(0, 50) });
                    if (r.status === 401 && !reauthed) {
                        reauthed = true;
                        session = null;
                        try { localStorage.removeItem(SESSION_KEY); } catch (e) { }
                        const a = await auth();
                        if (!a) break;
                        continue;
                    }
                    if (r.status !== 200) break;
                    const done = new Set((r.data.applied || []).concat(r.data.skipped || []));
                    const bad = new Set((r.data.rejected || []).map(x => x.id));
                    // re-read: events queued while the request was in flight
                    // must not be lost
                    saveQueue(loadQueue().filter(ev => !done.has(ev.id) && !bad.has(ev.id)));
                    if (r.data.state) applyServerState(r.data.state);
                    // loop re-reads the queue — drains 50-event batches and
                    // anything queued while this one was in flight
                } catch (e) {
                    break; // offline — try again on the next event or boot
                }
            }
        })();
        flushing = run;
        try {
            await run;
        } finally {
            if (flushing === run) flushing = null;
        }
    }

    // Profile/settings changes are debounced into a single snapshot event so
    // every EF mutation path is covered without touching each call site.
    let profileTimer = null, lastProfile = '';
    function profileChanged() {
        if (!active()) return;
        clearTimeout(profileTimer);
        profileTimer = setTimeout(() => {
            const snap = JSON.stringify(profileSnapshot());
            if (snap === lastProfile) return;
            lastProfile = snap;
            queue('profile', profileSnapshot());
        }, 2500);
    }

    window.EFServer = {
        get enabled() { return active(); },
        queue, flush, profileChanged,
        finishLesson(subject, topic, lesson, answers, startedAt) {
            return queue('finish_lesson', {
                exam: EF.get().exam, subject, topic, lesson,
                answers, durationMs: Date.now() - startedAt
            });
        },
        practice(mode, answers) {
            return queue('practice', { mode, answers: answers || [] });
        },
        claim(kind, id) { return queue('claim', { kind, id }); },
        reset() { return queue('reset', {}); }
    };

    // Debounced profile snapshot on every persisted state change — covers
    // name/exam/subject/goal/onboarding edits wherever they happen.
    // 'ef:profile-saved' fires for pure settings edits (time, reminders...).
    window.addEventListener('ef:state-saved', profileChanged);
    window.addEventListener('ef:profile-saved', profileChanged);

    // Wrap EFS.init once so every page runs the server boot after local init.
    if (window.EFS && typeof EFS.init === 'function') {
        const origInit = EFS.init.bind(EFS);
        EFS.init = function () {
            return origInit().then(async (r) => { try { await boot(); } catch (e) { } return r; });
        };
    }
})();
