/* ExamFlow — lesson page view (external so CSP can forbid inline scripts).
   Lazy-loads exactly one subject/exam bank file + the materializer only after
   the route is validated; mistakes mode needs no bank at all. */
EFS.init().then(startLessonPage).catch(EFS.showBootError);

const BANK_STEM = {
    'Русский язык': 'russian', 'Информатика': 'informatics', 'Физика': 'physics',
    'Биология': 'biology', 'Химия': 'chemistry', 'География': 'geography',
    'История': 'history', 'Обществознание': 'social', 'Литература': 'literature',
    'Английский': 'english', 'Английский язык': 'english'
};
function bankFile(exam, subj) {
    if (subj === 'Математика' || subj === 'Базовая математика' || subj === 'Профильная математика') {
        if (exam === 'ege') return subj === 'Профильная математика' ? 'sqb_math_ege_prof.js' : 'sqb_math_ege_base.js';
        return 'sqb_math_oge.js';
    }
    const stem = BANK_STEM[subj];
    return stem ? 'sqb_' + stem + '_' + exam + '.js' : null;
}
function loadScriptOnce(src) {
    return new Promise((res, rej) => {
        const el = document.createElement('script');
        el.src = src;
        el.onload = () => res();
        el.onerror = () => { el.remove(); rej(new Error('script ' + src)); };
        document.head.appendChild(el);
    });
}
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function shuffle(arr) { // Fisher-Yates — no biased sort
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
}
// tiny WebAudio feedback — 660Hz correct / 220Hz wrong, 120ms, quiet
let AC = null;
function beep(ok) {
    let st = null;
    try {
        st = EFS.readSettings ? EFS.readSettings()
            : EFS.normalizeSettings(JSON.parse(localStorage.getItem(EF.profileKey())));
    } catch (e) { }
    if (st && st.sound === false) return;
    try {
        AC = AC || new (window.AudioContext || window.webkitAudioContext)();
        if (AC.state === 'suspended') AC.resume().catch(() => { });
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = 'sine'; o.frequency.value = ok ? 660 : 220;
        g.gain.value = 0.04;
        o.connect(g); g.connect(AC.destination);
        o.onended = () => { o.disconnect(); g.disconnect(); };
        o.start(); o.stop(AC.currentTime + 0.12);
    } catch (e) { }
}

