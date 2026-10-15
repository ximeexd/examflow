/* ExamFlow — home page view: hero, streak, daily plan, onboarding. */
EFS.init().then(start).catch(EFS.showBootError);
function start() {
    const $ = id => document.getElementById(id);
    const esc = EF.escapeHTML;
    const S = EF.get(), T = EF.today();

    /* === onboarding (первый вход) === */
    const MASCOT = '<img class="mas" src="brand-avatar.png?v=1" alt="ExamFlow">';
    const EXAMS = [['oge', 'ОГЭ', '9 класс · основной экзамен', '🎒'], ['ege', 'ЕГЭ', '11 класс · выпускной экзамен', '🎓'], ['unsure', 'Пока не знаю', 'Просто хочу подтянуть школьные темы', '🧭']];
    const OBSUBJ = [['Математика', '🧮'], ['Русский язык', '✍️'], ['Информатика', '💻'], ['Обществознание', '⚖️'], ['Физика', '⚡'], ['Биология', '🧬'], ['Химия', '⚗️'], ['История', '🏛️'], ['Английский', '🇬🇧'], ['Литература', '📖'], ['География', '🌍']];
    const GOALS = [[5, '5 минут', 'Спокойный темп', '🌱'], [10, '10 минут', 'Обычный', '🚶'], [20, '20 минут', 'Серьёзный', '🏃'], [30, '30+ минут', 'Интенсив', '🚀']];
    const obSubjList = () => ob.exam == 'ege' ? OBSUBJ.flatMap(s => s[0] == 'Математика' ? [['Базовая математика', '🧮'], ['Профильная математика', '📐']] : [s]) : OBSUBJ;
    const oopt = (k, v, e, t, s2, on) => `<button class="opt ${on ? 'on' : ''}" data-o="${k}" data-v="${esc(v)}" aria-pressed="${!!on}"><span class="oe">${e}</span><span><b>${esc(t)}</b>${s2 ? `<small>${esc(s2)}</small>` : ''}</span></button>`;
    const WEL = () => `<div class="wel"><div class="stage">${[['🧮', 2, 6], ['📖', 76, 2], ['🧬', 0, 54], ['⚗️', 82, 52], ['🌍', 12, 84], ['💻', 72, 86]].map(([e, x, y], i) => `<span class="orb" style="left:${x}%;top:${y}%;animation-delay:${i * .5}s">${e}</span>`).join('')}${MASCOT}</div><h2>Готовься к <span class="hl">ОГЭ</span> и <span class="hl">ЕГЭ</span> как в игре</h2><p>Короткие занятия, XP и серии — учёба станет привычкой</p><div class="feats"><div><i>🔥</i>Серии дней</div><div><i>⚡</i>XP и награды</div><div><i>🎯</i>Задания по темам</div></div></div>`;
    let ob = {};
    function obr() {
        const o = $('ob'), s = ob.step, ch = ob.last !== s; ob.last = s;
        const say = ['Привет! Я помогу подготовиться к экзаменам', 'К какому экзамену готовимся?', 'Какие предметы будем учить?', 'Сколько времени в день уделишь?', 'Отлично! Всё готово'][s];
        let body = '', ok = true, cta = 'Продолжить';
        if (s == 0) cta = 'Начать';
        if (s == 1) { body = `<div class="opts">${EXAMS.map(([k, n, d, e]) => oopt('exam', k, e, n, d, ob.examChoice == k)).join('')}</div>`; ok = !!ob.examChoice }
        if (s == 2) { body = `<div class="opts two">${obSubjList().map(([n, e]) => oopt('sub', n, e, n, '', ob.subs.includes(n))).join('')}</div>`; ok = ob.subs.length > 0; if (ok) cta = 'Продолжить · ' + ob.subs.length }
        if (s == 3) { body = `<div class="opts">${GOALS.map(([v, n, d, e]) => oopt('goal', v, e, n, d, ob.goal == v)).join('')}</div>`; ok = !!ob.goal }
        if (s == 4) { body = `<div class="sum"><span>🎯 ${ob.examChoice == 'unsure' ? 'Пока не знаю · программа ОГЭ' : ob.exam == 'ege' ? 'ЕГЭ' : 'ОГЭ'}</span><span>📚 Предметов: ${ob.subs.length}</span><span>⏱ ${ob.goal} мин в день</span></div>`; cta = 'Перейти к заданиям' }
        o.innerHTML = `<div class="obw"><div class="obt">${s > 0 ? '<button id="obb">←</button>' : '<span></span>'}<div class="obp">${[1, 2, 3, 4].map(k => `<i class="${s >= k ? 'f' : ''}"></i>`).join('')}</div><span></span></div>${s == 0 ? WEL() : `<div class="obhero">${MASCOT}<div class="bub">${say}</div></div><div class="obm">${body}</div>`}<button class="obbtn" id="obn" ${ok ? '' : 'disabled'}>${cta}</button></div>`;
        if (ch) o.querySelectorAll('.opts').forEach(x => { x.classList.add('in'); x.querySelectorAll('.opt').forEach((b, i) => b.style.animationDelay = i * 45 + 'ms') });
        if (s == 4 && ob.fresh) { ob.fresh = 0; setTimeout(() => boom(o.querySelector('.mas')), 200) }
    }
    // in-place selection refresh — keeps DOM/scroll/focus and never restarts
    // the rise animations; obr() is only for real step transitions
    function updateObSelection() {
        const o = $('ob'); if (!o) return;
        o.querySelectorAll('[data-o]').forEach(b => {
            const k = b.dataset.o, v = b.dataset.v;
            const on = k == 'exam' ? ob.examChoice == v : k == 'sub' ? ob.subs.includes(v) : ob.goal == +v;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on);
        });
        let ok = true, cta = 'Продолжить';
        if (ob.step == 1) ok = !!ob.examChoice;
        if (ob.step == 2) { ok = ob.subs.length > 0; if (ok) cta = 'Продолжить · ' + ob.subs.length }
        if (ob.step == 3) ok = !!ob.goal;
        const n = $('obn'); if (n && ob.step >= 1 && ob.step <= 3) { n.disabled = !ok; n.textContent = cta }
    }
    const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function boom(el) {
        if (!el || REDUCED) return;
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, cols = ['#c6f94d', '#ff8a1f', '#ff7eb6', '#5cbff2', '#12291f', '#ffd93d'];
        for (let i = 0; i < 26; i++) {
            const p = document.createElement('i'); p.className = 'pc'; p.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % 6]}`; document.body.appendChild(p);
            const a = Math.random() * 6.28, d = 60 + Math.random() * 110;
            p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 60}px) rotate(${Math.random() * 540}deg)`, opacity: 0 }], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove()
        }
    }
    // writes the chosen goal to BOTH profile slots (base + account-scoped) via
    // the shared settings writer so the ef:profile-saved listener can never
    // resurrect a stale base value over the scoped one
    function persistGoal(goal) {
        try {
            const cur = EFS.readSettings ? EFS.readSettings() : EFS.normalizeSettings(null);
            cur.goal = goal;
            if (EFS.setSettings) EFS.setSettings(cur);
        } catch (e) { }
    }
    $('ob').addEventListener('click', e => {
        const b = e.target.closest('[data-o]');
        if (b) {
            const k = b.dataset.o, v = b.dataset.v;
            if (k == 'exam') {
                if (!EXAMS.some(x => x[0] == v)) return;
                ob.examChoice = v; ob.exam = v == 'ege' ? 'ege' : 'oge';
                const ok = obSubjList().map(x => x[0]); ob.subs = ob.subs.filter(x => ok.includes(x))
            }
            else if (k == 'sub') {
                if (!obSubjList().some(x => x[0] == v)) return;
                const i = ob.subs.indexOf(v); i < 0 ? ob.subs.push(v) : ob.subs.splice(i, 1)
            }
            else if (k == 'goal') { if (!GOALS.some(x => x[0] == +v)) return; ob.goal = +v }
            else return;
            updateObSelection(); return
        }
        if (e.target.closest('#obn')) {
            if (ob.step < 4) { ob.step++; obr() } else {
                S.exam = ob.exam; S.subs = ob.subs; S.goal = ob.goal; S.onboarded = 1;
                if (!EF.subjects().includes(S.active)) S.active = EF.subjects()[0];
                EF.save(); persistGoal(ob.goal);
                Promise.resolve(EFS.flush()).catch(() => { }).then(() => location.reload())
            } return
        }
        if (e.target.closest('#obb')) { ob.step--; obr(); return }
    });
    function maybeOb() { if (!EF.get().onboarded) { ob = { step: 0, fresh: 1, exam: null, examChoice: null, subs: [], goal: null }; $('ob').style.display = 'flex'; obr() } }
    maybeOb();

    const ARTS = {
        'Математика': { b: "X²", f: "ax²+bx+c", s: "D = b² − 4ac", c: "#c6f94d", d: "#8fbd1f" },
        'Базовая математика': { b: "X²", f: "ax²+bx+c", s: "D = b² − 4ac", c: "#c6f94d", d: "#8fbd1f" },
        'Профильная математика': { b: "∫", f: "f'(x)", s: "lim x→0", c: "#c6f94d", d: "#8fbd1f" },
        'Русский язык': { b: "Аа", f: "не + гл.", s: "раздельно", c: "#ffc29a", d: "#d98a57" },
        'Физика': { b: "F", f: "F = m·a", s: "p = m·v", c: "#9fe0ff", d: "#53aed6" },
        'Информатика': { b: "01", f: "1011₂ = 11", s: "log₂8 = 3", c: "#c9b8ff", d: "#8f7bd6" },
        'Химия': { b: "H₂O", f: "2H₂ + O₂", s: "→ 2H₂O", c: "#ffadca", d: "#d96b94" },
        'Биология': { b: "ДНК", f: "А–Т · Г–Ц", s: "ген→белок", c: "#8ff0b4", d: "#4cbf7d" },
        'Обществознание': { b: "§", f: "спрос ↔ цена", s: "ст. 15 Конст.", c: "#9fdcff", d: "#5cbff2" },
        'История': { b: "1812", f: "Бородино", s: "Крымская война", c: "#f4d9a6", d: "#d9a85e" },
        'Английский': { b: "Aa", f: "to be + Ving", s: "Present Perfect", c: "#b8e6ff", d: "#6dbfe8" },
        'Литература': { b: "§", f: "Пушкин", s: "Горе от ума", c: "#ffc9a6", d: "#e08e5a" },
        'География': { b: "N°", f: "55,7° ш.", s: "Урал · Сибирь", c: "#a9e8d8", d: "#55bd9d" }
    };
    const aof = n => ARTS[n] || { b: "★", f: "ExamFlow", s: "к цели", c: "#c6f94d", d: "#8fbd1f" };
    function art(o) { return '<svg viewBox="0 0 160 140"><g transform="rotate(-7 53 62)"><rect x="14" y="14" width="76" height="98" rx="9" fill="#f4f1e8"/><text x="24" y="40" font-size="15" font-weight="800" fill="#12261c" font-family="Onest,sans-serif">' + esc(o.b) + '</text><path d="M27 68h50M27 80h50M27 92h50" stroke="#d3cdbb" stroke-width="2" stroke-linecap="round"/><path d="M27 104h32" stroke="#e9a13b" stroke-width="3.5" stroke-linecap="round"/></g><g transform="rotate(8 100 85)"><rect x="56" y="50" width="82" height="82" rx="11" fill="' + o.d + '"/><rect x="56" y="44" width="82" height="82" rx="11" fill="' + o.c + '"/><text x="66" y="72" font-size="12.5" font-weight="800" fill="#0f2a1e" font-family="Onest,sans-serif">' + esc(o.f) + '</text><text x="66" y="91" font-size="10" fill="#0f2a1e" font-family="Onest,sans-serif">' + esc(o.s) + '</text><path d="M66 104h40M66 113h26" stroke="#0f2a1e" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="130" cy="26" r="16" fill="#c27d1d"/><circle cx="130" cy="23" r="16" fill="#e9a13b"/><circle cx="130" cy="23" r="11.5" fill="none" stroke="#f6c76a" stroke-dasharray="2 2"/><text x="130" y="29" text-anchor="middle" font-size="16" fill="#0f2a1e">★</text><rect x="4" y="98" width="16" height="16" rx="4" fill="#c6f94d" transform="rotate(45 12 106)"/><text x="104" y="138" font-size="14" font-weight="800" fill="#c6f94d">+</text><text x="150" y="70" font-size="14" font-weight="800" fill="#c6f94d">=</text></svg>' }

    $('pill-xp').textContent = '⚡ ' + S.xp + ' XP';
    $('pill-coins').textContent = '◎ ' + S.coins;
    $('hello').textContent = S.name + ', набираем темп.';

    const pl = (n, f) => n + ' ' + f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2)];

    function show(subj) {
        if (S.active !== subj) { S.active = subj; EF.save(); }
        const n = EF.next(subj);
        const o = Object.assign({}, aof(subj));
        document.getElementById('tag').textContent = EF.examName() + ' · ' + subj.toUpperCase();
        document.getElementById('ttl').textContent = n ? n.topic.title : 'Курс пройден!';
        const seg = document.getElementById('seg');
        const d = n ? EF.lessonsDone(subj, n.topic.key) : 10;
        seg.innerHTML = Array.from({ length: 10 }, (_, k) => `<b class="${k < d ? 'd' : k === d ? 'c' : ''}"></b>`).join('');
        document.getElementById('meta').innerHTML = n ? `<span>Занятие <b>${n.lesson} из 10</b></span><span><b>5</b> вопросов</span><span>≈ <b>5 мин</b></span>` : '<span><b>Все темы пройдены</b> — можно повторять</span>';
        const cta = document.getElementById('cta');
        cta.textContent = n ? (d ? 'Продолжить · занятие ' + n.lesson + ' →' : 'Начать · занятие 1 →') : 'Повторить курс →';
        cta.href = n ? `lesson.html?s=${encodeURIComponent(subj)}&t=${encodeURIComponent(n.topic.key)}&l=${n.lesson}` : `tasks.html?s=${encodeURIComponent(subj)}`;
        const a = document.getElementById('art'); a.innerHTML = art(o); a.classList.remove('sw'); void a.offsetWidth; a.classList.add('sw');
        document.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b.textContent === subj) });
        refreshMetrics();
    }
    const ch = document.getElementById('chips');
    EF.subjects().forEach(function (n) { var b = document.createElement('button'); b.className = 'chip'; b.textContent = n; b.onclick = function () { show(n) }; ch.appendChild(b) });
    show(S.active);

    // full metrics + plan refresh — run on focus/visible/day-tick so streak,
    // week dots and reward state never show stale values
    function refreshMetrics() {
        const S = EF.get(), T = EF.today();
        $('streak-n').textContent = S.streak;
        $('streak-n').nextElementSibling.textContent = pl(S.streak, ['день', 'дня', 'дней']).replace(/^\d+ /, '') + ' подряд';
        $('days').innerHTML = EF.weekDays().map(d => `<div>${d.label}<i class="${d.on ? 'on' : ''}">${d.on ? '✓' : '·'}</i></div>`).join('');
        $('lvl-n').textContent = 'Уровень ' + EF.level();
        $('lvl-xp').textContent = S.xp + ' XP';
        $('lvl-bar').style.width = EF.levelPct() + '%';
        const need = EF.level() * 500 - S.xp;
        $('lvl-bar').parentElement.previousElementSibling.querySelector('small').textContent = 'до ур. ' + (EF.level() + 1) + ' ещё ' + need;

        const cond = EF.dailyConditions();
        const doneCnt = cond.filter(Boolean).length;
        const ids = ['d1', 'd2', 'd3', 'd4'];
        const unclaimedReady = ids.some((id, i) => cond[i] && !T.claimedIds.includes(id));
        const chestReady = cond.every(Boolean) && !T.chest;
        const allReceived = ids.every(id => T.claimedIds.includes(id)) && T.chest;
        $('rw-state').textContent = allReceived ? 'всё получено' : doneCnt + ' из 4';
        const n = EF.next(S.active);
        const plan = [
            { t: n ? ('Закончить занятие ' + n.lesson) : 'Все занятия пройдены', s: '5 вопросов · около 5 минут', r: Math.min(T.lessons, 1) + ' из 1', done: T.lessons >= 1, href: n ? `lesson.html?s=${encodeURIComponent(S.active)}&t=${encodeURIComponent(n.topic.key)}&l=${n.lesson}` : 'tasks.html' },
            { t: 'Дать 5 верных ответов', s: 'Считаются только проверенные ответы', r: Math.min(T.correct, 5) + ' из 5', done: T.correct >= 5, href: 'tasks.html' },
            { t: 'Забрать награды', s: 'Бонус за выполнение целей дня', r: allReceived ? 'получено' : (unclaimedReady || chestReady ? 'ждёт!' : 'после 4 целей'), done: allReceived, href: 'quests.html' }
        ];
        $('plan').innerHTML = plan.map((p, i) => `<a class="task" href="${p.href}"><div class="n ${p.done ? 'done' : ''}">${p.done ? '✓' : i + 1}</div><div><b>${esc(p.t)}</b><p>${esc(p.s)}</p></div><em>${p.r}</em></a>`).join('');
        $('mist-cnt').textContent = S.mistakes.length ? ('в копилке: ' + S.mistakes.length) : 'пока пусто';
    }
    refreshMetrics();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMetrics() });
    window.addEventListener('focus', refreshMetrics);
    setInterval(() => { if (EF.refreshPeriods()) refreshMetrics() }, 60000);
}
