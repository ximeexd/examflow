/* ExamFlow — Supabase sync layer.
   Two modes:
   - Inside Telegram (initData present): Telegram IS the account. EFS.init()
     verifies initData with the edge function, signs the mapped user in and
     restores the full account snapshot before resolving. Failure is a
     blocking error — never a silent guest fallback.
   - Direct browser: legacy email sign-in or local guest demo, as before.
   Snapshot writes go through the save_account_snapshot RPC (CAS by revision);
   local revision/dirty metadata is namespaced by user id. */
(function () {
    'use strict';
    const URL_ = 'https://lerqnybiqqtwocybhwbw.supabase.co';
    const KEY_ = 'sb_publishable_pTbjVuYkVSHZkNWTeU7HJw__sJ-s32O';
    const PROFILE_KEY = 'examflow_profile_v2';
    const META_PREFIX = 'ef_sync:';

    const EFS = {
        client: null, user: null, ready: null, authenticating: false,
        mode: 'guest',            // 'guest' | 'legacy' (email) | 'account' (telegram snapshot)
        status: 'idle',           // 'saving' | 'saved' | 'offline' | 'conflict'
        error: null
    };
    let bootP = null, booting = false, flushChain = Promise.resolve(), saveTimer = 0, chip = null;

    const ok = () => !!(window.supabase && EFS.client);
    const inTelegram = () => !!EFS.telegramData();

    /* ---------- local meta (revision + dirty flag, per account) ---------- */
    function metaKey(uid) { return META_PREFIX + uid; }
    function metaGet(uid) {
        try {
            const m = JSON.parse(localStorage.getItem(metaKey(uid)));
            if (m && Number.isFinite(m.rev)) return { rev: m.rev, dirty: m.dirty ? 1 : 0 };
        } catch (e) {}
        return { rev: 0, dirty: 0 };
    }
    function metaSet(uid, m) {
        const rev = (Number.isSafeInteger(m.rev) && m.rev >= 0) ? m.rev : 0;
        try { localStorage.setItem(metaKey(uid), JSON.stringify({ rev, dirty: m.dirty ? 1 : 0 })); } catch (e) {}
    }
    function scopedSettingsKey(uid) { return PROFILE_KEY + ':' + uid; }
    function guestSettingsKey() { return PROFILE_KEY + ':guest'; }

    // Fresh nested defaults on every call — malformed payloads (null dates,
    // non-number goal, missing cust) can never crash the profile page.
    const SETTINGS_DEFAULTS = { goal: 10, remind: true, time: '18:00', sound: true, dates: { oge: '2027-05-22', ege: '2027-05-29' }, cust: {} };
    EFS.normalizeSettings = function (x) {
        const o = (typeof x === 'object' && x) ? x : {};
        const s = Object.assign({}, SETTINGS_DEFAULTS, o);
        s.dates = Object.assign({}, SETTINGS_DEFAULTS.dates, (typeof s.dates === 'object' && s.dates) ? s.dates : {});
        s.cust = (typeof s.cust === 'object' && s.cust) ? Object.assign({}, s.cust) : {};
        s.goal = Math.min(120, Math.max(5, Number(s.goal) || SETTINGS_DEFAULTS.goal));
        s.time = (typeof s.time === 'string' && s.time) ? s.time : SETTINGS_DEFAULTS.time;
        s.remind = !!s.remind;
        s.sound = !!s.sound;
        return s;
    };
    function readSettings() {
        try { return EFS.normalizeSettings(JSON.parse(localStorage.getItem(PROFILE_KEY))); }
        catch (e) { return EFS.normalizeSettings(null); }
    }

    /* ---------- status chip ---------- */
    function setStatus(st) {
        EFS.status = st;
        if (EFS.mode !== 'account') return;
        if (!chip) {
            chip = document.createElement('button');
            chip.id = 'efsync';
            chip.type = 'button';
            chip.setAttribute('style',
                'position:fixed;right:12px;bottom:calc(92px + env(safe-area-inset-bottom,0px));z-index:40;' +
                'border:0;border-radius:99px;padding:7px 13px;font:800 11.5px Onest,system-ui,sans-serif;' +
                'background:#0f2a1e;color:#c6f94d;box-shadow:0 3px 0 #06140d;cursor:pointer;opacity:.95');
            chip.onclick = onChipClick;
            document.body.appendChild(chip);
        }
        chip.textContent = {
            saving: 'Сохраняем…', saved: 'Синхронизировано ✓',
            offline: 'Нет сети — сохраним позже', conflict: 'Конфликт данных — нажми',
            idle: 'Синхронизировано ✓'
        }[st] || st;
        chip.style.background = st === 'conflict' ? '#b3261e' : st === 'offline' ? '#5c6b5e' : '#0f2a1e';
    }
    async function onChipClick() {
        try {
            if (EFS.status === 'offline' || EFS.status === 'saving') {
                // Tap = retry a pending upload; failures keep the dirty state
                // and just re-show the status.
                await EFS.flush();
                return;
            }
            if (EFS.status !== 'conflict') return;
            if (confirm('На сервере есть другая версия прогресса.\n\nОК — загрузить версию с сервера (локальные изменения заменятся).\nОтмена — оставить свою версию.')) {
                await EFS.resolveConflict('refresh');
            } else if (confirm('Перезаписать серверную копию прогрессом с этого устройства?')) {
                await EFS.resolveConflict('overwrite');
            }
        } catch (e) {
            setStatus(isConflict(e) ? 'conflict' : 'offline');
        }
    }

    /* ---------- telegram edge function ---------- */
    EFS.telegramData = () => (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';
    async function tgCall(action, initData) {
        const response = await fetch(URL_ + '/functions/v1/telegram-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: KEY_ },
            body: JSON.stringify({ action, initData })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            const messages = {
                expired_init_data: 'Сессия Telegram устарела. Закрой приложение и открой снова из бота',
                invalid_init_data: 'Не удалось подтвердить Telegram-вход',
                not_configured: 'Вход через Telegram ещё не настроен'
            };
            throw new Error(messages[result.error] || 'Вход через Telegram сейчас недоступен');
        }
        return result;
    }
    EFS.telegramAuth = (action) => tgCall(action, EFS.telegramData());

    /* ---------- snapshot sync (account mode) ---------- */
    async function fetchSnapshot(uid) {
        const { data, error } = await EFS.client.from('account_snapshots')
            .select('payload,revision').eq('user_id', uid).maybeSingle();
        if (error) throw error;
        return data || null;
    }
    function applySnapshot(snap) {
        const payload = snap.payload || {};
        EF.restore(payload.progress);
        const settings = EFS.normalizeSettings(payload.settings);
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(settings));
            localStorage.setItem(scopedSettingsKey(EFS.user.id), JSON.stringify(settings));
        } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('ef:settings-restored')); } catch (e) {}
    }
    function isConflict(error) {
        return error && (String(error.code) === '40001' || /snapshot_conflict/.test(error.message || ''));
    }

    let gen = 0; // in-memory generation counter for in-flight change tracking

    async function uploadOnce(uid, g) {
        const meta = metaGet(uid);
        const settings = readSettings();
        try { localStorage.setItem(scopedSettingsKey(uid), JSON.stringify(settings)); } catch (e) {}
        // Deep-clone the whole payload now — EF.get() is a live reference and
        // changes during an in-flight upload must not corrupt the snapshot row
        // that was already captured for sending.
        const payload = JSON.parse(JSON.stringify({ version: 1, progress: EF.get(), settings }));
        setStatus('saving');
        const { data, error } = await EFS.client.rpc('save_account_snapshot', {
            p_payload: payload, p_expected_revision: meta.rev
        });
        if (error) {
            if (isConflict(error)) { setStatus('conflict'); const e = new Error('snapshot_conflict'); e.code = '40001'; throw e; }
            setStatus('offline');
            throw error;
        }
        // Clear the dirty flag only when no newer local change arrived while
        // this upload was in flight — otherwise keep it and flush again.
        metaSet(uid, { rev: Number(data), dirty: gen === g ? 0 : 1 });
        setStatus('saved');
    }

    async function flushPass() {
        if (EFS.mode !== 'account' || !EFS.user) return;
        const uid = EFS.user.id;
        // New changes can arrive while an upload is in flight — keep flushing
        // until the scoped state is clean at capture time.
        while (metaGet(uid).dirty) {
            await uploadOnce(uid, gen);
        }
    }
    EFS.flush = function () {
        flushChain = flushChain.then(flushPass, flushPass);
        return flushChain;
    };
    function scheduleSave() {
        if (EFS.mode !== 'account' || !EFS.user) return;
        const uid = EFS.user.id;
        gen++;
        const meta = metaGet(uid);
        meta.dirty = 1; metaSet(uid, meta);
        setStatus(EFS.status === 'conflict' ? 'conflict' : 'saving');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { EFS.flush().catch(() => {}); }, 150);
    }

    // Restore the account's cached profile settings into the slot pages read.
    // The guest settings slot is preserved separately on first account bind;
    // a scope with no own settings gets fresh defaults — never leftovers from
    // a guest or another account.
    function restoreScopedSettings(uid) {
        try {
            const gk = guestSettingsKey();
            if (localStorage.getItem(gk) === null) {
                const cur = localStorage.getItem(PROFILE_KEY);
                if (cur !== null) localStorage.setItem(gk, cur);
            }
            const scoped = localStorage.getItem(scopedSettingsKey(uid));
            localStorage.setItem(PROFILE_KEY, scoped !== null ? scoped : '{}');
            window.dispatchEvent(new CustomEvent('ef:settings-restored'));
        } catch (e) {}
    }
    EFS.guestSettingsKey = guestSettingsKey;

    async function enterAccount(uid) {
        // If this device has no own cache for the account and the remote
        // snapshot cannot be read, refuse to boot: admitting fresh defaults
        // here could overwrite real progress stored on the server.
        let hadOwn = false;
        try { hadOwn = localStorage.getItem(EF.cacheKey(uid)) !== null; } catch (e) {}
        if (!hadOwn) {
            const snap = await fetchSnapshot(uid); // throws -> blocking boot error
            EF.bindAccount(uid);
            restoreScopedSettings(uid);
            if (snap) {
                applySnapshot(snap);
                metaSet(uid, { rev: snap.revision, dirty: 0 });
                setStatus('saved');
            } else {
                // Brand-new account: fresh own state seeded only from the
                // owned profile name/exam, then first upload at revision 0.
                try {
                    const { data: p } = await EFS.client.from('profiles').select('name,exam').eq('id', uid).maybeSingle();
                    const s = EF.get();
                    if (p && p.name) s.name = String(p.name).replace(/[<>&"']/g, '').slice(0, 50) || s.name;
                    if (p && (p.exam === 'oge' || p.exam === 'ege')) {
                        s.exam = p.exam;
                        const subs = EF.subjects();
                        if (!subs.includes(s.active)) s.active = subs[0];
                    }
                } catch (e) {}
                EF.save();
                metaSet(uid, { rev: 0, dirty: 1 });
                try { await EFS.flush(); } catch (e) { setStatus(isConflict(e) ? 'conflict' : 'offline'); }
            }
            wireSaves();
            return;
        }
        EF.bindAccount(uid);
        restoreScopedSettings(uid);
        const meta = metaGet(uid);
        if (meta.dirty) {
            // Pending offline changes on this device — flush before pulling so
            // a reload never reverts them. Keep local state on failure.
            try { await EFS.flush(); }
            catch (e) { setStatus(isConflict(e) ? 'conflict' : 'offline'); }
        }
        if (metaGet(uid).dirty) {
            wireSaves();
            setStatus(EFS.status === 'conflict' ? 'conflict' : 'offline');
            return;
        }
        let snap = null, snapFailed = false;
        try { snap = await fetchSnapshot(uid); }
        catch (e) { snapFailed = true; }
        if (snap) {
            applySnapshot(snap);
            metaSet(uid, { rev: snap.revision, dirty: 0 });
            setStatus('saved');
        } else if (snapFailed) {
            // Trusted own cache exists — keep working from it offline, dirty
            // or clean; the next save or reopen retries the pull.
            setStatus('offline');
        } else {
            // Own cache exists but the server has no row: upload it.
            metaSet(uid, { rev: 0, dirty: 1 });
            try { await EFS.flush(); } catch (e) { setStatus(isConflict(e) ? 'conflict' : 'offline'); }
        }
        wireSaves();
    }

    let savesWired = false;
    function wireSaves() {
        if (savesWired) return;
        savesWired = true;
        addEventListener('ef:state-saved', scheduleSave);
        addEventListener('ef:profile-saved', scheduleSave);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') EFS.flush().catch(() => {});
        });
        addEventListener('pagehide', () => { EFS.flush().catch(() => {}); });
        // Connectivity restored: retry pending uploads automatically.
        addEventListener('online', () => {
            if (EFS.user && metaGet(EFS.user.id).dirty) {
                EFS.flush().catch(e => setStatus(isConflict(e) ? 'conflict' : 'offline'));
            }
        });
        // Flush pending writes before navigating between app pages so a lesson
        // reward is uploaded before the next page boots.
        document.addEventListener('click', (e) => {
            if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = e.target.closest && e.target.closest('a[href]');
            if (!a || a.target || a.hasAttribute('download')) return;
            const href = a.getAttribute('href') || '';
            if (!/\.html([?#]|$)/.test(href) || /^(https?:)?\/\//.test(href)) return;
            if (!metaGet(EFS.user.id).dirty) return;
            e.preventDefault();
            EFS.flush().catch(() => {}).finally(() => { location.href = a.href; });
        }, true);
    }

    EFS.resolveConflict = async function (how) {
        if (EFS.mode !== 'account' || !EFS.user) return;
        const uid = EFS.user.id;
        setStatus('saving');
        try {
            const snap = await fetchSnapshot(uid);
            if (how === 'refresh') {
                if (snap) applySnapshot(snap);
                metaSet(uid, { rev: snap ? snap.revision : 0, dirty: 0 });
                setStatus('saved');
                location.reload();
                return;
            }
            // 'overwrite': take the remote revision as expected and push local.
            metaSet(uid, { rev: snap ? snap.revision : 0, dirty: 1 });
            await EFS.flush();
        } catch (e) {
            setStatus(isConflict(e) ? 'conflict' : 'offline');
            throw e;
        }
    };

    /* ---------- auth / boot ---------- */
    function watchAuth() {
        EFS.client.auth.onAuthStateChange((ev, ses) => {
            if (EFS.authenticating || booting || EFS.mode === 'account') return;
            const u = ses && ses.user;
            if (u && !EFS.user) { EFS.user = u; EFS.mode = 'legacy'; EFS.pull().then(() => location.reload()); }
        });
    }

    // Same-launch reuse: Telegram hands the SAME initData to every page of one
    // launch, but the server rejects auth_date older than 300s. So once a
    // launch is verified, we record its SHA-256 digest bound to the session
    // user in sessionStorage; a later page load with a matching session and
    // digest skips re-verification. The record never grants identity itself —
    // the Supabase session JWT still authenticates all requests.
    const LAUNCH_KEY = 'ef_verified_tg_launch';
    async function sha256hex(str) {
        try {
            const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
            return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
        } catch (e) { return null; }
    }
    function readLaunch() {
        try {
            const r = JSON.parse(sessionStorage.getItem(LAUNCH_KEY));
            if (r && typeof r.digest === 'string' && typeof r.userId === 'string') return r;
        } catch (e) {}
        return null;
    }

    async function bootTelegram(initData) {
        const digest = await sha256hex(initData);
        const rec = readLaunch();
        const { data: sd } = await EFS.client.auth.getSession();
        let user = sd && sd.session && sd.session.user;
        if (!(rec && digest && user && user.id === rec.userId && digest === rec.digest)) {
            // Verified status first: the server maps the Telegram id to a user.
            const status = await tgCall('status', initData);
            if (!user || user.id !== status.user_id) {
                EFS.authenticating = true;
                try {
                    const res = await tgCall('sign_in', initData);
                    const { data, error } = await EFS.client.auth.verifyOtp({
                        token_hash: res.token_hash, type: res.type
                    });
                    if (error || !data.session) throw error || new Error('Вход через Telegram не удался');
                    user = data.user;
                } finally { EFS.authenticating = false; }
            }
            // Verification succeeded — remember this launch for this user.
            if (digest) try { sessionStorage.setItem(LAUNCH_KEY, JSON.stringify({ digest, userId: user.id })); } catch (e) {}
        }
        EFS.user = user;
        EFS.mode = 'account';
        localStorage.removeItem('ef_guest');
        await enterAccount(user.id);
        watchAuth();
        setStatus(EFS.status === 'idle' ? 'saved' : EFS.status);
    }

    // Sessions minted through telegram-auth carry a synthetic address — a
    // stored session for one is a Telegram account even outside Telegram.
    const TG_EMAIL_RE = /@telegram\.examflow\.example$/;

    async function boot() {
        const initData = EFS.telegramData();
        if (!window.supabase) {
            // Inside Telegram there is no guest fallback — a missing client
            // library is a blocking configuration/network error.
            if (initData) throw new Error('Не удалось загрузить модуль входа. Проверь соединение и открой приложение заново из бота.');
            return null;
        }
        booting = true;
        try {
            EFS.client = window.supabase.createClient(URL_, KEY_);
            if (initData) {
                await bootTelegram(initData);
                return EFS.user;
            }
            const { data } = await EFS.client.auth.getSession();
            EFS.user = (data && data.session && data.session.user) || null;
            if (EFS.user) {
                if (TG_EMAIL_RE.test(EFS.user.email || '')) {
                    // Direct browser with a stored Telegram session: bind the
                    // account and restore its snapshot — not the legacy path.
                    EFS.mode = 'account';
                    localStorage.removeItem('ef_guest');
                    await enterAccount(EFS.user.id);
                    setStatus(EFS.status === 'idle' ? 'saved' : EFS.status);
                } else {
                    EFS.mode = 'legacy';
                    await EFS.pull();
                }
            }
            watchAuth();
            return EFS.user;
        } finally { booting = false; }
    }

    EFS.init = function () {
        if (!bootP) {
            bootP = boot().catch(e => {
                // A failed init for a Telegram identity — inside Telegram or a
                // stored tg session in a direct browser — is a blocking error,
                // never a silent guest session that pretends to sync.
                if (inTelegram() || EFS.mode === 'account') { EFS.error = e; throw e; }
                return EFS.user || null;
            });
            EFS.ready = bootP;
        }
        return bootP;
    };

    // Blocking error screen for Telegram init failures (pages call this in .catch).
    EFS.showBootError = function (e) {
        if (document.getElementById('efboot')) return;
        const d = document.createElement('div');
        d.id = 'efboot';
        d.setAttribute('style', 'position:fixed;inset:0;z-index:99;background:#f6f3ea;display:flex;' +
            'align-items:center;justify-content:center;padding:24px;text-align:center');
        const msg = (e && e.message) ? e.message : 'Не удалось подключиться к аккаунту';
        d.innerHTML = '<div style="max-width:320px"><div style="font:800 22px Onest,system-ui,sans-serif;color:#12261c;margin-bottom:8px">Нет связи с аккаунтом</div>' +
            '<div style="font:700 14px Onest,system-ui,sans-serif;color:#5c6b5e;margin-bottom:18px">' +
            msg.replace(/[<>&]/g, '') + '</div>' +
            '<button id="efboot-r" style="background:#c6f94d;border:0;border-radius:14px;padding:13px 26px;' +
            'font:800 15px Onest,system-ui,sans-serif;color:#0f2a1e;box-shadow:0 4px 0 #9fcf2a;cursor:pointer">Повторить</button></div>';
        d.querySelector('#efboot-r').onclick = () => location.reload();
        document.body.appendChild(d);
    };

    /* ---------- legacy email/guest behaviour (direct browser only) ---------- */
    EFS.signUp = (email, pass) => EFS.client.auth.signUp({ email, password: pass });
    EFS.signIn = (email, pass) => EFS.client.auth.signInWithPassword({ email, password: pass });
    EFS.signOut = async () => {
        // Scoped account caches stay on disk — another account may use them.
        if (ok()) await EFS.client.auth.signOut();
        EFS.user = null; EFS.mode = 'guest';
    };

    // Сервер — источник правды: тянем профиль и прогресс (legacy email path)
    EFS.pull = async function () {
        if (!ok() || !EFS.user) return;
        try {
            const s = EF.get();
            const { data: p } = await EFS.client.from('profiles').select('*').eq('id', EFS.user.id).single();
            if (p) {
                s.name = p.name || s.name;
                s.exam = p.exam || s.exam;
                s.xp = p.xp; s.coins = p.coins; s.streak = p.streak;
            }
            const { data: rows } = await EFS.client.from('progress').select('*').eq('user_id', EFS.user.id);
            if (rows) rows.forEach(r => {
                const k = r.exam + ':' + r.subject + ':' + r.topic_key;
                s.prog[k] = Math.max(s.prog[k] || 0, r.lessons);
            });
            EF.save();
        } catch (e) {}
    };

    EFS.pushProgress = async function () {
        if (!ok() || !EFS.user || EFS.mode !== 'legacy') { scheduleSave(); return; }
        try {
            const s = EF.get();
            await EFS.client.from('profiles').update({ name: s.name, exam: s.exam }).eq('id', EFS.user.id);
        } catch (e) {}
    };

    EFS.saveProfile = async function () {
        if (EFS.mode === 'account') { scheduleSave(); return; }
        if (!ok() || !EFS.user) return;
        try {
            const s = EF.get();
            await EFS.client.from('profiles').update({ name: s.name, exam: s.exam }).eq('id', EFS.user.id);
        } catch (e) {}
    };

    // Занятие завершено: в account-режиме это просто flush снапшота — локальная
    // игра насчитывает награды как раньше, сервер не проверяет ответы.
    EFS.lesson = async function (subject, topicKey, correct) {
        if (EFS.mode === 'account') { await EFS.flush().catch(() => {}); return null; }
        if (!ok() || !EFS.user) return null;
        try {
            const { data, error } = await EFS.client.rpc('finish_lesson', {
                p_exam: EF.get().exam, p_subject: subject, p_topic_key: topicKey, p_correct: correct
            });
            if (error) return null;
            return data;
        } catch (e) { return null; }
    };

    EFS.claimQuest = function (questId) {
        if (EFS.mode === 'account') { scheduleSave(); return; }
        if (!ok() || !EFS.user) return;
        try { EFS.client.from('quest_claims').insert({ user_id: EFS.user.id, quest_id: String(questId) }); } catch (e) {}
    };

    window.EFS = EFS;
})();
