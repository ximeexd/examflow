/* ExamFlow — Telegram bridge: branded boot overlay, native BackButton routing,
   closing confirmation and safe-area insets. Loaded on every main page after
   the Telegram SDK and before state/sync/view scripts. Every native call is
   guarded: a plain browser (no initData) never invokes native methods. */
(function () {
    'use strict';
    const EFT = window.EFTelegram = {};
    const tw = () => (window.Telegram && window.Telegram.WebApp) || null;
    const inTg = () => { const w = tw(); return !!(w && typeof w.initData === 'string' && w.initData.length > 0); };
    function call(name, arg) {
        if (!inTg()) return;
        const w = tw();
        try {
            if (typeof w[name] === 'function') arg === undefined ? w[name]() : w[name](arg);
        } catch (e) { }
    }

    /* --- boot overlay: mounted before cloud init on every page; removed by
       EFS.init() via finishBoot on success AND failure (boot-error remains) --- */
    let boot = null, bootTimer = 0;
    function mountBoot() {
        if (boot || !document.body || document.getElementById('ef-boot')) return;
        boot = document.createElement('div');
        boot.id = 'ef-boot';
        boot.setAttribute('role', 'status');
        boot.setAttribute('aria-live', 'polite');
        boot.innerHTML =
            '<img src="brand-avatar.png?v=1" alt="" width="72" height="72">' +
            '<b>ExamFlow</b>' +
            '<p id="ef-boot-msg">Загружаем твой прогресс…</p>' +
            '<button type="button" id="ef-boot-retry" hidden>Не удалось загрузиться — попробовать ещё раз</button>';
        document.body.appendChild(boot);
        const r = boot.querySelector('#ef-boot-retry');
        if (r) r.onclick = () => location.reload();
        bootTimer = setTimeout(() => {
            const b = document.getElementById('ef-boot-retry'), m = document.getElementById('ef-boot-msg');
            if (m) m.textContent = 'Загрузка занимает больше времени, чем обычно';
            if (b) b.hidden = false;
        }, 12000);
    }
    EFT.finishBoot = function () {
        if (bootTimer) { clearTimeout(bootTimer); bootTimer = 0; }
        const el = boot || document.getElementById('ef-boot');
        boot = null;
        if (el) el.remove();
    };
    if (document.body) mountBoot();
    else document.addEventListener('DOMContentLoaded', mountBoot);
    // overlay is up — let Telegram hide its own splash and hand us the viewport
    call('ready');
    call('expand');
    call('setHeaderColor', '#f6f3ea');
    call('setBackgroundColor', '#f6f3ea');

    /* --- insets: combine native device safe-area + Telegram content safe-area
       per edge into --ef-native-safe-*, plus a stable-height var for lesson --- */
    const EDGES = ['top', 'bottom', 'left', 'right'];
    const num = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
    function refreshInsets() {
        const w = tw(), root = document.documentElement.style;
        const safe = (w && w.safeAreaInset) || {}, content = (w && w.contentSafeAreaInset) || {};
        for (const e of EDGES)
            root.setProperty('--ef-native-safe-' + e, (num(safe[e]) + num(content[e])) + 'px');
        const vh = w && w.viewportStableHeight;
        if (Number.isFinite(vh) && vh > 0) root.setProperty('--ef-tg-vh', vh + 'px');
    }
    refreshInsets();
    if (inTg()) {
        const w = tw();
        if (typeof w.onEvent === 'function')
            for (const ev of ['safeAreaChanged', 'contentSafeAreaChanged', 'viewportChanged']) {
                try { w.onEvent(ev, refreshInsets); } catch (e) { }
            }
    }

    /* --- native back: fixed same-origin targets; a view may cancel via the
       cancelable ef:native-back event (e.g. profile closes its sheet first) --- */
    const BACK = {
        'lesson.html': 'tasks.html', 'tasks.html': 'index.html',
        'quests.html': 'index.html', 'profile.html': 'index.html'
    };
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    let backBusy = false;
    function onBack() {
        let ev = null;
        try { ev = new CustomEvent('ef:native-back', { cancelable: true }); } catch (e) { }
        if (ev && !window.dispatchEvent(ev)) return; // canceled — a view consumed it
        const target = BACK[page];
        if (!target || backBusy) return;
        backBusy = true; // serialize — repeated clicks while flushing do nothing
        const done = () => { location.href = target; };
        let f = null;
        try {
            if (window.EFS && EFS.mode === 'account' && typeof EFS.flush === 'function') f = EFS.flush();
        } catch (e) { }
        if (f && typeof f.then === 'function') f.then(done, done); else done();
    }
    if (inTg()) {
        const bb = tw().BackButton;
        try {
            if (bb && BACK[page]) {
                if (typeof bb.onClick === 'function') bb.onClick(onBack);
                if (typeof bb.show === 'function') bb.show();
            } else if (bb && typeof bb.hide === 'function') bb.hide();
        } catch (e) { }
    }

    /* --- closing confirmation: only while a cloud save is pending or a
       lesson is mid-flight; guests never reach the native calls --- */
    let pendingSave = false, lessonActive = false;
    function applyClosing() {
        if (pendingSave || lessonActive) call('enableClosingConfirmation');
        else call('disableClosingConfirmation');
    }
    EFT.setPendingSave = function (v) { pendingSave = !!v; applyClosing(); };
    EFT.setLessonActive = function (v) { lessonActive = !!v; applyClosing(); };
})();
