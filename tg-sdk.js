(function () {
    'use strict';
    function hasLaunchData(value) {
        try { return new URLSearchParams(String(value || '').replace(/^#/, '')).has('tgWebAppData'); }
        catch (e) { return false; }
    }
    let cached = false;
    try { cached = !!sessionStorage.getItem('__telegram__initParams'); } catch (e) { }
    if (window.TelegramWebviewProxy || hasLaunchData(location.hash) ||
        hasLaunchData(location.search) || cached) {
        document.write('<script src="https://telegram.org/js/telegram-web-app.js"><\/script>');
    }
})();
