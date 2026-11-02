/* growth.test.js — pure-logic assertions for the growth bundle.
   Runs inside the Edge harness (run_tests.py): parseStartParam /
   normTrackProps come from growth.ts (export-stripped), client helpers from
   growth.js (window.EFGrowth). `failed` is returned to the runner. */
let failed = 0;
function ok(cond, msg) { if (!cond) { failed++; console.log('FAIL: ' + msg); } }

/* ---- server: parseStartParam ---- */
ok(parseStartParam(null) === null, 'null param');
ok(parseStartParam('') === null, 'empty param');
ok(parseStartParam(undefined) === null, 'undefined param');
ok(parseStartParam(42) === null, 'non-string param');
(function () {
    const r = parseStartParam('ref_12345678901234567890');
    ok(r && r.source === 'ref' && r.referrer === '12345678901234567890', 'valid ref_20digits');
})();
(function () {
    const r = parseStartParam('ref_1');
    ok(r && r.source === 'ref' && r.referrer === '1', 'ref_1 minimal');
})();
ok(parseStartParam('ref_0') !== null && parseStartParam('ref_0').source === 'tiktok' === false && parseStartParam('ref_0').source === 'ref_0', 'ref_0 → plain source, not ref');
ok(parseStartParam('ref_0123').source === 'ref_0123', 'leading zero not a ref');
ok(parseStartParam('ref_').source === 'ref_', 'ref_ no digits → source');
ok(parseStartParam('ref_999999999999999999999').source === 'ref_999999999999999999999', 'ref >20 digits → source');
(function () {
    const r = parseStartParam('TIKTOK');
    ok(r && r.source === 'tiktok' && r.referrer === null, 'source lowercased');
})();
ok(parseStartParam('tik tok') === null, 'space rejected');
ok(parseStartParam('<script>') === null, 'html rejected');
ok(parseStartParam('a'.repeat(65)) === null, 'over 64 rejected');
ok(parseStartParam(' vk-ads_2 ') !== null && parseStartParam(' vk-ads_2 ').source === 'vk-ads_2', 'trim + dash/underscore ok');

/* ---- server: normTrackProps ---- */
ok(JSON.stringify(normTrackProps(null)) === '{}', 'props null');
ok(JSON.stringify(normTrackProps([1])) === '{}', 'props array');
(function () {
    const p = normTrackProps({ src: 'remind', right: 4, flag: true, ok2: 'bad', Bad_Key: 'x', arr: [1], s: 'x'.repeat(50) });
    ok(p.src === 'remind' && p.right === 4 && p.flag === true, 'props kept types');
    ok(p.ok2 === undefined, 'digit in key dropped');
    ok(p['Bad_Key'] === undefined && p.arr === undefined, 'props bad key/type dropped');
    ok(p.s.length === 40, 'string clamped to 40');
})();
(function () {
    const p = normTrackProps({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 });
    ok(Object.keys(p).length === 6, 'max 6 keys');
})();
ok(TRACK_NAMES.has('app_open') && TRACK_NAMES.has('number_input_used') && !TRACK_NAMES.has('admin'), 'track whitelist');

/* ---- client: invite link ---- */
ok(EFGrowth.inviteLink({ botUsername: 'myexamflow_bot', appShortName: 'app' }, 777) === 'https://t.me/myexamflow_bot/app?startapp=ref_777', 'link startapp');
ok(EFGrowth.inviteLink({ botUsername: 'myexamflow_bot', appShortName: 'app' }, null) === 'https://t.me/myexamflow_bot/app', 'link no id');
ok(EFGrowth.inviteLink({ botUsername: 'myexamflow_bot', appShortName: '' }, 42) === 'https://t.me/myexamflow_bot?start=ref_42', 'link start= fallback');
ok(EFGrowth.inviteLink({ botUsername: 'myexamflow_bot', appShortName: '' }, 0) === 'https://t.me/myexamflow_bot', 'link bare when no id/short');
ok(EFGrowth.inviteText('oge').indexOf('ОГЭ') >= 0 && EFGrowth.inviteText('ege').indexOf('ЕГЭ') >= 0 && EFGrowth.inviteText('').indexOf('ОГЭ/ЕГЭ') >= 0, 'invite text exam');

