/* ExamFlow — pure growth helpers (no DOM): invite link building, source
   params, numeric-answer matching, mistakes grouping. Loaded before
   invite.js and the view files; unit-tested in growth.test.js. */
(function () {
    'use strict';
    const START_PARAM_RE = /^[A-Za-z0-9_-]{1,64}$/;
    // plain number after trim: "5", "-3", "−3", "2,5", "0.75"
    const NUM_RE = /^[-−]?\d+([.,]\d+)?$/;

    // Direct-link base: t.me/<bot>/<short> when the Mini App short name is
    // known, else t.me/<bot> (BotFather ?start= links still land on the bot).
    function inviteBase(cfg) {
        const c = cfg || (typeof window !== 'undefined' && window.EF_CFG) || {};
        const bot = typeof c.botUsername === 'string' && c.botUsername ? c.botUsername : 'myexamflow_bot';
        return c.appShortName ? 'https://t.me/' + bot + '/' + c.appShortName : 'https://t.me/' + bot;
    }
    // Mini App direct links carry the ref in ?startapp=; plain bot links
    // use ?start=. No id → bare link (browser demo mode).
    function inviteLink(cfg, tgId) {
        const c = cfg || (typeof window !== 'undefined' && window.EF_CFG) || {};
        let u = inviteBase(c);
        if (Number.isSafeInteger(tgId) && tgId > 0) {
            u += (c.appShortName ? '?startapp=' : '?start=') + 'ref_' + tgId;
        }
        return u;
    }
    function inviteText(exam) {
        const e = exam === 'ege' ? 'ЕГЭ' : exam === 'oge' ? 'ОГЭ' : 'ОГЭ/ЕГЭ';
        return 'Я готовлюсь к ' + e + ' по 5 минут в день в Telegram — присоединяйся: ';
    }
    // ?src= query param for funnel attribution (source from web-app buttons
    // that cannot carry a Telegram start_param). {} when absent/invalid.
    function srcParam(search) {
        const out = {};
        try {
            const v = new URLSearchParams(search || '').get('src');
            if (v && START_PARAM_RE.test(v)) out.src = v.toLowerCase();
        } catch (e) { }
        return out;
    }

    // Numeric value of a plain-number option string, or null.
    function numValue(text) {
        const m = String(text).trim().match(NUM_RE);
        if (!m) return null;
        const v = parseFloat(m[0].replace('−', '-').replace(',', '.'));
        return Number.isFinite(v) ? v : null;
    }
    // Typed answer -> option index to report as `pick`. A numeric match with
    // any option wins (tolerance < 1e-9, so "5.0" == "5", "2,5" == "2.5").
    // No match → the first index that is not `ans` (server counts it wrong).
    function numMatch(typed, opts, ans) {
        const norm = String(typed == null ? '' : typed).trim().replace(/−/g, '-').replace(/,/g, '.');
        const v = /^-?\d+(\.\d+)?$/.test(norm) ? Number(norm) : NaN;
        for (let i = 0; i < opts.length; i++) {
            const ov = numValue(opts[i]);
            if (ov !== null && Number.isFinite(v) && Math.abs(v - ov) < 1e-9) {
                return { pick: i, matched: true, value: v };
            }
        }
        for (let i = 0; i < opts.length; i++) {
            if (i !== ans) return { pick: i, matched: false, value: v };
        }
        return { pick: 0, matched: false, value: v };
    }
    // FNV-1a of a string id — stable across sessions; even => typed-input UI.
    function hashEven(id) {
        let h = 2166136261;
        const s = String(id);
        for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        return (h >>> 0) % 2 === 0;
    }

    // Group stored mistake records into weak-topic rows for the home card.
    // Key: topicKey when present, else the best title field; records with no
    // topic info at all land in «Прочее». topicsFn(subject) resolves the
    // human title from the curriculum.
    function groupMistakes(mistakes, topicsFn) {
        const map = new Map();
        for (const m of (Array.isArray(mistakes) ? mistakes : [])) {
            if (!m || typeof m !== 'object') continue;
            const subj = (typeof m.subject === 'string' && m.subject) ||
                (typeof m.cat === 'string' && m.cat) || '';
            const key = (typeof m.topicKey === 'string' && m.topicKey) || '';
            const label = (typeof m.topic === 'string' && m.topic) ||
                (typeof m.title === 'string' && m.title) ||
                (typeof m.courseTopic === 'string' && m.courseTopic) || '';
            const gk = subj + '|' + (key || label);
            let g = map.get(gk);
            if (!g) { g = { subject: subj, key: key, label: label, count: 0 }; map.set(gk, g); }
            if (!g.label && label) g.label = label;
            g.count++;
        }
        const out = [...map.values()];
        for (const g of out) {
            g.title = g.label || g.subject || 'Прочее';
            if (g.key && g.subject && typeof topicsFn === 'function') {
                try {
                    const t = (topicsFn(g.subject) || []).find(x => x && x.key === g.key);
                    if (t && t.title) g.title = t.title;
                } catch (e) { }
            }
        }
        out.sort((a, b) => b.count - a.count);
        return out;
    }

    window.EFGrowth = {
        inviteBase, inviteLink, inviteText, srcParam,
        numValue, numMatch, hashEven, groupMistakes,
        NUM_RE, START_PARAM_RE
    };
})();
