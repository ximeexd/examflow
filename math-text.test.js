/* ExamFlow — math-text.js tests. Run: node math-text.test.js
   Plain assertions, no deps. */
'use strict';
const fs = require('fs');
const path = require('path');
require('./math-text.js');
const fmt = globalThis.EFMathText.format;

let failed = 0;
function ok(cond, name, extra) {
    if (cond) { console.log('ok   ' + name); }
    else { failed++; console.log('FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}
const has = (h, n) => h.includes(n);
const count = (h, re) => (h.match(re) || []).length;

// --- fractions render ---
let h = fmt('Сколько будет 1/2 + 3/4?');
ok(count(h, /ef-fraction"/g) === 2, 'two fractions render', h);
ok(has(h, 'aria-label="1/2"') && has(h, 'aria-label="3/4"'), 'aria labels literal', h);
ok(has(h, '&gt;') === false && has(h, '+') , 'plain text around fractions kept', h);

h = fmt('-8/7');
ok(has(h, 'aria-label="-8/7"') && has(h, 'ef-fraction-num" aria-hidden="true">-8<'), 'negative numerator', h);

h = fmt('5/-6');
ok(has(h, 'ef-fraction-den" aria-hidden="true">-6<'), 'negative denominator', h);

h = fmt('1,5/2');
ok(has(h, 'aria-label="1,5/2"') && has(h, '>1,5<'), 'decimal comma numerator', h);

h = fmt('−8/7 и 5/−6');
ok(count(h, /ef-fraction"/g) === 2 && has(h, 'aria-label="−8/7"'), 'unicode minus', h);

h = fmt('доли ( 1 / 2 ) и [ 3/4 ]!');
ok(count(h, /ef-fraction"/g) === 2 && has(h, 'aria-label="1 / 2"'), 'spaces + punctuation boundaries', h);

// --- conservative: no partial matches ---
for (const t of [
    '12/10/2026', '1/2/3', '10 км/ч', 'скорость м/с', 'a8/7b', 'x-1/2y',
    'https://site.ru/a/1/2', '(x+1)/(x-2)', 'модель b12/34', 'ABC 1/2x'
]) {
    h = fmt(t);
    ok(!has(h, 'ef-fraction'), 'no fraction in: ' + t, h);
}

// binary minus stays outside: 5-1/2 -> "5-" text + fraction 1/2
h = fmt('5-1/2');
ok(has(h, '5-') && has(h, 'aria-label="1/2"') && !has(h, 'aria-label="-1/2"'), 'binary minus not bound', h);
h = fmt('5 - 1/2');
ok(has(h, 'aria-label="1/2"') && !has(h, 'aria-label="-1/2"'), 'binary minus with space not bound', h);

// --- escaping / XSS ---
h = fmt('<img src=x onerror=alert(1)> и "1/2"\'');
ok(!has(h, '<img') && has(h, '&lt;img') && has(h, '&quot;') && has(h, '&#39;'), 'xss payload escaped', h);
h = fmt('<script>alert(1)</script>');
ok(!has(h, '<script'), 'script tag escaped', h);

// only whitelisted markup emitted
h = fmt('a 1/2 b 3/4');
const attrs = new Set();
for (const m of h.matchAll(/<[^>]+>/g))
    for (const a of m[0].matchAll(/([\w-]+)=/g)) attrs.add(a[1]);
ok([...attrs].every(a => ['class', 'aria-label', 'aria-hidden'].includes(a)),
    'only controlled attributes emitted', [...attrs].join(','));
ok(!/style=|on\w+=|href=/.test(h), 'no injected attributes', h);

// plain text identical to escapeHTML semantics
const esc = v => String(v).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
for (const t of ['Привет, мир!', '5 < 7 & 8 > 4', 'никаких дробей']) {
    ok(fmt(t) === esc(t), 'plain text passthrough: ' + t, fmt(t));
}
ok(fmt(null) === '', 'null -> empty', fmt(null));

// --- integration: lesson-view.js uses fmt for q / options / exp ---
const lv = fs.readFileSync(path.join(__dirname, 'lesson-view.js'), 'utf8');
ok(/\$\{fmt\(item\.q\)\}/.test(lv), 'q uses fmt');
ok(/\$\{fmt\(o\)\}/.test(lv), 'options use fmt');
ok(count(lv, /\$\{fmt\(item\.exp\)\}/g) === 2, 'exp uses fmt twice');
ok(!/\$\{esc\(item\.q\)\}|\$\{esc\(o\)\}|\$\{esc\(item\.exp\)\}/.test(lv), 'esc gone from q/o/exp');
const lh = fs.readFileSync(path.join(__dirname, 'lesson.html'), 'utf8');
ok(/math-text\.js\?v=1/.test(lh) && /math-text\.css\?v=1/.test(lh), 'assets linked');
ok(/math-text\.js\?v=1"><\/script>\s*<script src="lesson-view\.js\?v=14/.test(lh.replace(/\n/g, ' ')) ||
   /math-text\.js[^<]*<\/script>\s*<script src="lesson-view\.js\?v=14/.test(lh.replace(/\n/g, ' ')),
   'math-text loads before lesson-view v14');
ok(!/lesson-view\.js\?v=13/.test(lh), 'v13 bumped');

console.log(failed ? '\n' + failed + ' FAILED' : '\nall passed');
process.exit(failed ? 1 : 0);
