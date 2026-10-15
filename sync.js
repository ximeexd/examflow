/* ExamFlow sync: Telegram CloudStorage account persistence.
   Manifest key examflow_manifest_v1 -> {version:1, current:{id,count,hash}, previous:{...}|null}.
   Envelope {version:1, progress, settings} -> UTF-8 -> base64 -> 4000-char chunks efc_<id>_<i>. */
(function () {
    'use strict';
    const PROFILE_KEY = 'examflow_profile_v2';
    const MANIFEST_KEY = 'examflow_manifest_v1';
    const CHUNK_PREFIX = 'efc_';
    const CHUNK_SIZE = 4000, MAX_CHUNKS = 128;
    const META_PREFIX = 'ef_cloud_meta:';
    const SCOPE_PREFIX = 'tgcloud-v1:';
    const SETTINGS_DEF = { goal: 10, remind: true, time: '18:00', sound: true, dates: { oge: '2027-05-22', ege: '2027-05-29' }, cust: {} };

    const EFS = window.EFS = { user: null, ready: null, mode: 'guest', status: 'idle', error: null, cloud: null };

    EFS.telegramData = function () {
        return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';
    };

    /* --- encoding / hashing --- */
    const enc = new TextEncoder(), dec = new TextDecoder();
    function b64encode(bytes) {
        let s = '';
        for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
        return btoa(s);
    }
    function b64decode(b64) {
        const bin = atob(b64), b = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
        return b;
    }
    async function sha256hex(str) {
        const h = await crypto.subtle.digest('SHA-256', enc.encode(str));
        return Array.from(new Uint8Array(h), x => x.toString(16).padStart(2, '0')).join('');
    }
    function newId() {
        // 32 hex chars — keeps chunk keys well under the 128-char limit
        if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
        const b = crypto.getRandomValues(new Uint8Array(16));
        return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    }
    function cloudErr(code, msg) { const e = new Error(msg || code); e.cloud = code; return e; }
    const ERR_RU = {
        cloud_oversize: 'Слишком много данных для облака Telegram',
        cloud_timeout: 'Telegram не отвечает — проверь связь',
        cloud_corrupt: 'Сохранённые данные повреждены — нажми, чтобы попробовать снова',
        cloud_incomplete: 'Не все данные дошли до облака — нажми, чтобы повторить',
        cloud_read: 'Не удалось прочитать облако Telegram — проверь связь',
        cloud_write: 'Не удалось сохранить в облако Telegram — проверь связь',
        cloud_conflict: 'В облаке есть более новая версия прогресса',
        cloud_unsupported: 'Обнови Telegram до последней версии и открой ExamFlow из бота снова',
        cloud_sdk: 'Не удалось подключиться к Telegram — закрой мини-приложение и открой ExamFlow из бота ещё раз'
    };
    function ruErr(e) { return (e && e.cloud && ERR_RU[e.cloud]) || (e && e.message) || 'Ошибка синхронизации'; }

    /* --- CloudStorage promise wrappers (10s timeout) --- */
    function cGet(key) {
        return new Promise((res, rej) => {
            let done = false;
            const t = setTimeout(() => { if (!done) { done = true; rej(cloudErr('cloud_timeout')); } }, 10000);
            try {
                EFS.cloud.getItem(key, (err, val) => {
                    if (done) return; done = true; clearTimeout(t);
                    if (err) rej(cloudErr('cloud_read', String(err)));
                    else if (typeof val !== 'string') rej(cloudErr('cloud_read', 'bad value type'));
                    else res(val);
                });
            } catch (e) { clearTimeout(t); rej(e); }
        });
    }
    function cGetItems(keys) {
        return new Promise((res, rej) => {
            let done = false;
            const t = setTimeout(() => { if (!done) { done = true; rej(cloudErr('cloud_timeout')); } }, 10000);
            try {
                EFS.cloud.getItems(keys, (err, vals) => {
                    if (done) return; done = true; clearTimeout(t);
                    err ? rej(cloudErr('cloud_read', String(err))) : res(vals || {});
                });
            } catch (e) { clearTimeout(t); rej(e); }
        });
    }
    function cSet(key, val) {
        return new Promise((res, rej) => {
            let done = false;
            const t = setTimeout(() => { if (!done) { done = true; rej(cloudErr('cloud_timeout')); } }, 10000);
            try {
                EFS.cloud.setItem(key, val, (err, ok) => {
                    if (done) return; done = true; clearTimeout(t);
                    if (err) rej(cloudErr('cloud_write', String(err)));
                    else if (ok !== true) rej(cloudErr('cloud_write', 'setItem not confirmed'));
                    else res();
                });
            } catch (e) { clearTimeout(t); rej(e); }
        });
    }
    function cRemove(keys) {
        return new Promise((res, rej) => {
            let done = false;
            const t = setTimeout(() => { if (!done) { done = true; rej(cloudErr('cloud_timeout')); } }, 10000);
            try {
                EFS.cloud.removeItems(keys, (err, ok) => {
                    if (done) return; done = true; clearTimeout(t);
                    if (err) rej(cloudErr('cloud_write', String(err)));
                    else if (ok !== true) rej(cloudErr('cloud_write', 'removeItems not confirmed'));
                    else res();
                });
            } catch (e) { clearTimeout(t); rej(e); }
        });
    }
    async function pmap(arr, conc, fn) {
        const it = arr[Symbol.iterator](), errs = [];
        async function w() {
            while (true) {
                const x = it.next();
                if (x.done) return;
                try { await fn(x.value); } catch (e) { errs.push(e); }
            }
        }
        await Promise.all(Array.from({ length: Math.min(conc, arr.length || 1) }, w));
        if (errs.length) throw errs[0];
    }
    const chunkKey = (id, i) => CHUNK_PREFIX + id + '_' + i;
    const descKeys = d => Array.from({ length: d.count }, (_, i) => chunkKey(d.id, i));

    /* --- manifest / generation protocol --- */
    function validDesc(d) {
        return !!d && typeof d.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(d.id)
            && Number.isSafeInteger(d.count) && d.count >= 1 && d.count <= MAX_CHUNKS
            && typeof d.hash === 'string' && /^[0-9a-f]{64}$/.test(d.hash);
    }
    function parseManifest(raw) {
        if (raw === '') return null;
        if (typeof raw !== 'string') throw cloudErr('cloud_read', 'bad manifest type');
        let m;
        try { m = JSON.parse(raw); } catch (e) { throw cloudErr('cloud_corrupt', 'bad manifest'); }
        // an existing manifest must carry a valid current generation; '' alone means new account
        if (!m || m.version !== 1 || !validDesc(m.current) || !(m.previous == null || validDesc(m.previous)))
            throw cloudErr('cloud_corrupt', 'bad manifest shape');
        return m;
    }
    async function getManifest() { return parseManifest(await cGet(MANIFEST_KEY)); }

    async function readGeneration(desc) {
        const keys = descKeys(desc), vals = {};
        for (let b = 0; b < keys.length; b += 32) {
            const part = await cGetItems(keys.slice(b, b + 32));
            for (const k of keys.slice(b, b + 32)) {
                if (typeof part[k] !== 'string' || !part[k]) throw cloudErr('cloud_incomplete', 'missing chunk ' + k);
                vals[k] = part[k];
            }
        }
        const b64 = keys.map(k => vals[k]).join('');
        if (await sha256hex(b64) !== desc.hash) throw cloudErr('cloud_corrupt', 'hash mismatch');
        let env;
        try { env = JSON.parse(dec.decode(b64decode(b64))); } catch (e) { throw cloudErr('cloud_corrupt', 'bad envelope'); }
        if (!env || env.version !== 1 || !env.progress || typeof env.progress !== 'object' || Array.isArray(env.progress))
            throw cloudErr('cloud_corrupt', 'bad envelope shape');
        return env;
    }
    // one extra manifest re-read when the descriptor went stale; same corrupt manifest stays fatal
    async function readCurrentGeneration(man) {
        try { return { env: await readGeneration(man.current), id: man.current.id }; }
        catch (e) {
            if (e.cloud !== 'cloud_corrupt' && e.cloud !== 'cloud_incomplete') throw e;
            const man2 = await getManifest();
            const c2 = man2 && man2.current;
            if (!c2 || c2.id === man.current.id) throw e;
            return { env: await readGeneration(c2), id: c2.id };
        }
    }
    const manRefs = (man, id) => !!man && ((man.current && man.current.id === id) || (man.previous && man.previous.id === id));

    /* --- settings --- */
    const DANGER_KEYS = { __proto__: 1, constructor: 1, prototype: 1 };
    const validDateStr = v => typeof EF !== 'undefined' && EF.validDate ? EF.validDate(v) :
        (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
    const validTimeStr = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
    EFS.normalizeSettings = function (x) {
        const o = (typeof x === 'object' && x && !Array.isArray(x)) ? x : {};
        const s = { goal: SETTINGS_DEF.goal, remind: SETTINGS_DEF.remind, time: SETTINGS_DEF.time, sound: SETTINGS_DEF.sound, dates: Object.assign({}, SETTINGS_DEF.dates), cust: {} };
        const g = Number(o.goal);
        if (Number.isFinite(g)) s.goal = Math.min(120, Math.max(5, Math.floor(g)));
        if (typeof o.time === 'string' && validTimeStr(o.time)) s.time = o.time;
        if (typeof o.remind === 'boolean') s.remind = o.remind;
        if (typeof o.sound === 'boolean') s.sound = o.sound;
        if (typeof o.dates === 'object' && o.dates && !Array.isArray(o.dates)) {
            for (const k of Object.keys(o.dates)) {
                if (DANGER_KEYS[k] || (k !== 'oge' && k !== 'ege')) continue;
                if (validDateStr(o.dates[k])) s.dates[k] = o.dates[k];
            }
        }
        if (typeof o.cust === 'object' && o.cust && !Array.isArray(o.cust)) {
            for (const k of Object.keys(o.cust)) {
                if (DANGER_KEYS[k] || (k !== 'oge' && k !== 'ege')) continue;
                s.cust[k] = !!o.cust[k];
            }
        }
        return s;
    };
    // in-memory settings mirror: authoritative when localStorage writes fail
    // (quota), reset whenever a different account scope is restored
    let settingsMem = null;
    EFS.setSettings = function (st) {
        const n = EFS.normalizeSettings(st);
        settingsMem = n;
        let ok = true;
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(n)); } catch (e) { ok = false; }
        const scope = (typeof EF !== 'undefined' && EF.userId) ? EF.userId() : null;
        if (scope) { try { localStorage.setItem(scopedSettingsKey(scope), JSON.stringify(n)); } catch (e) { ok = false; } }
        try { window.dispatchEvent(new CustomEvent('ef:profile-saved', { detail: { persisted: ok } })); } catch (e) { }
        return n;
    };
    function readSettings() {
        if (settingsMem) return settingsMem;
        try { return EFS.normalizeSettings(JSON.parse(localStorage.getItem(PROFILE_KEY))); }
        catch (e) { return EFS.normalizeSettings(null); }
    }
    EFS.readSettings = readSettings;
    function guestBackup(key) {
        try {
            const cur = localStorage.getItem(key);
            if (cur === null) return;
            const bk = key + ':guest';
            if (localStorage.getItem(bk) === null) localStorage.setItem(bk, cur);
        } catch (e) { }
    }
    const scopedSettingsKey = scope => PROFILE_KEY + ':' + scope;
    // restore this scope's settings; when a remote payload is supplied it is
    // authoritative — a quota-blocked scoped cache must not overwrite it
    function restoreScopedSettings(scope, remote) {
        const sk = scopedSettingsKey(scope);
        let src = null;
        if (arguments.length > 1) src = remote;
        else { try { src = JSON.parse(localStorage.getItem(sk)); } catch (e) { } }
        const st = EFS.normalizeSettings(src);
        settingsMem = st; // per-scope isolation even under quota failures
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(st)); } catch (e) { }
        try { localStorage.setItem(sk, JSON.stringify(st)); } catch (e) { }
    }
    function persistScopedSettings(scope, st) {
        try { localStorage.setItem(scopedSettingsKey(scope), JSON.stringify(EFS.normalizeSettings(st))); } catch (e) { }
    }

    /* --- per-scope local meta: expectedId + dirty + own pending generation.
       Memory is authoritative — a quota/full localStorage must never fake a
       clean state or lose the pending-generation descriptor. --- */
    const metaMem = {};
    // independent local-write failure flags — a successful state write must
    // never mask a still-failed settings/meta write (and vice versa)
    const localFail = { state: false, settings: false, meta: false };
    const LOCAL_WARN = 'Нет связи и локальная копия не записана — прогресс может не сохраниться после закрытия';
    function cleanMeta(raw) {
        const d = { expectedId: null, dirty: 0, own: null, garbage: [] };
        if (!raw || typeof raw !== 'object') return d;
        if (typeof raw.expectedId === 'string' || raw.expectedId === null) d.expectedId = raw.expectedId;
        if (raw.dirty) d.dirty = 1;
        if (validDesc(raw.own)) d.own = raw.own;
        if (Array.isArray(raw.garbage)) {
            const seen = {};
            d.garbage = raw.garbage.filter(d2 => validDesc(d2) && !seen[d2.id] && (seen[d2.id] = 1));
        }
        return d;
    }
    function metaGet(scope) {
        if (metaMem[scope]) return cleanMeta(metaMem[scope]);
        let raw = null;
        try { raw = JSON.parse(localStorage.getItem(META_PREFIX + scope)); } catch (e) { }
        const d = cleanMeta(raw);
        metaMem[scope] = d;
        return d;
    }
    function metaSet(scope, m) {
        const d = cleanMeta(m);
        metaMem[scope] = d;
        try { localStorage.setItem(META_PREFIX + scope, JSON.stringify(d)); localFail.meta = false; }
        catch (e) { localFail.meta = true; }
        return d;
    }

    /* --- status chip --- */
    function setStatus(s, msg) {
        EFS.status = s;
        // closing confirmation tracks real pending work (native call is
        // guarded and no-ops outside Telegram)
        try {
            if (window.EFTelegram && typeof EFTelegram.setPendingSave === 'function')
                EFTelegram.setPendingSave(s === 'saving' || s === 'offline' || s === 'conflict' || s === 'error');
        } catch (e) { }
        // any still-failed local write turns a generic offline status into an
        // explicit warning — callers must not overwrite it with reassuring text
        if (s === 'offline' && (localFail.state || localFail.settings || localFail.meta)) msg = LOCAL_WARN;
        EFS.error = msg || null;
        const st = document.getElementById('sync-status');
        if (st) {
            if (EFS.mode === 'guest') {
                if (EFS.telegramData() && EFS.status === 'idle') { st.hidden = true; }
                else {
                    st.hidden = false; st.onclick = null;
                    st.textContent = s === 'error' ? 'Ошибка: ' + (msg || 'не сохранено')
                        : 'Демо: прогресс только в этом браузере';
                }
            } else {
                st.hidden = false;
                st.textContent = s === 'saved' ? 'Сохранено в Telegram ✓' :
                    s === 'saving' ? 'Сохраняем…' :
                        s === 'offline' ? (msg || 'Нет связи — нажми, чтобы повторить') :
                            s === 'conflict' ? 'Конфликт данных — нажми' :
                                s === 'error' ? 'Ошибка: ' + (msg || 'sync') : '';
            }
        }
        try { document.dispatchEvent(new CustomEvent('ef:sync-status', { detail: { status: s, error: msg || null } })); } catch (e) { }
    }
    function installChip() {
        if (document.getElementById('sync-status')) return;
        const b = document.createElement('button');
        b.id = 'sync-status'; b.type = 'button'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite');
        b.style.cssText = 'position:fixed;left:calc(10px + var(--ef-safe-left,env(safe-area-inset-left,0px)));bottom:calc(84px + var(--ef-safe-bottom,env(safe-area-inset-bottom,0px)));z-index:15;max-width:78vw;font:700 12px Onest,sans-serif;color:var(--ink);background:var(--card);border:1.5px solid var(--line);border-radius:99px;padding:7px 12px;cursor:pointer;box-shadow:0 3px 0 var(--line)';
        b.onclick = onChipClick;
        document.body.appendChild(b);
        setStatus(EFS.status, EFS.error);
    }
    function onChipClick() {
        if (EFS.mode !== 'account') return;
        if (EFS.status === 'conflict') {
            if (confirm('В облаке есть более новая версия прогресса. Обновить это устройство из облака?')) {
                EFS.resolveConflict('refresh').then(() => location.reload()).catch(e => setStatus('error', ruErr(e)));
            } else if (confirm('Перезаписать облако данными этого устройства? Текущая облачная версия будет заменена.')) {
                EFS.resolveConflict('overwrite').catch(e => setStatus(e.cloud === 'cloud_conflict' ? 'conflict' : 'error', ruErr(e)));
            }
            return; // declining both keeps local and remote untouched
        }
        if (EFS.status === 'offline' || EFS.status === 'error' || EFS.status === 'saving') retryCloud();
    }
    function retryCloud() {
        const m = metaGet(EF.userId());
        if (m.dirty) EFS.flush().catch(e => setStatus(e.cloud === 'cloud_conflict' ? 'conflict' : 'offline', ruErr(e)));
        else if (EFS.status === 'offline') {
            EFS.pullCurrent().then(() => location.reload()).catch(e => setStatus('offline', ruErr(e)));
        }
    }
    if (document.readyState !== 'loading') installChip(); else document.addEventListener('DOMContentLoaded', installChip);
    window.addEventListener('online', () => { if (EFS.mode === 'account' && EFS.status !== 'conflict') retryCloud(); });

    /* --- mutation -> debounced serialized drain --- */
    let gen = 0, drain = null, saveTimer = 0;
    function markDirty() {
        if (EFS.mode !== 'account') return;
        gen++;
        const scope = EF.userId(), m = metaGet(scope);
        m.dirty = 1; metaSet(scope, m);
        if (EFS.status !== 'conflict') setStatus('saving');
    }
    function scheduleSave() {
        if (EFS.mode !== 'account') return;
        markDirty();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { drainOnce().catch(() => { }); }, 150);
    }
    function drainOnce() {
        if (drain) return drain;
        const p = (async () => {
            try {
                while (true) {
                    const scope = EF.userId(), m = metaGet(scope);
                    if (!m.dirty) break;
                    if (EFS.status === 'conflict') { metaSet(scope, m); throw cloudErr('cloud_conflict'); }
                    await uploadOnce(scope, gen);
                }
            } catch (e) {
                if (e.cloud === 'cloud_conflict') setStatus('conflict');
                else if (e.cloud !== 'cloud_oversize') setStatus('offline', ruErr(e));
                throw e;
            }
        })();
        drain = p;
        // .finally callbacks are microtasks — safe even when p resolves synchronously;
        // catch the derived promise so a rejected drain never goes unhandled
        p.finally(() => { if (drain === p) drain = null; }).catch(() => {});
        return drain;
    }
    // Unify the duplicated daily-goal field: progress goal and profile settings
    // goal must agree. A stored non-default profile goal is the older authored
    // preference and wins; otherwise the onboarding/progress goal wins.
    function reconcileGoal() {
        try {
            const st = readSettings(), progGoal = EF.get().goal;
            const goal = st.goal !== SETTINGS_DEF.goal ? st.goal : progGoal;
            if (goal !== st.goal || goal !== progGoal) {
                EF.get().goal = goal; EF.save();
                if (goal !== st.goal) { st.goal = goal; EFS.setSettings(st); }
            }
        } catch (e) { }
    }
    window.addEventListener('ef:state-saved', e => {
        if (e && e.detail) localFail.state = e.detail.persisted === false;
        if (EFS.mode === 'account') scheduleSave();
        else if (localFail.state)
            setStatus('error', 'Не удалось сохранить прогресс в этом браузере');
    });
    window.addEventListener('ef:profile-saved', e => {
        if (e && e.detail) localFail.settings = e.detail.persisted === false;
        if (EFS.mode === 'account') { persistScopedSettings(EF.userId(), readSettings()); scheduleSave(); }
        else if (localFail.settings)
            setStatus('error', 'Не удалось сохранить настройки в этом браузере');
    });
    EFS.pushProgress = function () { scheduleSave(); return drain || Promise.resolve(); };
    EFS.saveProfile = function () {
        if (EFS.mode !== 'account') return;
        persistScopedSettings(EF.userId(), readSettings()); scheduleSave();
    };
    EFS.flush = function () { return drainOnce(); };
    EFS.lesson = async function () { await EFS.flush().catch(e => console.warn('cloud flush', e)); return null; };
    EFS.claimQuest = function () { scheduleSave(); };

    async function uploadOnce(scope, g) {
        const meta = metaGet(scope);
        // discard only own leftover chunks from an earlier interrupted write;
        // if removal fails keep the descriptor and reject this retry rather
        // than starting a new generation and forgetting the orphan record
        if (meta.own) {
            const man0 = await getManifest();
            if (!manRefs(man0, meta.own.id)) {
                try { await cRemove(descKeys(meta.own)); meta.own = null; }
                catch (e) { meta.garbage = metaGet(scope).garbage; metaSet(scope, meta); throw e; }
            } else meta.own = null;
            meta.garbage = metaGet(scope).garbage; metaSet(scope, meta);
        }
        // retry previously failed post-commit cleanups (own recorded garbage only);
        // merge against the LATEST meta — a cleanup elsewhere may have queued a
        // new descriptor while we were awaiting, and it must never be dropped
        if (meta.garbage.length) {
            const attempted = {}, keep = [];
            for (const d of meta.garbage) {
                attempted[d.id] = 1;
                try {
                    const man = await getManifest();
                    if (manRefs(man, d.id)) continue;
                    await cRemove(descKeys(d));
                } catch (e) { keep.push(d); }
            }
            const latest = metaGet(scope);
            const merged = latest.garbage.filter(g => !attempted[g.id]);
            for (const k of keep) if (!merged.some(g => g.id === k.id)) merged.push(k);
            latest.garbage = merged; metaSet(scope, latest);
        }
        const env = { version: 1, progress: EF.get(), settings: readSettings() };
        const payload = JSON.parse(JSON.stringify(env));
        const b64 = b64encode(enc.encode(JSON.stringify(payload)));
        const chunks = [];
        for (let i = 0; i < b64.length; i += CHUNK_SIZE) chunks.push(b64.slice(i, i + CHUNK_SIZE));
        if (chunks.length > MAX_CHUNKS) { setStatus('error', ERR_RU.cloud_oversize); throw cloudErr('cloud_oversize'); }
        const hash = await sha256hex(b64), id = newId();
        const desc = { id, count: chunks.length, hash };
        const startMan = await getManifest();
        const startCur = startMan && startMan.current ? startMan.current : null;
        if ((startCur ? startCur.id : null) !== meta.expectedId) {
            meta.dirty = 1; meta.garbage = metaGet(scope).garbage; metaSet(scope, meta);
            setStatus('conflict'); throw cloudErr('cloud_conflict');
        }
        // record our in-flight generation BEFORE writing chunks so a retry can clean it up
        meta.own = desc; meta.garbage = metaGet(scope).garbage; metaSet(scope, meta);
        await pmap(chunks.map((c, i) => [chunkKey(id, i), c]), 4, p => cSet(p[0], p[1]));
        const man2 = await getManifest();
        const cur2 = man2 && man2.current ? man2.current : null;
        if ((cur2 ? cur2.id : null) !== (startCur ? startCur.id : null)) {
            setStatus('conflict'); throw cloudErr('cloud_conflict');
        }
        await cSet(MANIFEST_KEY, JSON.stringify({ version: 1, current: desc, previous: startCur }));
        // keep pending cleanup records — a failed obsolete-removal retry must
        // not be silently dropped when the new generation commits
        // merge against the LATEST garbage — meta may be stale by several awaits
        metaSet(scope, { expectedId: id, dirty: gen > g ? 1 : 0, own: null, garbage: metaGet(scope).garbage });
        // only claim saved when no newer local change is still unacknowledged
        setStatus(gen > g ? 'saving' : 'saved');
        // await the obsolete-generation cleanup so a resolved flush always
        // reflects the final garbage metadata; the drain queue serializes us
        const obsolete = startMan && startMan.previous;
        if (obsolete && validDesc(obsolete)) await cleanupObsolete(scope, obsolete);
    }
    async function cleanupObsolete(scope, desc) {
        try {
            const man = await getManifest();
            if (manRefs(man, desc.id)) return;
            await cRemove(descKeys(desc));
        } catch (e) {
            // record the failed cleanup so the next save retries it — never a
            // global getKeys sweep, only this known own-obsolete generation
            const meta = metaGet(scope);
            if (!meta.garbage.some(d => d.id === desc.id)) {
                meta.garbage.push(desc); metaSet(scope, meta);
            }
            console.warn('cleanup', e);
        }
    }

    /* --- account entry --- */
    async function pullIntoLocal(scope, man) {
        const r = await readCurrentGeneration(man);
        EF.restore(r.env.progress);
        restoreScopedSettings(scope, r.env.settings);
        const m = metaGet(scope); m.expectedId = r.id; m.dirty = 0; metaSet(scope, m);
    }
    EFS.pullCurrent = async function () {
        const scope = EF.userId(), man = await getManifest();
        if (man && man.current) { await pullIntoLocal(scope, man); setStatus('saved'); return true; }
        // remote wiped externally while we hold an old expectedId — never silently recreate
        if (metaGet(scope).expectedId) { setStatus('conflict'); throw cloudErr('cloud_conflict'); }
        return false;
    };
    function wireSaves() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && EF.userId() && metaGet(EF.userId()).dirty) EFS.flush().catch(() => { });
        });
        window.addEventListener('pagehide', () => {
            if (EF.userId() && metaGet(EF.userId()).dirty) EFS.flush().catch(() => { });
        });
        document.addEventListener('click', e => {
            if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
            if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
            const scope = EF.userId();
            if (!scope || !metaGet(scope).dirty) return;
            let u;
            try { u = new URL(a.href, location.href); } catch (err) { return; }
            if (u.origin !== location.origin || !/\.html$/.test(u.pathname)) return;
            e.preventDefault();
            const nav = () => { location.href = a.href; };
            EFS.flush().then(nav, nav);
        }, true);
    }
    EFS.resolveConflict = async function (how) {
        const scope = EF.userId(), man = await getManifest();
        const cur = man && man.current ? man.current : null;
        if (how === 'refresh') {
            if (cur) { await pullIntoLocal(scope, man); setStatus('saved'); return; }
            // remote wiped — accept the loss explicitly: reset local to defaults
            // and commit a fresh snapshot rather than claiming unsynced data saved
            EF.restore(EF.defaults()); EF.save();
            const m = metaGet(scope); m.expectedId = null; m.dirty = 1; metaSet(scope, m);
            setStatus('saving');
            await drainOnce();
            return;
        }
        const m = metaGet(scope); m.expectedId = cur ? cur.id : null; m.dirty = 1; metaSet(scope, m);
        setStatus('saving');
        return drainOnce();
    };
    async function enterAccount(scope, firstName) {
        let hadOwn = false;
        try { hadOwn = localStorage.getItem(EF.cacheKey(scope)) !== null; } catch (e) { }
        let man = null;
        try { man = await getManifest(); }
        catch (e) {
            if (!hadOwn) throw cloudErr('cloud_read', 'Не удалось открыть облако Telegram. Проверь связь и попробуй снова.');
            EF.bindAccount(scope); restoreScopedSettings(scope); wireSaves(); setStatus('offline', ruErr(e)); return;
        }
        const meta = metaGet(scope);
        if (!man) {
            EF.bindAccount(scope); restoreScopedSettings(scope); wireSaves();
            // manifest vanished while our cache still references a committed
            // generation — remote was wiped/changed externally; preserve local
            // data and let the user choose, never silently recreate the cloud
            if (hadOwn && meta.expectedId) { setStatus('conflict'); return; }
            if (!hadOwn) {
                const S = EF.get();
                S.name = String(firstName || 'Ученик').slice(0, 40) || 'Ученик';
                EF.save();
            }
            const m0 = metaGet(scope); m0.expectedId = null; m0.dirty = 1; metaSet(scope, m0);
            setStatus('saving');
            // bootstrap snapshot goes through the same serialized queue as later
            // mutations so the debounced save cannot race a second writer
            try { await drainOnce(); } catch (e) {
                if (e.cloud !== 'cloud_conflict') setStatus('offline', ruErr(e));
            }
            return;
        }
        if (hadOwn && man.current.id === meta.expectedId) {
            EF.bindAccount(scope); restoreScopedSettings(scope); wireSaves();
            if (meta.dirty) { try { await drainOnce(); } catch (e) { if (e.cloud !== 'cloud_conflict') setStatus('offline', ruErr(e)); } }
            else setStatus('saved');
            return;
        }
        if (hadOwn && meta.dirty) {
            EF.bindAccount(scope); restoreScopedSettings(scope); wireSaves(); setStatus('conflict'); return;
        }
        EF.bindAccount(scope); restoreScopedSettings(scope);
        try { await pullIntoLocal(scope, man); setStatus('saved'); }
        catch (e) {
            if (!hadOwn) throw e;
            setStatus('offline', ruErr(e));
        }
        wireSaves();
    }

    /* --- init --- */
    function verOK(tw) {
        if (typeof tw.isVersionAtLeast === 'function') return tw.isVersionAtLeast('6.9');
        const a = String(tw.version || '0').split('.').map(x => parseInt(x, 10) || 0), b = [6, 9];
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const x = a[i] || 0, y = b[i] || 0;
            if (x !== y) return x > y;
        }
        return true;
    }
    let initPromise = null;
    EFS.init = function () {
        if (initPromise) return initPromise;
        initPromise = (async () => {
            const initData = EFS.telegramData();
            if (!initData) {
                // Telegram launch without a working SDK (script blocked, old
                // webview): the URL carries tgWebAppData but initData is empty.
                // Refuse account mode — never enter guest and silently discard
                // the account cache. The hash is only checked for presence;
                // its payload is never parsed or trusted.
                try {
                    if (new URLSearchParams(location.hash.slice(1)).has('tgWebAppData'))
                        throw cloudErr('cloud_sdk');
                } catch (e) { if (e && e.cloud) throw e; }
                EFS.mode = 'guest'; setStatus('idle'); reconcileGoal(); return null;
            }
            const tw = window.Telegram.WebApp;
            const cs = tw.CloudStorage;
            const apiOK = cs && typeof cs.getItem === 'function' && typeof cs.getItems === 'function'
                && typeof cs.setItem === 'function' && typeof cs.removeItems === 'function' && typeof cs.getKeys === 'function';
            if (!apiOK || !verOK(tw))
                throw cloudErr('cloud_unsupported', 'Обнови Telegram до последней версии и открой ExamFlow из бота снова.');
            const u = tw.initDataUnsafe && tw.initDataUnsafe.user;
            if (!u || !Number.isSafeInteger(u.id) || u.id <= 0)
                throw cloudErr('cloud_unsupported', 'Telegram не передал данные аккаунта. Открой ExamFlow из бота снова.');
            EFS.cloud = cs;
            const scope = SCOPE_PREFIX + String(u.id);
            EFS.user = { id: scope, tgId: u.id, name: String(u.first_name || '').slice(0, 40) };
            EFS.mode = 'account';
            guestBackup(PROFILE_KEY);
            guestBackup('examflow_state_v1');
            await enterAccount(scope, u.first_name);
            reconcileGoal();
            return EFS.user;
        })().catch(e => {
            EFS.mode = 'guest';
            throw e;
        });
        // the boot overlay comes down on success AND failure — a boot error
        // must stay visible instead of being hidden behind it
        const finishBoot = () => {
            try {
                if (window.EFTelegram && typeof EFTelegram.finishBoot === 'function') EFTelegram.finishBoot();
            } catch (e) { }
        };
        initPromise.then(finishBoot, finishBoot);
        EFS.ready = initPromise;
        return initPromise;
    };
    EFS.showBootError = function (e) {
        setStatus('error', ruErr(e));
        const d = document.createElement('div');
        d.id = 'boot-error';
        d.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:var(--bg,#f6f3ea);padding:calc(20px + var(--ef-safe-top,env(safe-area-inset-top,0px))) calc(20px + var(--ef-safe-right,env(safe-area-inset-right,0px))) calc(20px + var(--ef-safe-bottom,env(safe-area-inset-bottom,0px))) calc(20px + var(--ef-safe-left,env(safe-area-inset-left,0px)))';
        d.innerHTML = '<div style="max-width:340px;width:100%;background:var(--card,#fffdf7);border:2px solid var(--line,#e6e1d1);border-radius:22px;padding:22px;text-align:center;box-shadow:0 5px 0 var(--line,#e6e1d1)">' +
            '<img src="brand-avatar.png?v=1" alt="" style="width:72px;height:72px;border-radius:18px;display:block;margin:0 auto 10px">' +
            '<h2 style="font:800 20px Onest,sans-serif;margin:0 0 6px;color:var(--ink,#12261c)">Не удалось открыть ExamFlow</h2>' +
            '<p style="font:700 13px Onest,sans-serif;color:var(--mute,#6b7a70);margin:0 0 14px">' + String(ruErr(e)).replace(/</g, '&lt;') + '</p>' +
            '<button id="boot-retry" style="width:100%;background:var(--lime,#c6f94d);color:var(--dark,#0f2a1e);font:800 15px Onest,sans-serif;border:0;border-radius:14px;padding:13px;cursor:pointer;box-shadow:0 4px 0 var(--lime-d,#9fcf2a)">Попробовать снова</button></div>';
        document.body.appendChild(d);
        d.querySelector('#boot-retry').onclick = () => { d.remove(); initPromise = null; EFS.init().then(() => location.reload()).catch(EFS.showBootError); };
    };
})();
