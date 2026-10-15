/* ExamFlow — tasks page view: subject tabs + topic route. */
EFS.init().then(start).catch(EFS.showBootError);
function start() {
    const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#c3f73a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';
    const LOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#c9a24a"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#c9a24a" stroke-width="3"/></svg>';
    const I = 'stroke="#12291f" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    const ART = {
        q: `<svg class="art" viewBox="0 0 92 76"><path d="M8 66h78M46 6v62" ${I} opacity=".35"/><path d="M12 10Q46 118 80 10" ${I}/><circle cx="26" cy="46" r="5" fill="#fff" stroke="#12291f" stroke-width="3"/><circle cx="66" cy="46" r="5" fill="#fff" stroke="#12291f" stroke-width="3"/></svg>`,
        n: `<svg class="art" viewBox="0 0 92 76"><path d="M6 44h80" ${I}/><circle cx="34" cy="44" r="7" fill="#fff" stroke="#12291f" stroke-width="3"/><path d="M41 44h45" stroke="#12291f" stroke-width="9" stroke-linecap="round" opacity=".35"/><path d="m60 20 12 8-12 8" ${I}/></svg>`,
        f: `<svg class="art" viewBox="0 0 92 76"><path d="M10 6v62h76" ${I} opacity=".4"/><path d="M14 58C30 58 36 22 50 30S70 14 84 10" ${I}/><circle cx="84" cy="10" r="5" fill="#fff" stroke="#12291f" stroke-width="3"/></svg>`,
        p: `<svg class="art" viewBox="0 0 92 76"><path d="M8 66h20v-14h20v-14h20v-14h20" ${I}/><rect x="10" y="52" width="16" height="14" rx="3" fill="#fff" opacity=".5"/><rect x="30" y="38" width="16" height="28" rx="3" fill="#fff" opacity=".5"/><rect x="50" y="24" width="16" height="42" rx="3" fill="#fff" opacity=".5"/></svg>`,
    };
    const emo = e => `<div class="art" style="display:grid;place-items:center;font-size:52px;width:80px">${e}</div>`;
    const CONF = {
        'Математика': { acc: '#c3f73a', a2: '#a9e01f', soft: '#eaffb0', fl: ['x²', 'π', '∑', '√', '%'], em: '📐', eml: ['🧮', '📐', '%', '√'] },
        'Базовая математика': { acc: '#c3f73a', a2: '#a9e01f', soft: '#eaffb0', fl: ['x²', 'π', '∑', '√', '%'], em: '📐', eml: ['🧮', '%', '√', '🌊'] },
        'Профильная математика': { acc: '#c3f73a', a2: '#a9e01f', soft: '#eaffb0', fl: ['∫', 'dx', '∑', '√', 'lim'], em: '📐', eml: ['📐', '🌊', '∫', '🎲'] },
        'Русский язык': { acc: '#ffb3d1', a2: '#f58ab5', soft: '#ffe3ef', fl: ['Ё', 'Ъ', 'Я', '?', '!'], em: '✍️', eml: ['✍️', '❗', '📝', '📖'] },
        'Информатика': { acc: '#c9b8ff', a2: '#8f7bd6', soft: '#e9e2ff', fl: ['01', '&lt;/&gt;', '&amp;', '|', 'Σ'], em: '💻', eml: ['ℹ️', '💻', '📁', '🔤'] },
        'Обществознание': { acc: '#9fdcff', a2: '#5cbff2', soft: '#d9f1ff', fl: ['§', '⚖', '№', '€', '★'], em: '⚖️', eml: ['⚖️', '📈', '🏛️', '💰'] },
        'Физика': { acc: '#9fe0ff', a2: '#53aed6', soft: '#dcf2ff', fl: ['F', 'λ', 'Ω', '⚡', 'v'], em: '🧲', eml: ['📏', '🔥', '♨️', '🧊'] },
        'Биология': { acc: '#8ff0b4', a2: '#4cbf7d', soft: '#dffbea', fl: ['DNA', '🌿', 'α', 'β', '+'], em: '🧬', eml: ['🔬', '🦠', '🌿', '🦊'] },
        'Химия': { acc: '#ffadca', a2: '#d96b94', soft: '#ffe0ec', fl: ['H₂O', '⚗', 'Na', 'pH', 'Δ'], em: '⚗️', eml: ['🧪', '⚛️', '💥', '⚖️'] },
        'История': { acc: '#f4d9a6', a2: '#d9a85e', soft: '#fbeecd', fl: ['★', '⚔', '1812', '§', '✝'], em: '🏛️', eml: ['🏺', '🏰', '👑', '🎖️'] },
        'Английский': { acc: '#b8e6ff', a2: '#6dbfe8', soft: '#e1f4ff', fl: ['Aa', '?', '!', 'abc', '★'], em: '🇬🇧', eml: ['⏳', '🔮', '🧱', '👨‍👩‍👧'] },
        'Литература': { acc: '#ffc9a6', a2: '#e08e5a', soft: '#ffe8d9', fl: ['§', '✎', 'Аа', '★', '"'], em: '📖', eml: ['📖', '🛡️', '⚡', '🌸'] },
        'География': { acc: '#a9e8d8', a2: '#55bd9d', soft: '#dcf7ef', fl: ['🌍', 'N°', '°C', '≈', '▲'], em: '🌍', eml: ['🗺️', '🧭', '🌋', '🏔️'] }
    };
    const cf = n => CONF[n] || { acc: '#c3f73a', a2: '#a9e01f', soft: '#eaffb0', fl: ['★', '?', '+', '§', '!'], em: '📚', eml: ['📚', '⭐', '🎯', '📘'] };
    function artFor(title, subj, i) {
        const t = String(title).toLowerCase();
        if (/уравнен/.test(t)) return ART.q;
        if (/неравенс/.test(t)) return ART.n;
        if (/функц|график|производ|интеграл|логарифм|показательн|тригоном|массив|цикл/.test(t)) return ART.f;
        if (/прогресси|последовательн|процент/.test(t)) return ART.p;
        const e = emFor(title, subj); if (e) return emo(e);
        const l = cf(subj).eml || [cf(subj).em];
        return emo(l[(i || 0) % l.length]);
    }
    const MATH_R = [[/числ|вычислен|арифмет|дробь|дробн/, '🧮'], [/процент|пропорц|смес|сплав/, '%'], [/степен|корн|радикал/, '√'], [/тригонометр|синус|косинус/, '🌊'], [/производн|интеграл|логарифм|показательн/, '∫'], [/вероятн|комбинатор|статистик|случайн/, '🎲'], [/геометр|треугольн|угол|окружн|площад|объём|вектор/, '📐'], [/неравенс/, '≠'], [/уравнен|систем/, 'x²'], [/функц|график/, '🌊'], [/прогресси|последовательн/, '📈']];
    const SUBJMAP = {
        'Математика': MATH_R, 'Базовая математика': MATH_R, 'Профильная математика': MATH_R,
        'Русский язык': [[/орфограф|приставк|суффикс|окончан|правописан|букв|корень/, '✍️'], [/пунктуац|запят|тире|двоеточ|знак/, '❗'], [/сочинен|изложен|эссе|анализ текста|прочитанн/, '📝'], [/речь|речи|морфолог|синтаксис|лексик|фразеолог/, '📖']],
        'Информатика': [[/компьютер|программ|файл|каталог|устройств|памят/, '💻'], [/кодирован|информац|измерен.*информ/, 'ℹ️'], [/язык|алгоритм|python|моделир|систем.*счисл/, '🔤'], [/сет|интернет|баз.*данн|таблиц/, '🌐']],
        'Обществознание': [[/право|закон|конституц|юридич|правонаруш/, '⚖️'], [/эконом|рынок|деньг|банк|финанс|налог|инфляц/, '📈'], [/полит|власт|государств|выбор|партия/, '🏛️'], [/социальн|обществ|семь|человек|культур|религи/, '💰']],
        'Физика': [[/тепл|нагрев|состоян.*веществ|плавлен|испарен/, '♨️'], [/электр|ток|магнит|цепь|заряд/, '⚡'], [/волн|звук|свет|оптик|излучен/, '🌊'], [/атом|ядр|квант/, '⚛️']],
        'Биология': [[/днк|клетк|генет|наследств/, '🧬'], [/растен|гриб|бактери|фотосинтез/, '🌿'], [/животн|зоолог|эволюц|организм/, '🦊']],
        'Химия': [[/реакци|окисл|восстанов|горен/, '💥'], [/атом|молекул|элемент|периодич|строен/, '⚛️'], [/раствор|кислот|щелоч|сол|веществ|смес/, '🧪'], [/расчёт|количеств|молярн/, '⚖️']],
        'История': [[/древн|античн|егип|рим|грец|первобыт/, '🏺'], [/средневек|русь|княз|монгол|xv|xvi|xvii/, '🏰'], [/войн|битв|революц|велик.*отечеств|xx век/, '🎖️'], [/импер|цар|монарх|двор|xviii|xix/, '👑']],
        'Английский': [[/врем|грамматик|present|past|future|perfect/, '⏳'], [/слов|лексич|образован|word/, '🧱'], [/семь|друз|отношен|общен|family/, '👨‍👩‍👧'], [/чтен|аудир|письмен|говорен|reading|listening/, '🔮']],
        'Литература': [[/теор|анализ|жанр|род|средств.*выраз/, '📖'], [/древнерус|полку игорев|былин|летопис|фольклор/, '🛡️'], [/пушкин|лермонтов|поэзи|стих|лирик/, '⚡'], [/гоголь|тургенев|чехов|проза|роман|повест|достоевск|толст/, '🌸']],
        'География': [[/карт|координат|источник|глобус|масштаб/, '🗺️'], [/компас|направлен|ориентир/, '🧭'], [/земл|литосфер|вулкан|землетряс|рельеф.*земл/, '🌋'], [/росси|материк|океан|регион|населен|природ|климат|ресурс/, '🏔️']]
    };
    function emFor(title, subj) {
        const t = String(title).toLowerCase();
        for (const [re, e] of (SUBJMAP[subj] || [])) if (re.test(t)) return e;
        return null;
    }
    const S = EF.get(), esc = EF.escapeHTML;
    let cur = S.active, open = new Set();
    const LK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#a9a595"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#a9a595" stroke-width="3"/></svg>';
    const $ = id => document.getElementById(id);
    // URLSearchParams handles malformed escapes without decodeURIComponent throws
    const qs = new URLSearchParams(location.search).get('s');
    if (qs) cur = qs;
    if (!EF.subjects().includes(cur)) cur = S.active;
    function topics() { return EF.topics(cur) }
    function ci() { return topics().findIndex(t => EF.lessonsDone(cur, t.key) < 10) }
    function resetOpen() { const c = ci(); open = new Set([c < 0 ? 0 : c]) }
    function theme() { const c = cf(cur), r = document.documentElement.style; r.setProperty('--acc', c.acc); r.setProperty('--acc2', c.a2); r.setProperty('--accsoft', c.soft) }
    const les = (t, l) => `lesson.html?s=${encodeURIComponent(cur)}&t=${encodeURIComponent(t.key)}&l=${l}`;
    function render() {
        theme();
        const subs = EF.subjects();
        if (!subs.includes(cur)) cur = subs[0];
        $('examsw').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.e === S.exam));
        $('xpv').textContent = S.xp;
        $('tabs').innerHTML = subs.map(n => `<button class="tab ${n === cur ? 'on' : ''}" data-k="${esc(n)}">${esc(n)}</button>`).join('');
        const t = topics(), c = ci();
        const pl = (n, f) => n + ' ' + f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2)];
        const passed = EF.passedCount(cur), lessons = t.reduce((a, x) => a + EF.lessonsDone(cur, x.key), 0), pct = Math.round(lessons / (t.length * 10) * 100) || 0;
        const C = 2 * Math.PI * 22;
        $('stat').innerHTML = `<svg class="ring" viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" fill="none" stroke="rgba(18,41,31,.15)" stroke-width="7"/><circle cx="27" cy="27" r="22" fill="none" stroke="#12291f" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" transform="rotate(-90 27 27)"/><text x="27" y="31" text-anchor="middle" font-size="12" font-weight="900" fill="#12291f">${pct}%</text></svg><div><b>Пройдено тем: ${passed} из ${t.length}</b><small>${pl(lessons, ['занятие', 'занятия', 'занятий'])} · ${pct}% курса</small></div>`;
        $('list').innerHTML = t.map((topic, i) => {
            const d = EF.lessonsDone(cur, topic.key);
            const st = d >= 10 ? 'done' : i === c ? 'cur' : (c < 0 || i < c) ? 'done' : 'lock';
            const unlocked = EF.isUnlocked(cur, i), locked = !unlocked && st !== 'done';
            const dd = locked ? 0 : d;
            const num = String(i + 1).padStart(2, '0'), op = open.has(i) ? ' open' : '';
            const FL = cf(cur).fl;
            const fl = FL.map((f, j) => {
                const k = j + i * 2;
                const l = [8, 42, 70, 28, 88, 55, 15][k % 7], tp = [58, 12, 70, 80, 46, 30, 64][(i + j * 3) % 7];
                return `<span class="fl" style="left:${l}%;top:${tp}%;font-size:${14 + ((i + j) % 5) * 4}px;animation-delay:${(k * .5) % 3}s">${FL[(i + j) % FL.length]}</span>`;
            }).join('');
            const badge = locked ? LOCK + ' Закрыто' : d >= 10 ? '✓ Пройдено' : '● Сейчас';
            const cells = Array.from({ length: 10 }, (_, k) => {
                if (locked) return `<div class="c l">${LK}</div>`;
                if (k < dd) return `<a class="c d" href="${les(topic, k + 1)}">${CHECK}</a>`;
                if (k === dd) return `<a class="c n" href="${les(topic, k + 1)}">${dd + 1}</a>`;
                return `<div class="c e">·</div>`;
            }).join('');
            const btn = locked ? `<button class="btn off" disabled>Откроется после предыдущей темы</button>`
                : d >= 10 ? `<a class="btn alt" href="lesson.html?s=${encodeURIComponent(cur)}&t=${encodeURIComponent(topic.key)}&mode=mix">Повторить тему</a>`
                    : `<a class="btn" href="${les(topic, dd + 1)}">${d ? 'Продолжить' : 'Начать'} · занятие ${dd + 1}</a>`;
            return `<div class="card ${st}${op}">${fl}<div class="wm">${num}</div>${artFor(topic.title, cur, i)}<div class="hd" data-i="${i}"><span class="badge">${badge}</span><h3>${esc(topic.title)}</h3><p>${dd} из 10 занятий</p><div class="chev">▾</div></div><div class="body"><div><div class="bar">${Array.from({ length: 10 }, (_, k) => `<i class="${k < dd ? 'f' : ''}"></i>`).join('')}</div><div class="grid">${cells}</div>${btn}</div></div></div>`;
        }).join('');
    }
    document.addEventListener('click', e => {
        const x = e.target.closest('#examsw button'); if (x) { EF.setExam(x.dataset.e); cur = EF.get().active; resetOpen(); render(); return }
        const t = e.target.closest('.tab'); if (t) { cur = t.dataset.k; EF.get().active = cur; EF.save(); resetOpen(); render(); return }
        const h = e.target.closest('.hd'); if (h) { const i = +h.dataset.i; open.has(i) ? open.delete(i) : open.add(i); h.closest('.card').classList.toggle('open'); return }
    });
    resetOpen();
    render();
    // drag & wheel scroll for subject tabs
    const tabsEl = $('tabs');
    tabsEl.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { tabsEl.scrollLeft += e.deltaY; e.preventDefault() } }, { passive: false });
    let drag = null, wasDrag = false;
    tabsEl.addEventListener('pointerdown', e => { drag = { x: e.clientX, l: tabsEl.scrollLeft }; wasDrag = false });
    tabsEl.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) wasDrag = true; tabsEl.scrollLeft = drag.l - dx });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => tabsEl.addEventListener(ev, () => { drag = null }));
    tabsEl.addEventListener('click', e => { if (wasDrag) { e.stopPropagation(); e.preventDefault(); wasDrag = false } }, true);
}