/* ---- client: src param ---- */
ok(EFGrowth.srcParam('?src=remind').src === 'remind', 'src param read');
ok(EFGrowth.srcParam('?settings=1&src=remind').src === 'remind', 'src with other params');
ok(JSON.stringify(EFGrowth.srcParam('?src=<bad>')) === '{}', 'src bad dropped');
ok(JSON.stringify(EFGrowth.srcParam('')) === '{}', 'src absent');
ok(EFGrowth.srcParam('?src=VK').src === 'vk', 'src lowercased');

/* ---- client: numeric matching ---- */
ok(EFGrowth.numValue('5') === 5 && EFGrowth.numValue(' 2,5 ') === 2.5 && EFGrowth.numValue('−3') === -3 && EFGrowth.numValue('0.75') === 0.75, 'numValue forms');
ok(EFGrowth.numValue('1/2') === null && EFGrowth.numValue('x') === null && EFGrowth.numValue('') === null && EFGrowth.numValue('5 ₽') === null, 'numValue rejects non-plain');
(function () {
    const opts = ['192', '610', '832', '448'];
    let r = EFGrowth.numMatch('448', opts, 3); ok(r.pick === 3 && r.matched, 'exact int');
    r = EFGrowth.numMatch('448.0', opts, 3); ok(r.pick === 3 && r.matched, '5.0 vs 5');
    r = EFGrowth.numMatch('2,5', ['1', '2.5', '3', '4'], 1); ok(r.pick === 1 && r.matched, 'comma vs dot');
    r = EFGrowth.numMatch('−3', ['-3', '0', '1', '2'], 0); ok(r.pick === 0 && r.matched, 'unicode minus');
    r = EFGrowth.numMatch('-3', ['−3', '0', '1', '2'], 0); ok(r.pick === 0 && r.matched, 'ascii minus vs unicode');
    r = EFGrowth.numMatch('999', opts, 3); ok(r.pick === 0 && !r.matched && r.pick !== 3, 'no match → first != ans');
    r = EFGrowth.numMatch('abc', opts, 3); ok(r.pick === 0 && !r.matched && r.pick !== 3, 'garbage → first != ans');
    const opts2 = ['10', '20', '30', '40'];
    r = EFGrowth.numMatch('20', opts2, 2); ok(r.pick === 1 && r.matched && r.pick !== 2, 'matched wrong option → its index');
})();

/* ---- client: hashEven ---- */
ok(EFGrowth.hashEven('school:oge:Математика:k:q1') === EFGrowth.hashEven('school:oge:Математика:k:q1'), 'hash stable');
(function () {
    let even = 0;
    for (let i = 0; i < 200; i++) if (EFGrowth.hashEven('id' + i)) even++;
    ok(even > 60 && even < 140, 'hash roughly halves (' + even + '/200)');
})();

/* ---- client: mistakes grouping ---- */
(function () {
    const ms = [
        { id: 'a', subject: 'Математика', topicKey: 'math-t1', q: 'q', opts: ['1', '2', '3', '4'], ans: 0 },
        { id: 'b', subject: 'Математика', topicKey: 'math-t1', q: 'q', opts: ['1', '2', '3', '4'], ans: 0 },
        { id: 'c', subject: 'Математика', topicKey: 'math-t2', q: 'q', opts: ['1', '2', '3', '4'], ans: 0 },
        { id: 'd', subject: 'Русский язык', topic: 'Орфография', q: 'q', opts: ['1', '2', '3', '4'], ans: 0 },
        { id: 'e', q: 'q', opts: ['1', '2', '3', '4'], ans: 0 },
    ];
    const g = EFGrowth.groupMistakes(ms, s => s === 'Математика'
        ? [{ key: 'math-t1', title: 'Числа и вычисления' }, { key: 'math-t2', title: 'Проценты' }] : []);
    ok(g.length === 4, 'four groups got ' + g.length);
    ok(g[0].count === 2 && g[0].title === 'Числа и вычисления', 'top group resolved title + count');
    ok(g[0].key === 'math-t1' && g[0].subject === 'Математика', 'group carries key+subject for link');
    ok(g.some(x => x.title === 'Проценты'), 'second key resolved');
    ok(g.some(x => x.title === 'Орфография' && !x.key), 'title-only group keeps label, no key');
    ok(g.some(x => x.title === 'Прочее'), 'no-topic records → Прочее');
    const g2 = EFGrowth.groupMistakes([], null);
    ok(g2.length === 0, 'empty mistakes');
})();

console.log('growth.test.js: ' + (failed ? failed + ' FAILURES' : 'all assertions passed'));
