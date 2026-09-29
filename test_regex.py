import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

leftover_regex = r'\s*<div class="bg-white text-slate-900 text-\[11px\] font-extrabold px-4 py-2\.5 rounded-xl shadow-lg active:scale-95 transition-transform">Спросить</div>\n\s*</div>\n\s*</div>'

print("Found?", re.search(leftover_regex, data) is not None)
