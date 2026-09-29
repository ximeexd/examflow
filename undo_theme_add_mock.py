import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# 1. Replace leftover "Спросить" block with "Пробные варианты" tile
leftover_regex = r'\s*<div class="bg-white text-slate-900 text-\[11px\] font-extrabold px-4 py-2\.5 rounded-xl shadow-lg active:scale-95 transition-transform">Спросить</div>\n\s*</div>\n\s*</div>'
mock_exams_html = """

            <!-- Mock Exams full-width tile -->
            <div onclick="showToastMsg('В разработке', 'Пробные варианты появятся в следующем обновлении!', 'info')" class="bento-tile cursor-pointer p-4 flex items-center justify-between" style="background: linear-gradient(145deg, #10b981 0%, #047857 100%); border-bottom: 4px solid #064e3b; border-radius: 22px;">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center backdrop-blur-sm">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                    <div>
                        <div class="text-[15px] font-extrabold text-white tracking-tight">Пробные варианты</div>
                        <div class="text-[11px] font-semibold text-white/70 mt-0.5">ФИПИ 2026</div>
                    </div>
                </div>
                <div class="bg-white text-slate-900 text-[11px] font-extrabold px-4 py-2.5 rounded-xl shadow-lg active:scale-95 transition-transform">Решать</div>
            </div>"""

data = re.sub(leftover_regex, mock_exams_html, data)


# 2. Remove "Сменить тему" button
theme_btn_regex = r'\s*<button onclick="toggleTheme\(\)".*?<span class="text-\[13px\] font-semibold text-white">Сменить тему</span>.*?</button>'
data = re.sub(theme_btn_regex, '', data, flags=re.DOTALL)


# 3. Remove JS functions
js_regex = r'\s*function toggleTheme\(\) \{.*?\n        \}\n\n        function applyTheme\(\) \{.*?\n        \}'
data = re.sub(js_regex, '', data, flags=re.DOTALL)


# 4. Remove applyTheme() call
data = data.replace('            applyTheme();\n', '')


# 5. Remove light theme CSS overrides
css_regex = r'\s*/\* ---------------- LIGHT THEME OVERRIDES ---------------- \*/.*?</style>'
data = re.sub(css_regex, '\n    </style>', data, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Modifications applied successfully!")
