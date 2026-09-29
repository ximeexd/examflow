import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

new_rule = """
        .theme-light .bg-\\[\\#131f24\\] { background-color: #f8fafc !important; }
"""

data = data.replace('/* ---------------- LIGHT THEME OVERRIDES ---------------- */', '/* ---------------- LIGHT THEME OVERRIDES ---------------- */' + new_rule)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)
