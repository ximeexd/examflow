/* ExamFlow — quests page view. Quest progress/claimed state is recomputed on
   every render from live EF state, so tabs never show stale conditions. */
EFS.init().then(start).catch(EFS.showBootError);
function start() {
    var K = 'stroke="#12261c" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    var IC = {
        book: '<path d="M24 12C18 8 10 8 4 10v28c6-2 14-2 20 2 6-4 14-4 20-2V10c-6-2-14-2-20 2Zm0 0v28"/>',
        check: '<circle cx="24" cy="24" r="18"/><path d="M15 25l7 7 12-14"/>',
        redo: '<path d="M36 18A14 14 0 1 0 38 28M38 8v10H28"/>',
        star: '<path d="M24 6l5.5 12L42 19.5l-9 9 2.5 12.5L24 35l-11.500 6L15 28.500l-9-9L18.500 18Z"/>',
        cal: '<rect x="6" y="10" width="36" height="32" rx="6"/><path d="M6 20h36M16 6v8M32 6v8M17 31l5 5 9-9"/>',
        flame: '<path d="M24 6c2 8 12 12 12 24a12 12 0 0 1-24 0c0-6 4-8 5-14 3 2 4 5 4 8 3-4 4-10 3-18Z"/>',
        target: '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="2" fill="#12261c"/>',
        trophy: '<path d="M14 8h20v12a10 10 0 0 1-20 0ZM14 12H6c0 8-4 12-9 12M34 12h8c0 8-4 12-9 12M24 30v8M16 42h16"/>'
    };
    function ic(k) { return '<svg viewBox="0 0 48 48" ' + K + ' aria-hidden="true">' + IC[k] + '</svg>' }
    var st = { tab: 0 }, $ = function (i) { return document.getElementById(i) };

    // fresh quest state on every render — never from a stale snapshot
    function daily() {
        var T = EF.today();
        var D = [{ id: "d1", t: "Пройти занятие", d: "Закончи любое занятие", ic: "book", g: 1, p: Math.min(T.lessons, 1), xp: 30, c: 10, href: "tasks.html" },
        { id: "d2", t: "5 верных ответов", d: "Считаются проверенные ответы", ic: "check", g: 5, p: Math.min(T.correct, 5), xp: 20, c: 5, href: "tasks.html" },
        { id: "d3", t: "Повторить ошибки", d: "Разбери хотя бы одну ошибку", ic: "redo", g: 1, p: Math.min(T.mistakes, 1), xp: 25, c: 10, href: "lesson.html?mode=mistakes" },
        { id: "d4", t: "Занятие без ошибок", d: "Ответь верно на все 5 вопросов", ic: "star", g: 1, p: Math.min(T.clean, 1), xp: 50, c: 20, href: "tasks.html" }];
        D.forEach(function (q) { q.cl = T.claimedIds.includes(q.id) });
        return D;
    }
    function weekly() {
        var S = EF.get(), WK = EF.week();
        var W = [{ id: "w1", t: "Занимайся 5 дней", d: "В течение недели", ic: "cal", g: 5, p: Math.min(EF.weekDaysCount(), 5), xp: 150, c: 60 },
        { id: "w2", t: "50 верных ответов", d: "Набери за неделю", ic: "target", g: 50, p: Math.min(WK.correct, 50), xp: 100, c: 40 },
        { id: "w3", t: "Серия 7 дней", d: "Не пропускай ни дня", ic: "flame", g: 7, p: Math.min(S.streak, 7), xp: 200, c: 100 }];
        W.forEach(function (q) { q.cl = WK.claimed.includes(q.id) });
        return W;
    }
    function ach() {
        var S = EF.get();
        var topicsDone = EF.subjects().reduce(function (a, n) { return a + EF.passedCount(n) }, 0);
        return [["Первый шаг", "book", Math.min(EF.totalLessons(), 1), 1], ["Серия 7 дней", "flame", Math.min(S.streak, 7), 7], ["100 ответов", "check", Math.min(S.totalCorrect, 100), 100], ["Первая тема", "star", Math.min(topicsDone, 1), 1], ["Без ошибок ×5", "target", Math.min(S.cleanTotal, 5), 5], ["Серия 30 дней", "trophy", Math.min(S.streak, 30), 30]];
    }
    function rd(q) { return q.p >= q.g && !q.cl }
    function badge() { return daily().concat(weekly()).filter(rd).length }
    function card(q) {
        var r = rd(q);
        return '<div class="q' + (r ? " rd" : "") + (q.cl ? " cl" : "") + '"><div class="qi">' + ic(q.ic) + '</div><div class="qb"><b>' + q.t + '</b><small>' + q.d + '</small><div class="pr"><div class="bar"><b style="width:' + Math.min(100, q.p / q.g * 100) + '%"></b></div><em>' + Math.min(q.p, q.g) + ' из ' + q.g + '</em></div><div class="qf"><div><span class="rw">+' + q.xp + ' XP</span><span class="rw">+' + q.c + ' ◎</span></div>' + (q.cl ? '<button class="btn sm" disabled>Получено</button>' : r ? '<button class="btn sm" data-c="' + q.id + '">Забрать</button>' : '<a class="btn sm" href="' + (q.href || 'tasks.html') + '" style="background:var(--dark);color:var(--lime);box-shadow:0 3px 0 #06140d">К занятию</a>') + '</div></div></div>'
    }
    function left() { var n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); var s = Math.round((m - n) / 60000); return Math.floor(s / 60) + " ч " + s % 60 + " мин" }
    function render() {
        EF.refreshPeriods();
        var D = daily(), W = weekly(), A = ach(), chest = EF.today().chest;
        var n = D.filter(function (q) { return q.p >= q.g }).length, all = n == 4;
        var h = '<div class="top"><h1>Квесты</h1><span class="pill" id="px">⚡ ' + EF.get().xp + ' XP</span><span class="pill" id="pc">◎ ' + EF.get().coins + '</span></div>';
        h += '<div class="tabs">' + ["Сегодня", "Неделя", "Награды"].map(function (t, i) { return '<button data-t="' + i + '" class="' + (st.tab == i ? "on" : "") + '">' + t + (i < 2 && ((i == 0 && D.some(rd)) || (i == 1 && W.some(rd))) ? '<em>' + (i == 0 ? D.filter(rd).length : W.filter(rd).length) + '</em>' : "") + '</button>' }).join("") + '</div>';
        if (st.tab == 0) {
            h += '<section class="hero"><svg class="coin" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="44" r="32" fill="#c27d1d"/><circle cx="40" cy="40" r="32" fill="#e9a13b"/><circle cx="40" cy="40" r="23" fill="none" stroke="#f6c76a" stroke-width="2" stroke-dasharray="4 4"/><text x="40" y="50" text-anchor="middle" font-size="30" fill="#0f2a1e">★</text></svg><span class="tag">КВЕСТЫ ДНЯ</span><h2>Выполнено ' + n + ' из 4</h2><p>Обновятся через ' + left() + '</p><div class="seg">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < n ? "d" : "") + '"></i>' }).join("") + '</div><button class="btn" data-chest="1"' + (all && !chest ? "" : " disabled") + '>' + (chest ? "Сундук получен ✓" : all ? "Открыть сундук · +100 XP · +50 ◎" : "Выполни все 4 — откроется сундук") + '</button></section>' + D.map(card).join("")
        }
        else if (st.tab == 1) { h += '<p class="note">Недельные квесты обновятся в понедельник. Награды больше, а задания длиннее.</p>' + W.map(card).join("") }
        else { h += '<p class="note">Достижения выдаются сами, когда выполнено условие.</p><div class="ach">' + A.map(function (a) { var ok = a[2] >= a[3]; return '<div class="bg ' + (ok ? "ok" : "lk") + '"><div class="qi">' + ic(a[1]) + '</div><b>' + a[0] + '</b><small>' + (ok ? "Получено" : a[2] + " из " + a[3]) + '</small>' + (ok ? "" : '<div class="bar"><b style="width:' + a[2] / a[3] * 100 + '%"></b></div>') + '</div>' }).join("") + '</div>' }
        $("app").innerHTML = h
    }
    function toast(t) { var e = $("ts"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("on") }, 2200) }
    function gain(xp, c) { EF.addXP(xp); EF.addCoins(c); render(); ["px", "pc"].forEach(function (i) { var e = $(i); e.classList.add("pop"); setTimeout(function () { e.classList.remove("pop") }, 250) }); toast("+" + xp + " XP · +" + c + " ◎") }
    document.addEventListener("click", function (e) {
        var t = e.target.closest("button"); if (!t) return;
        if (t.dataset.t) { st.tab = +t.dataset.t; render(); return }
        if (t.dataset.c) {
            var q = daily().concat(weekly()).filter(function (x) { return x.id == t.dataset.c })[0];
            if (q && rd(q)) {
                var ok = q.id[0] == 'd' ? EF.claimDaily(q.id) : EF.claimWeekly(q.id);
                if (ok) {
                    try { if (window.EFServer) EFServer.claim(q.id[0] == 'd' ? 'daily' : 'weekly', q.id) } catch (e) { }
                    EFS.claimQuest(q.id); gain(q.xp, q.c)
                }
            } return
        }
        if (t.dataset.chest) {
            if (EF.claimChest()) {
                try { if (window.EFServer) EFServer.claim('chest') } catch (e) { }
                gain(100, 50)
            } return
        }
    });
    // quests reset at local midnight — refresh on focus/visible and a minute tick
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render() });
    window.addEventListener('focus', render);
    setInterval(function () { if (EF.refreshPeriods()) render() }, 60000);
    render();
}
