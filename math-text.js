/* ExamFlow — renders simple numeric fractions (1/2, -8/7, 1,5/2) as stacked
   markup. All raw text is HTML-escaped; the only emitted markup is controlled
   spans. Conservative tokenization: only standalone numeric operands — dates,
   URL paths, units, model labels and algebraic expressions pass through. */
(function (root) {
    'use strict';
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const NUM = '\\d+(?:[.,]\\d+)?';
    const RE = new RegExp('(' + NUM + ')[ \\t]*\\/[ \\t]*([-−]?' + NUM + ')', 'g');
    const WORD = /[0-9A-Za-zА-Яа-яЁё_]/;

    // a minus before the numerator binds as a unary sign only when the
    // preceding non-space char is not alphanumeric/dot/comma — so 5-1/2 and
    // x-1/2 keep their binary minus outside the fraction
    function unaryMinus(s, i) {
        let j = i - 1;
        while (j >= 0 && (s[j] === ' ' || s[j] === '\t')) j--;
        return j < 0 || !(WORD.test(s[j]) || s[j] === '.' || s[j] === ',');
    }

    function format(value) {
        const s = String(value == null ? '' : value);
        let out = '', last = 0, m;
        RE.lastIndex = 0;
        while ((m = RE.exec(s))) {
            const num = m[1], den = m[2];
            let start = m.index, sign = '';
            const end = start + m[0].length;
            let p = start - 1;
            if (p >= 0 && (s[p] === '-' || s[p] === '−') && unaryMinus(s, p)) {
                sign = s[p]; start = p; p--;
            }
            const before = p >= 0 ? s[p] : '';
            const after = end < s.length ? s[end] : '';
            if ((before !== '' && (WORD.test(before) || before === '/' || before === '.' || before === ',')) ||
                (after === '/' || WORD.test(after))) {
                continue; // chain (1/2/3), date (12/10/2026) or alphanumeric token
            }
            const raw = s.slice(start, end);
            out += esc(s.slice(last, start)) +
                '<span class="ef-fraction" aria-label="' + esc(raw) + '">' +
                '<span class="ef-fraction-num" aria-hidden="true">' + esc(sign + num) + '</span>' +
                '<span class="ef-fraction-den" aria-hidden="true">' + esc(den) + '</span></span>';
            last = end;
        }
        return out + esc(s.slice(last));
    }

    root.EFMathText = { format: format };
})(typeof window !== 'undefined' ? window : globalThis);
