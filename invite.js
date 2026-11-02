/* ExamFlow — «Позови друга»: builds the referral deep link and hands it to
   Telegram's share dialog (openTelegramLink), navigator.share, or the
   clipboard as a last resort. Pure link logic lives in growth.js. */
(function () {
    'use strict';
    function tgUserId() {
        try {
            const u = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe
                && Telegram.WebApp.initDataUnsafe.user;
            return (u && Number.isSafeInteger(u.id) && u.id > 0) ? u.id : null;
        } catch (e) { return null; }
    }
    function toast(t) {
        try {
            let e = document.getElementById('ef-toast');
            if (!e) {
                e = document.createElement('div');
                e.id = 'ef-toast';
                e.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);' +
                    'background:#12291f;color:#c6f94d;font:800 14px Onest,sans-serif;' +
                    'padding:11px 18px;border-radius:99px;z-index:40;opacity:0;transition:opacity .2s;' +
                    'pointer-events:none;white-space:nowrap';
                document.body.appendChild(e);
            }
            e.textContent = t;
            e.style.opacity = '1';
            clearTimeout(toast._t);
            toast._t = setTimeout(() => { e.style.opacity = '0'; }, 2000);
        } catch (e) { }
    }
    function invite(where) {
        try { if (window.EFTrack) EFTrack.send('invite_share', { where: where || 'app' }); } catch (e) { }
        const G = window.EFGrowth;
        const link = G ? G.inviteLink(null, tgUserId()) : 'https://t.me/myexamflow_bot';
        let exam = '';
        try { exam = EF.get().exam; } catch (e) { }
        const text = G ? G.inviteText(exam) : 'Я готовлюсь к ОГЭ/ЕГЭ по 5 минут в день в Telegram — присоединяйся: ';
        const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(link) +
            '&text=' + encodeURIComponent(text);
        try {
            const wa = window.Telegram && Telegram.WebApp;
            if (wa && typeof wa.openTelegramLink === 'function') {
                wa.openTelegramLink(shareUrl);
                return;
            }
        } catch (e) { }
        if (navigator.share) {
            navigator.share({ text: text + link }).catch(() => { });
            return;
        }
        try {
            const p = navigator.clipboard && navigator.clipboard.writeText(text + link);
            if (p && p.then) p.then(() => toast('Ссылка скопирована'), () => toast('Скопируй: ' + link));
            else toast('Ссылка скопирована');
        } catch (e) { toast('Скопируй: ' + link); }
    }
    if (window.EF) EF.invite = invite;
    window.EFInvite = { invite };
})();
