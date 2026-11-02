# Runs the JS test files (due.test.js, math-text.test.js) inside a headless
# Edge page — no node/deno on this machine. due.ts is plain JS + `export`
# keywords, so stripping `export ` yields a loadable classic script.
# Usage: py run_tests.py   →  exit code = number of failed assertions.
import json
import os
import re
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

DIR = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(DIR, '..', '..', '..'))
TMP = os.path.join(DIR, 'tmp')


def rd(p):
    return open(p, encoding='utf-8').read()


due_src = re.sub(r'\bexport\s+', '', rd(os.path.join(DIR, 'due.ts')))
due_test = rd(os.path.join(DIR, 'due.test.js'))

files = {
    './lesson-view.js': rd(os.path.join(APP, 'lesson-view.js')),
    './lesson.html': rd(os.path.join(APP, 'lesson.html')),
}
mt_prelude = (
    'var __files=' + json.dumps(files) + ';\n'
    "var __dirname='.';\n"
    'var process={exit:function(c){window.__exit=c}};\n'
    "var require=function(m){\n"
    "  if(m==='fs')return{readFileSync:function(p){var v=__files[p.replace(/^\\.\\//,'./')];if(v===undefined)throw new Error('no file '+p);return v}};\n"
    "  if(m==='path')return{join:function(){return[].slice.call(arguments).join('/')},dirname:function(){return'.'}};\n"
    '  return{};\n'
    '};\n'
)
mt_src = rd(os.path.join(APP, 'math-text.js'))
mt_test = rd(os.path.join(APP, 'math-text.test.js'))

# growth bundle: server helpers (growth.ts, export-stripped) + client
# growth.js helpers + their assertions
growth_srv = re.sub(r'\bexport\s+', '', rd(os.path.join(
    DIR, '..', 'examflow-api', 'growth.ts')))
growth_js = rd(os.path.join(APP, 'growth.js'))
growth_test = rd(os.path.join(APP, 'growth.test.js'))

lines = []
with sync_playwright() as p:
    # plain launch: playwright creates + auto-deletes a small temp profile
    # (persistent context into TMP proved flaky on this box)
    b = p.chromium.launch(channel='msedge')
    pg = b.new_page()
    pg.on('console', lambda m: lines.append(m.text))
    pg.goto('about:blank')

    print('=== due.test.js ===')
    # IIFE keeps each suite's `let failed`/`ok` scoped; returns the count
    f1 = pg.evaluate('(()=>{\n' + due_src + '\n' + due_test + '\n;return failed;})()')

    print('=== math-text.test.js ===')
    f2 = pg.evaluate('(()=>{\n' + mt_src + '\n' + mt_prelude + mt_test + '\n;return failed;})()')

    print('=== growth.test.js ===')
    f3 = pg.evaluate('(()=>{\n' + growth_srv + '\n' + growth_js + '\n'
                     + growth_test + '\n;return failed;})()')

    b.close()

for l in lines:
    print(l)

shutil.rmtree(TMP, ignore_errors=True)
total = (f1 or 0) + (f2 or 0) + (f3 or 0)
print(f'\n=== {total} failures ===')
sys.exit(1 if total else 0)
