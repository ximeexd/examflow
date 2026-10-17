/* ExamFlow — profile page view. Badge list is built once per render into
   window.__BD so the click handler never touches render-local scope. */
EFS.init().then(start).catch(EFS.showBootError);
function start() {
    var K = 'stroke="#12261c" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    var IC = { flame: '<path d="M24 6c2 8 12 12 12 24a12 12 0 0 1-24 0c0-6 4-8 5-14 3 2 4 5 4 8 3-4 4-10 3-18Z"/>', book: '<path d="M24 12C18 8 10 8 4 10v28c6-2 14-2 20 2 6-4 14-4 20-2V10c-6-2-14-2-20 2Zm0 0v28"/>', check: '<circle cx="24" cy="24" r="18"/><path d="M15 25l7 7 12-14"/>', star: '<path d="M24 6l5.5 12L42 19.5l-9 9 2.5 12.5L24 35l-11.5 6L15 28.5l-9-9L18.5 18Z"/>', target: '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="2" fill="#12261c"/>', trophy: '<path d="M14 8h20v12a10 10 0 0 1-20 0ZM14 12H6c0 8 4 12 9 12M34 12h8c0 8-4 12-9 12M24 30v8M16 42h16"/>' };
    function ic(k) { return '<svg viewBox="0 0 48 48" ' + K + ' aria-hidden="true">' + IC[k] + '</svg>' }
    var KEY = "examflow_profile_v2";
    function readSt() {
        // memory-aware settings (survives quota failures), same normalization
        var s = EFS.readSettings ? EFS.readSettings() : EFS.normalizeSettings(null);
        var x = null; try { x = localStorage.getItem(KEY) } catch (e) { }
        // persist the sanitized copy once so a bad payload can't linger
        try { if (x && x !== JSON.stringify(s)) localStorage.setItem(KEY, JSON.stringify(s)) } catch (e) { }
        // the progress goal wins only when the memory-aware reader is absent
        if (!EFS.readSettings) s.goal = EF.get().goal;
        return s;
    }
    var st = readSt();
    addEventListener('ef:settings-restored', function () { st = readSt() });
    // writes BOTH profile slots + memory via the shared helper, then notifies
    function save() { st = EFS.setSettings ? EFS.setSettings(st) : st }
    var SUBJC = { "Математика": ["∑", "#c6f94d"], "Базовая математика": ["∑", "#c6f94d"], "Профильная математика": ["∫", "#c6f94d"], "Русский язык": ["Аа", "#ffc29a"], "Информатика": ["</>", "#c9b8ff"], "Обществознание": ["⚖", "#9fe0ff"], "Физика": ["⚡", "#9fe0ff"], "Биология": ["🧬", "#8ff0b4"], "Химия": ["⚗", "#ffadca"], "История": ["★", "#f4d9a6"], "Английский": ["Aa", "#b8e6ff"], "Литература": ["📖", "#ffc9a6"], "География": ["🌍", "#a9e8d8"] };
    var $ = function (i) { return document.getElementById(i) }, esc = EF.escapeHTML;
    function avatarUrl() {
        try {
            var u = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
            var p = u && u.photo_url;
            if (p && /^https:\/\/([a-z0-9-]+\.)*(t\.me|telesco\.pe)\//i.test(p)) return p;
        } catch (e) { }
        return 'brand-avatar.png?v=1';
    }
    var DEF = { oge: "2027-05-22", ege: "2027-05-29" };
    function cur() { return EF.validDate(st.dates[EF.get().exam]) ? st.dates[EF.get().exam] : DEF[EF.get().exam] }
    function apx() { return !st.cust[EF.get().exam] }
    function dtext() { var d = new Date(cur() + "T00:00:00"); return isNaN(d) ? "дата не задана" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) }
    function days() { var d = new Date(cur() + "T00:00:00"); if (isNaN(d)) return null; var n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((d - n) / 864e5) }
    function week() {
        var log = EF.get().dayLog || {}, t = (new Date().getDay() + 6) % 7, L = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"], h = "", sum = 0, vals = [];
        for (var i = 0; i < 7; i++) { var x = new Date(); x.setDate(x.getDate() - t + i); var k = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); vals.push(log[k] || 0) }
        var mx = Math.max(1, Math.max.apply(null, vals));
        vals.forEach(function (v, i) { var f = i > t; if (!f) sum += v; h += '<div class="' + (i == t ? "t" : "") + '"><em>' + (f ? "" : v) + '</em><i class="' + (f ? "z" : "") + '" style="height:' + (f ? 16 : Math.max(10, v / mx * 72)) + 'px"></i>' + L[i] + '</div>' }); return { h: h, sum: sum }
    }
    function toast(t) { var e = $("ts"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("on") }, 2000) }
    function lvlName(l) { return l < 3 ? "Новичок" : l < 6 ? "Знаток" : l < 10 ? "Мастер" : "Легенда" }
    function buildBD() {
        var S = EF.get(), topicsDone = EF.subjects().reduce(function (a, n) { return a + EF.passedCount(n) }, 0);
        return [["Первый шаг", "book", Math.min(EF.totalLessons(), 1), 1, "Заверши первое занятие"], ["Серия 7", "flame", Math.min(S.streak, 7), 7, "Занимайся 7 дней подряд"], ["Первая тема", "star", Math.min(topicsDone, 1), 1, "Пройди все 10 занятий темы"], ["100 ответов", "check", Math.min(S.totalCorrect, 100), 100, "Дай 100 верных ответов"], ["Пять тем", "trophy", Math.min(topicsDone, 5), 5, "Пройди 5 тем"], ["Без ошибок ×5", "target", Math.min(S.cleanTotal, 5), 5, "Пройди 5 занятий без ошибок"]];
    }
    function render() {
        var S = EF.get(), T = EF.today(), d = days(), w = week();
        var BD = window.__BD = buildBD();
        var done = BD.filter(function (b) { return b[2] >= b[3] }).length;
        var SUBJ = EF.subjects().map(function (n) { var c = SUBJC[n] || ["📚", "#c6f94d"], tot = EF.topics(n).length * 10, les = EF.topics(n).reduce(function (a, x) { return a + EF.lessonsDone(n, x.key) }, 0); return [n, c[0], c[1], les, tot] });
        var totalCap = SUBJ.reduce(function (a, x) { return a + x[4] }, 0) || 1,
            pc = Math.round(SUBJ.reduce(function (a, x) { return a + x[3] }, 0) / totalCap * 100) || 0;
        var mins = T.lessons * 5, tg = Math.min(100, mins / st.goal * 100);
        var lv = EF.level(), need = lv * 500 - S.xp;
        $("app").innerHTML = '<div class="top"><h1>Профиль</h1><span class="pill">⚡ ' + S.xp + ' XP</span><span class="pill">◎ ' + S.coins + '</span></div>' +
            '<section class="pp"><button class="edit" data-edit="1" aria-label="Редактировать профиль">✎</button><div class="rgw"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="#2d5340" stroke-width="6"/><circle id="rc" cx="50" cy="50" r="46" fill="none" stroke="#c6f94d" stroke-width="6" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="289" transform="rotate(-90 50 50)"/></svg><img class="av" src="' + esc(avatarUrl()) + '" alt="Аватар"></div><b>' + esc(S.name) + '</b><span class="ttl">Уровень ' + lv + ' · ' + lvlName(lv) + '</span><p class="nx">' + (S.xp % 500) + ' из 500 XP · до ' + (lv + 1) + '-го уровня ' + need + '</p></section>' +
            '<div class="tri"><div><strong>' + S.streak + '</strong><span>дней подряд</span></div><div><strong>' + S.coins + '</strong><span>монет</span></div><div><strong>' + EF.totalLessons() + '</strong><span>занятий</span></div></div>' +
            '<button class="exl" data-edit="1"><div class="r"><div><b>До ' + (S.exam == "oge" ? "ОГЭ" : "ЕГЭ") + '</b><small>' + (apx() ? "примерно " : "") + esc(dtext()) + '</small></div><div class="n">' + (d === null ? "—" : (apx() ? "≈" : "") + Math.max(0, d)) + '<span>дней</span></div></div><div class="bar"><b style="width:' + pc + '%"></b></div><small style="margin-top:6px">Курс пройден на ' + pc + '%</small>' + '</button>' +
            '<div class="box td"><div class="r"><span>Цель на сегодня</span><small id="tgt">' + mins + ' из ' + st.goal + ' мин</small></div><div class="bar"><b id="tgb" style="width:' + tg + '%"></b></div></div>' +
            '<h2>Достижения <small>' + done + ' из ' + BD.length + '</small></h2><div class="bd">' + BD.map(function (b, i) { var ok = b[2] >= b[3]; return '<button class="bg ' + (ok ? "" : "lk") + '" data-b="' + i + '"><div class="ic">' + ic(b[1]) + '</div><small>' + esc(b[0]) + '</small>' + (ok ? "" : '<em>' + b[2] + ' из ' + b[3] + '</em>') + '</button>' }).join("") + '</div>' +
            '<h2>Подробнее</h2><details class="ac" open><summary><span>Предметы</span><small>' + SUBJ.length + ' предметов</small></summary><div>' + SUBJ.map(function (s) { return '<div class="sj"><span class="g" style="background:' + s[2] + '">' + esc(s[1]) + '</span><div><b>' + esc(s[0]) + '<small>' + s[3] + ' из ' + s[4] + '</small></b><div class="bar"><b style="width:' + Math.round(s[3] / s[4] * 100) + '%"></b></div></div></div>' }).join("") + '</div></details>' +
            '<details class="ac"><summary><span>Неделя</span><small>занятий: ' + w.sum + '</small></summary><div><div class="wk">' + w.h + '</div></div></details>' +
            '<details class="ac"><summary><span>Настройки</span><small>цель, напоминания</small></summary><div><div class="set"><div><b>Цель на день</b><small>Минут занятий</small></div><div class="seg goal-set">' + [5, 10, 15, 20, 30].map(function (g) { return '<button data-g="' + g + '" class="' + (st.goal == g ? "on" : "") + '">' + g + '</button>' }).join("") + '</div></div><div class="set"><div><b>План занятий</b><small>Время для занятий · уведомления пока не отправляются</small></div><div style="display:flex;gap:8px;align-items:center"><input class="tm" type="time" id="tm" value="' + esc(st.time) + '" aria-label="Время для занятий"' + (st.remind ? "" : " hidden") + '><button class="sw" role="switch" aria-checked="' + st.remind + '" aria-label="Время для занятий" data-sw="remind"></button></div></div><div class="set"><div><b>Звуки</b><small>Эффекты при ответах</small></div><button class="sw" role="switch" aria-checked="' + st.sound + '" aria-label="Звуки" data-sw="sound"></button></div></div></details>' +
            '<button class="out" data-out="1">Сбросить прогресс</button><p class="foot">ExamFlow — готовься к ОГЭ и ЕГЭ маленькими шагами каждый день.<br><a href="privacy.html" style="color:var(--limed);font-weight:700">Конфиденциальность</a></p>';
        var av = document.querySelector('.av');
        if (av) av.addEventListener('error', function () { this.src = 'brand-avatar.png?v=1' }, { once: true });
        requestAnimationFrame(function () { requestAnimationFrame(function () { var r = $("rc"); if (r) r.style.strokeDashoffset = 289 * (1 - EF.levelPct() / 100) }) })
    }
    // focus-managed bottom sheet: remembers opener, Escape closes, Tab trapped.
    // inert+aria-hidden while closed; focus returns to the opener (or a fresh
    // .edit fallback when the trigger was re-rendered) BEFORE hiding.
    var opener = null;
    function openSh(h, btn) {
        // the clicked trigger is the reliable opener — touch/programmatic
        // clicks leave document.activeElement on <body>
        opener = btn || document.activeElement;
        var sh = $("sh"); sh.innerHTML = h;
        sh.inert = false; sh.setAttribute('aria-hidden', 'false'); sh.setAttribute('aria-modal', 'true');
        var h3 = sh.querySelector('h3'); if (h3) { h3.id = 'sh-ttl'; sh.setAttribute('aria-labelledby', 'sh-ttl'); }
        sh.classList.add("on");
        $("bk").classList.add("on"); $("bk").setAttribute('aria-hidden', 'false');
        var f = sh.querySelector('input,button'); if (f) f.focus();
    }
    function closeSh() {
        var sh = $("sh");
        var to = (opener && opener.isConnected && opener !== document.body && opener !== document.documentElement)
            ? opener : document.querySelector('.edit');
        if (to) to.focus(); opener = null;
        sh.classList.remove("on"); sh.setAttribute('aria-hidden', 'true'); sh.setAttribute('aria-modal', 'false'); sh.inert = true;
        $("bk").classList.remove("on"); $("bk").setAttribute('aria-hidden', 'true');
    }
    document.addEventListener('keydown', function (e) {
        if (!$("sh").classList.contains('on')) return;
        if (e.key === 'Escape') { closeSh(); return; }
        if (e.key !== 'Tab') return;
        var f = Array.prototype.slice.call($("sh").querySelectorAll('button,input,select,[tabindex]:not([tabindex="-1"])')).filter(function (x) { return !x.disabled && x.offsetParent !== null });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });
    function edit(btn) { openSh('<h3>Профиль</h3><label for="enm">Имя</label><input type="text" id="enm" maxlength="24" value="' + esc(EF.get().name) + '"><label>Экзамен</label><div class="seg" id="ety"><button data-ty="oge" class="' + (EF.get().exam == "oge" ? "on" : "") + '">ОГЭ</button><button data-ty="ege" class="' + (EF.get().exam == "ege" ? "on" : "") + '">ЕГЭ</button></div><label for="eex">Дата экзамена</label><input type="date" id="eex" value="' + esc(cur()) + '"><button class="btn" data-save="1">Сохранить</button>', btn) }
    document.addEventListener("click", function (e) {
        var t = e.target, b = t.closest("button"); if (t.id == "bk") { closeSh(); return } if (!b) return;
        if (b.dataset.edit) edit(b);
        else if (b.dataset.ty) { document.querySelectorAll("#ety button").forEach(function (x) { x.classList.toggle("on", x == b) }); $("eex").value = st.dates[b.dataset.ty] }
        else if (b.dataset.save) {
            EF.get().name = $("enm").value.trim() || "Ученик"; EF.save();
            var ty = document.querySelector("#ety .on").dataset.ty; EF.setExam(ty);
            var v = $("eex").value;
            if (v && EF.validDate(v)) { st.dates[ty] = v; st.cust[ty] = v !== DEF[ty] }
            // re-render BEFORE closing so closeSh's fallback focus lands on a
            // fresh .edit button instead of a disconnected one
            save(); EFS.saveProfile(); render(); closeSh(); toast("Профиль сохранён")
        }
        else if (b.dataset.b) {
            var x = (window.__BD || [])[+b.dataset.b]; if (!x) return;
            var ok = x[2] >= x[3];
            openSh('<div class="bi ' + (ok ? "" : "lk") + '"><div class="ic">' + ic(x[1]) + '</div><h3>' + esc(x[0]) + '</h3><p>' + esc(x[4]) + '</p>' + (ok ? '<b>Получено ✓</b>' : '<div class="bar"><b style="width:' + x[2] / x[3] * 100 + '%"></b></div><p style="margin-top:8px">' + x[2] + ' из ' + x[3] + '</p>') + '</div><button class="btn" data-close="1">Понятно</button>', b);
        }
        else if (b.dataset.close) closeSh();
        else if (b.dataset.g) {
            st.goal = +b.dataset.g;
            EF.get().goal = st.goal; EF.save();   // keep progress + settings goals identical
            save();
            b.parentNode.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x == b) });
            var T2 = EF.today(); $("tgt").textContent = (T2.lessons * 5) + " из " + st.goal + " мин"; $("tgb").style.width = Math.min(100, T2.lessons * 5 / st.goal * 100) + "%"
        }
        else if (b.dataset.sw) { st[b.dataset.sw] = !st[b.dataset.sw]; save(); b.setAttribute("aria-checked", st[b.dataset.sw]); if (b.dataset.sw == "remind") $("tm").hidden = !st.remind }
        else if (b.dataset.out) { if (confirm("Сбросить весь прогресс? Это действие нельзя отменить.")) { EF.reset() } }
    });
    document.addEventListener("change", function (e) {
        if (e.target.id == "tm" && /^([01]\d|2[0-3]):[0-5]\d$/.test(e.target.value)) {
            st.time = e.target.value; save(); toast("Время сохранено")
        }
    });
    // day-rollover re-render keyed on the local date itself (independent of
    // whether EF.get already consumed the rollover) — open details blocks and
    // a focused control survive; the sheet lives outside #app so a half-typed
    // modal is never destroyed
    var lastDay = EF.day();
    function renderDay() {
        var open = [];
        document.querySelectorAll('#app details.ac').forEach(function (d, i) { if (d.open) open.push(i) });
        var ae = document.activeElement, aeId = ae && ae.id;
        render();
        document.querySelectorAll('#app details.ac').forEach(function (d, i) { d.open = open.indexOf(i) >= 0 });
        if (aeId && (!document.activeElement || !document.activeElement.id)) {
            var n = document.getElementById(aeId); if (n) n.focus()
        }
    }
    // native back closes an open sheet (focus restored by closeSh) instead of
    // leaving the page; with no sheet open the event is not canceled and the
    // bridge navigates to index.html
    window.addEventListener('ef:native-back', function (e) {
        if ($('sh').classList.contains('on')) { e.preventDefault(); closeSh(); }
    });
    function maybeRender() {
        var d = EF.day();
        if (d !== lastDay) { lastDay = d; EF.refreshPeriods(); renderDay() }
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) maybeRender() });
    window.addEventListener('focus', maybeRender);
    setInterval(maybeRender, 60000);
    render();
}
