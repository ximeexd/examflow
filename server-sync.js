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
    // Session and offline queue are scoped per Telegram account — two users
    // sharing one browser profile must never see each other's credentials or
    // pending events. Legacy unscoped keys keep their bare names.
    const QUEUE_KEY = 'ef_server_queue_v1';
    const SESSION_KEY = 'ef_server_session_v1';
    const MAX_QUEUE = 200;

    let session = null;
    let flushing = null;

    function initData() {
        try { return (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) || ''; }
        catch (e) { return ''; }
    }
    function tgId() {
        const u = window.EFS && EFS.user;
        return (u && Number.isSafeInteger(u.tgId) && u.tgId > 0) ? u.tgId : null;
    }
    // Active only in account mode with EF bound to the SAME account —
    // guest boots, mid-init states and account switches fail closed.
    function identity() {
        if (!initData() || API.indexOf('PROJECT_REF') >= 0) return null;
        if (!window.EFS || EFS.mode !== 'account' || !EFS.user) return null;
        if (typeof EF === 'undefined' || typeof EF.userId !== 'function' || EF.userId() !== EFS.user.id) return null;
        return tgId();
    }
    function active() { return identity() !== null; }
    // Server tokens embed ef1.<telegram_id>. — a cached or freshly issued
    // token that does not match the current account is never used.
    function ownsSession(s, id) {
        return typeof s === 'string' && s.indexOf('ef1.' + id + '.') === 0;
    }

    function loadQueueKey(k) {
        try { const q = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(q) ? q : []; }
        catch (e) { return []; }
    }
    function saveQueueKey(k, q) {
        try { localStorage.setItem(k, JSON.stringify(q.slice(0, MAX_QUEUE))); return true; }
        catch (e) { return false; }
    }
    // The pre-scoping global queue is inherited ONLY by its proven owner:
    // the legacy session token ef1.<telegram_id>. must match this account,
    // otherwise both legacy keys stay untouched for the real owner.
    function migrateLegacyQueue(id) {
        let legacy = null;
        try { legacy = localStorage.getItem(SESSION_KEY); } catch (e) { }
        if (!ownsSession(legacy, id)) return;
        const old = loadQueueKey(QUEUE_KEY);
        const merged = loadQueueKey(QUEUE_KEY + ':' + id), seen = new Set(merged.map(e => e && e.id));
        for (const ev of old) if (ev && !seen.has(ev.id)) merged.push(ev);
        // the legacy pair is dropped only once the scoped write actually
        // landed — a failed write (quota) must not lose the old queue
        if (saveQueueKey(QUEUE_KEY + ':' + id, merged) || !old.length) {
            try { localStorage.removeItem(QUEUE_KEY); localStorage.removeItem(SESSION_KEY); } catch (e) { }
        }
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

    async function auth(ctx) {
        const r = await call({ action: 'auth', initData: initData() });
        // the reply may arrive after an account switch — a token issued for
        // the old identity is never installed into the new context
        if (identity() !== ctx) return null;
        if (r.status !== 200 || !ownsSession(r.data && r.data.session, ctx)) return null;
        session = r.data.session;
        try { localStorage.setItem(SESSION_KEY + ':' + ctx, session); } catch (e) { }
        return r.data;
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
        const ctx = identity(); if (ctx === null) return;
        const sk = SESSION_KEY + ':' + ctx;
        try {
            migrateLegacyQueue(ctx);
            // a leftover module-level session from another context is dropped
            // even when the cached scoped token turns out to be mismatched
            if (!ownsSession(session, ctx)) session = null;
            let state = null;
            const stored = (() => { try { return localStorage.getItem(sk); } catch (e) { return null; } })();
            // only this account's own scoped session is reused — the legacy
            // unscoped key is deliberately never read for credentials
            if (stored && ownsSession(stored, ctx)) {
                session = stored;
                const r = await call({ action: 'state', session });
                if (identity() !== ctx) return;
                if (r.status === 401) {
                    session = null;
                    try { localStorage.removeItem(sk); } catch (e) { }
                }
                else if (r.status === 200) state = r.data.state;
            } else if (stored) {
                try { localStorage.removeItem(sk); } catch (e) { }
            }
            if (!session) {
                const r = await auth(ctx);
                if (identity() !== ctx) return;
                if (!r) return;
                state = r.state;
            }
            if (state === null || state === undefined) {
                const m = await call({ action: 'migrate', session, progress: EF.get(), profile: profileSnapshot() });
                if (identity() !== ctx) return;
                if (m.status === 200) state = m.data.state;
            }
            if (state) applyServerState(state);
            await flush();
        } catch (e) {
            // offline or server down — the app stays fully usable on local state
        }
    }

    function queue(kind, payload) {
        const ctx = identity(); if (ctx === null) return null;
        const ev = {
            id: uuid(), kind: kind, payload: payload || {},
            day: EF.day(), wk: (EF.week() || {}).wk || ''
        };
        const qk = QUEUE_KEY + ':' + ctx;
        migrateLegacyQueue(ctx);
        let q = loadQueueKey(qk);
        // pending profile snapshots supersede each other — only the newest
        // one matters to the server
        if (kind === 'profile') q = q.filter(e => e.kind !== 'profile');
        q.push(ev);
        saveQueueKey(qk, q);
        flush();
        return ev.id;
    }

    async function flush() {
        const ctx = identity();
        if (ctx === null || !session || !ownsSession(session, ctx)) return;
        if (flushing) return flushing;
        // fixed per-account keys: identity checks below only ABORT the drain —
        // they never redirect one account's events into another's storage
        const qk = QUEUE_KEY + ':' + ctx, sk = SESSION_KEY + ':' + ctx;
        // The drain promise is assigned before being awaited — clearing
        // `flushing` inside the IIFE would run BEFORE this assignment and
        // leave the resolved promise stuck in `flushing` forever.
        const run = (async () => {
            let reauthed = false;
            for (;;) {
                // re-validate EVERY iteration: an account switch mid-flight
                // must never send the old queue under a new session
                if (identity() !== ctx || !ownsSession(session, ctx)) break;
                const q = loadQueueKey(qk);
                if (!q.length) break;
                try {
                    const r = await call({ action: 'events', session, events: q.slice(0, 50) });
                    if (identity() !== ctx) break;
                    if (r.status === 401 && !reauthed) {
                        reauthed = true;
                        session = null;
                        try { localStorage.removeItem(sk); } catch (e) { }
                        const a = await auth(ctx);
                        if (!a || identity() !== ctx || !ownsSession(session, ctx)) break;
                        continue;
                    }
                    if (r.status !== 200) break;
                    const done = new Set((r.data.applied || []).concat(r.data.skipped || []));
                    const bad = new Set((r.data.rejected || []).map(x => x.id));
                    // re-read: events queued while the request was in flight
                    // must not be lost
                    saveQueueKey(qk, loadQueueKey(qk).filter(ev => !done.has(ev.id) && !bad.has(ev.id)));
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

    // Profile/settings changes are queued IMMEDIATELY into the durable
    // localStorage queue — a debounce window here loses the last snapshot if
    // the app closes right after onboarding (infinite-onboarding bug).
    // Coalescing inside queue() keeps only the newest pending snapshot.
    let lastProfile = '';
    function profileChanged() {
        if (!active()) return;
        const snap = JSON.stringify(profileSnapshot());
        if (snap === lastProfile) return;
        lastProfile = snap;
        queue('profile', profileSnapshot());
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
