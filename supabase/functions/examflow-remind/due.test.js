/* due.ts tests — plain assertions, no deps, no imports: the file is meant to
   be appended after due.ts (with `export` keywords stripped) and evaluated by
   run_tests.py in a browser page. Covers the selection rules + tz math. */
'use strict';

let failed = 0;
function ok(cond, name, extra) {
    if (cond) { console.log('ok   ' + name); }
    else { failed++; console.log('FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

// fixed instant: 2026-10-31, various UTC hours
const P = function (over) {
    const p = {
        remind_blocked: false, last_reminded_on: null,
        econ: { streak: 3, lastActive: '2026-10-30' },
        profile: { exam: 'oge', settings: { remind: true, time: '18:00', tz: 180 } },
    };
    return Object.assign(p, over || {});
};
const utc = (h, m) => Date.UTC(2026, 9, 31, h, m);          // Oct 31
const utcNov1 = (h, m) => Date.UTC(2026, 10, 1, h, m);      // Nov 1

// 15:10 UTC +3h = 18:10 local → inside the 18:00..21:00 window → due
let d = decideDue(P(), utc(15, 10));
ok(d.due === true && d.reason === 'due', 'inside window → due', d);
ok(d.localDay === '2026-10-31', 'localDay computed', d.localDay);

// 14:30 UTC → 17:30 local → before 18:00 → not due
d = decideDue(P(), utc(14, 30));
ok(d.due === false && d.reason === 'early', 'before time → no', d);

// 18:30 UTC → 21:30 local → more than 3h past → not due
d = decideDue(P(), utc(18, 30));
ok(d.due === false && d.reason === 'late', '>3h late → no', d);

// 21:00 local exactly is still inside (< want+180 boundary is exclusive)
d = decideDue(P(), utc(17, 59));
ok(d.due === true, '20:59 local still due', d);
d = decideDue(P(), utc(18, 0));
ok(d.due === false && d.reason === 'late', '21:00 local exactly = window over', d);

// already reminded today → no
d = decideDue(P({ last_reminded_on: '2026-10-31' }), utc(15, 10));
ok(d.due === false && d.reason === 'done', 'already reminded → no', d);
// yesterday's mark does not block today
d = decideDue(P({ last_reminded_on: '2026-10-30' }), utc(15, 10));
ok(d.due === true, 'reminded yesterday → due', d);

// already studied today (lastActive == local day) → no
d = decideDue(P({ econ: { streak: 0, lastActive: '2026-10-31' } }), utc(15, 10));
ok(d.due === false && d.reason === 'studied', 'studied today → no', d);

// remind off → no; missing remind → default on → yes
d = decideDue(P({ profile: { exam: 'oge', settings: { remind: false, time: '18:00', tz: 180 } } }), utc(15, 10));
ok(d.due === false && d.reason === 'off', 'remind=false → no', d);
d = decideDue(P({ profile: { exam: 'oge', settings: { time: '18:00', tz: 180 } } }), utc(15, 10));
ok(d.due === true, 'missing remind → default on', d);

// remind_blocked → no
d = decideDue(P({ remind_blocked: true }), utc(15, 10));
ok(d.due === false && d.reason === 'blocked', 'remind_blocked → no', d);

// tz crossing midnight: UTC 22:30 +3h = next local day 01:30 → early, and
// localDay is Nov 1
d = decideDue(P(), utc(22, 30));
ok(d.due === false && d.reason === 'early' && d.localDay === '2026-11-01',
    'UTC 22:30 +180 = next local day', d);
// the other direction: Nov 1 09:00 UTC +9h = Nov 1 18:00 local → due, and a
// reminder dated Oct 31 (yesterday local) must not block it
d = decideDue(P({ profile: { exam: 'oge', settings: { remind: true, time: '18:00', tz: 540 } } }), utcNov1(9, 0));
ok(d.due === true && d.localDay === '2026-11-01', 'UTC Nov1 09:00 +540 = 18:00 Nov1 → due', d);
d = decideDue(P({ last_reminded_on: '2026-10-31', profile: { exam: 'oge', settings: { remind: true, time: '18:00', tz: 540 } } }), utcNov1(9, 0));
ok(d.due === true, 'last_reminded yesterday-local → due', d);

// missing tz → default 180 (same as explicit 180)
d = decideDue(P({ profile: { exam: 'oge', settings: { remind: true, time: '18:00' } } }), utc(15, 10));
ok(d.due === true && d.localDay === '2026-10-31', 'missing tz → 180 default', d);

// tz clamp
ok(clampTz(2000) === 840 && clampTz(-2000) === -720 && clampTz('x') === 180 && clampTz(181.6) === 182,
    'clampTz bounds/default/round', [clampTz(2000), clampTz(-2000), clampTz('x'), clampTz(181.6)]);

// bad time → default 18:00 (same instant as above stays due)
d = decideDue(P({ profile: { exam: 'oge', settings: { remind: true, time: 'xx', tz: 180 } } }), utc(15, 10));
ok(d.due === true, 'bad time → 18:00 default', d);
// custom time honoured: time='09:00', local 18:10 → late
d = decideDue(P({ profile: { exam: 'oge', settings: { remind: true, time: '09:00', tz: 180 } } }), utc(15, 10));
ok(d.due === false && d.reason === 'late', 'custom time 09:00 → 18:10 is late', d);

// reminderText: streak branch + exam labels + deterministic by day
ok(/Серия 5/.test(reminderText(5, 'oge', '2026-10-31')), 'streak text mentions streak');
ok(/к ОГЭ/.test(reminderText(0, 'oge', '2026-10-31')), 'oge → к ОГЭ');
ok(/к ЕГЭ/.test(reminderText(0, 'ege', '2026-10-31')), 'ege → к ЕГЭ');
ok(/экзамен/.test(reminderText(0, '', '2026-10-31')), 'missing exam → generic');
ok(reminderText(0, 'oge', '2026-10-31') === reminderText(0, 'oge', '2026-10-31'),
    'deterministic per day');
ok(/первое занятие/i.test(reminderText(0, 'oge', '2026-10-31', true)),
    'neverStudied → first-lesson copy');
ok(reminderText(0, 'oge', '2026-10-31', true) === reminderText(0, 'oge', '2026-10-31', true),
    'neverStudied deterministic per day');
ok(reminderText(0, 'oge', '2026-10-31', false) === reminderText(0, 'oge', '2026-10-31'),
    'neverStudied=false → plain copy unchanged');

console.log(failed ? '\n' + failed + ' FAILED' : '\nall passed');