async function startLessonPage() {
    const $ = id => document.getElementById(id);
    const esc = EF.escapeHTML;
    const fmt = (window.EFMathText && EFMathText.format) || esc;
    const P = new URLSearchParams(location.search);
    const mode = P.get('mode') || '';
    const exam = EF.get().exam;
    const S = EF.get();
    const stage = $('stage');
    let subj = '', subjValid = false;
    const fail = (title, msg) => {
        stage.innerHTML = '<div class="done-hero"><div class="em">📭</div><h2>' + esc(title) + '</h2><p>' + esc(msg) + '</p></div>' +
            '<div class="next"><a class="btn" href="tasks.html' + (subjValid ? '?s=' + encodeURIComponent(subj) : '') + '">К заданиям</a></div>';
    };

    // --- route validation BEFORE any bank load, rewards, or startLesson ---
    if (mode !== '' && mode !== 'mix' && mode !== 'mistakes') { fail('Занятие не найдено', 'Такого режима нет.'); return; }
    subj = P.get('s') || S.active;
    let tk = P.get('t'), li = 1;
    subjValid = EF.subjects().includes(subj) || EF.topics(subj).length > 0;
    const rec = EF.topics(subj).find(x => x.key === tk) || null;
    if (mode === 'mistakes') {
        subjValid = true;
    } else {
        if (!subjValid || !rec) { fail('Тема не найдена', 'Выбери доступную тему в списке заданий.'); return; }
        const idx = EF.topics(subj).findIndex(x => x.key === tk);
        if (!EF.isUnlocked(subj, idx)) { fail('Тема пока закрыта', 'Она откроется после предыдущей темы.'); return; }
        if (mode === '') {
            li = Number(P.get('l'));
            const cur = EF.lessonsDone(subj, tk);
            if (!Number.isInteger(li) || li < 1 || li > 10 || li > cur + 1) {
                const go = Math.min(10, cur + 1);
                stage.innerHTML = '<div class="done-hero"><div class="em">🔒</div><h2>Это занятие пока недоступно</h2><p>Продолжи с занятия ' + go + '.</p></div>' +
                    '<div class="next"><a class="btn" href="lesson.html?s=' + encodeURIComponent(subj) + '&t=' + encodeURIComponent(tk) + '&l=' + go + '">Занятие ' + go + ' →</a>' +
                    '<a class="btn ghost" href="tasks.html?s=' + encodeURIComponent(subj) + '">К списку тем</a></div>';
                return;
            }
        }
    }

    $('back').href = 'tasks.html' + (subjValid ? '?s=' + encodeURIComponent(subj) : '');
    $('xpv').textContent = S.xp;
    const syncXP = () => { $('xpv').textContent = EF.get().xp };
    const topicTitle = rec ? rec.title : (tk || '');

    // --- question source ---
    let qs = [];
    if (mode === 'mistakes') {
        qs = S.mistakes.slice(0, 5);
        if (!qs.length) { fail('Ошибок пока нет', 'Когда ответишь неверно, вопросы появятся здесь.'); return; }
    } else {
        stage.innerHTML = '<div class="done-hero"><div class="em">⏳</div><h2>Загружаем задания…</h2><p>Один момент.</p></div>';
        const file = bankFile(exam, subj);
        try {
            if (file) await loadScriptOnce(file + '?v=4');
            await loadScriptOnce('school_question_bank.js?v=3');
        } catch (e) {
            stage.innerHTML = '<div class="done-hero"><div class="em">📡</div><h2>Не удалось загрузить задания</h2><p>Проверь связь и попробуй снова.</p></div>' +
                '<div class="next"><button class="btn" id="retry">Попробовать снова</button></div>';
            $('retry').onclick = () => location.reload();
            return;
        }
        if (mode === 'mix') {
            const all = (window.getSchoolTopicQuestions && getSchoolTopicQuestions(exam, subj, tk)) || [];
            const all2 = all.length ? all : (rec ? getSchoolTopicQuestions(exam, subj, rec.title) || [] : []);
            qs = shuffle(all2.slice()).slice(0, 5);
        } else {
            qs = (window.getSchoolLessonQuestions && getSchoolLessonQuestions(exam, subj, tk, li)) || [];
        }
        if (!qs.length) { fail('Занятие не найдено', 'Для этой темы пока нет заданий в банке.'); return; }
    }

    // --- run the lesson ---
    const startedAt = Date.now(); // server checks a minimum plausible duration
    EF.startLesson(); syncXP();
    // closing confirmation while a real lesson is mid-flight (guarded no-op
    // outside Telegram and on pages without the bridge)
    try { if (window.EFTelegram && EFTelegram.setLessonActive) EFTelegram.setLessonActive(true); } catch (e) { }
    let i = 0, right = 0, answered = false, finished = false;
    const picks = []; // [{id, pick}] — materialized option index, server-verified
    const boom = el => {
        if (REDUCED) return;
        const r = (el || document.body).getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2,
            cols = ['#c3f73a', '#ff8a1f', '#ff7eb6', '#5cbff2', '#12291f', '#ffd93d'];
        for (let k = 0; k < 26; k++) {
            const p = document.createElement('i'); p.className = 'pc';
            p.style.cssText = `left:${x}px;top:${y}px;background:${cols[k % 6]}`; document.body.appendChild(p);
            const a = Math.random() * 6.28, d = 60 + Math.random() * 110;
            p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 60}px) rotate(${Math.random() * 540}deg)`, opacity: 0 }],
                { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove();
        }
    };
    function q() {
        const item = qs[i]; answered = false;
        $('bar').style.width = (i / qs.length * 100) + '%';
        const ord = shuffle(item.opts.map((o, ix) => ({ o, ix })));
        stage.innerHTML = `<div class="kick">${mode === 'mistakes' ? 'Работа над ошибками' : mode === 'mix' ? 'Повторение темы' : 'Занятие ' + li + ' · ' + esc(topicTitle)}</div>
   <h1>${fmt(item.q)}</h1>
   <div class="opts">${ord.map(({ o, ix }) => `<button class="opt" data-a="${ix === item.ans}" data-ix="${ix}">${fmt(o)}</button>`).join('')}</div>
   <div class="exp" id="exp"></div>
   <div class="next"><button class="btn" id="next" style="display:none">Дальше</button></div>`;
        stage.querySelectorAll('.opt').forEach(b => b.onclick = () => {
            if (answered) return; answered = true;
            picks.push({ id: item.id, pick: Number(b.dataset.ix) });
            const ok = b.dataset.a === 'true', ex = $('exp');
            beep(ok);
            stage.querySelectorAll('.opt').forEach(x => {
                x.disabled = true;
                if (x.dataset.a === 'true') x.classList.add('ok'); else if (x === b) x.classList.add('bad'); else x.classList.add('dim');
            });
            if (ok) {
                right++; EF.addXP(2); const bonus = EF.recordCorrect();
                if (mode === 'mistakes') { EF.dropMistake(item.id); EF.recordMistakeFixed(); }
                ex.className = 'exp show ok'; ex.innerHTML = `<b>Верно! +2 XP${bonus ? ' (+' + bonus + ' за 5 правильных)' : ''}</b><p>${fmt(item.exp)}</p>`;
                syncXP(); $('xp').classList.add('pop'); setTimeout(() => $('xp').classList.remove('pop'), 250);
            } else {
                EF.addMistake(item);
                ex.className = 'exp show bad'; ex.innerHTML = `<b>Неверно. Правильный ответ выделен зелёным</b><p>${fmt(item.exp)}</p>`;
            }
            const nx = $('next'); nx.style.display = 'block'; nx.textContent = i + 1 < qs.length ? 'Дальше' : 'Завершить';
        });
        $('next').onclick = () => { if (!answered) return; i++; i < qs.length ? q() : finish(); };
    }
    async function finish() {
        if (finished) return; finished = true;
        try { if (window.EFTelegram && EFTelegram.setLessonActive) EFTelegram.setLessonActive(false); } catch (e) { }
        $('bar').style.width = '100%';
        let xpg = 0, cg = 0, extra = '';
        try {
            if (window.EFServer) {
                if (mode === 'mix' || mode === 'mistakes') EFServer.practice(mode, picks);
                else EFServer.finishLesson(subj, tk, li, picks, startedAt);
            }
        } catch (e) { }
        if (mode === 'mix' || mode === 'mistakes') { EF.addXP(5); xpg += 5; }
        else {
            const r = EF.finishLesson(subj, tk, li);
            if (r.isNew) {
                EF.addXP(20); EF.addCoins(10); xpg += 20; cg += 10;
                if (r.doneNow) { EF.addXP(30); EF.addCoins(15); xpg += 30; cg += 15; extra = 'Тема пройдена! 🎉'; }
            } else { EF.addXP(5); xpg += 5; }
        }
        if (right === qs.length && qs.length === 5) EF.recordClean();
        syncXP();
        const em = right === qs.length ? '🏆' : right >= 3 ? '💪' : '📚';
        // lesson 10 (and free modes) end the route — never link back to l=10
        const nextHref = (mode || li >= 10)
            ? 'tasks.html?s=' + encodeURIComponent(subj)
            : 'lesson.html?s=' + encodeURIComponent(subj) + '&t=' + encodeURIComponent(tk) + '&l=' + (li + 1);
        stage.innerHTML = `<div class="done-hero"><div class="em">${em}</div><h2>${right} из ${qs.length} верно</h2><p>${esc(extra || topicTitle)}</p>
   <div class="rw"><span class="l">+${xpg + right * 2} XP</span>${cg ? `<span class="g">+${cg} ◎</span>` : ''}</div></div>
   <div class="next"><a class="btn" href="${nextHref}">${mode || li >= 10 ? 'К заданиям' : 'Следующее занятие →'}</a>
   <a class="btn ghost" href="tasks.html?s=${encodeURIComponent(subj)}">К списку тем</a></div>`;
        boom(stage.querySelector('.done-hero'));
        // flush AFTER all rewards/mutations so the snapshot is complete
        await EFS.lesson(subj, tk, right);
    }
    q();
}
