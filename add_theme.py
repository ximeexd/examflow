import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# 1. Add CSS class
css_injection = """
        body.theme-light {
            filter: invert(1) hue-rotate(180deg);
        }
        body.theme-light .keep-dark {
            filter: invert(1) hue-rotate(180deg);
        }
    </style>"""
data = data.replace('</style>', css_injection, 1)

# 2. Add Theme button in profile settings
old_share_btn = r"""                <button onclick="shareWithFriends\(\)" class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/\[0\.03\] active:scale-\[0\.99\] transition-all">"""

new_theme_btn = """                <button onclick="toggleTheme()" class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] active:scale-[0.99] transition-all">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: rgba(168,85,247,0.1);">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                        </div>
                        <span class="text-[13px] font-semibold text-white">Сменить тему</span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button onclick="shareWithFriends()" class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] active:scale-[0.99] transition-all">"""

data = re.sub(old_share_btn, new_theme_btn, data)

# 3. Add JS functions
js_injection = """        function toggleTheme() {
            playSoftTap();
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            applyTheme();
            saveState();
        }

        function applyTheme() {
            if (state.theme === 'light') {
                document.body.classList.add('theme-light');
            } else {
                document.body.classList.remove('theme-light');
            }
        }

        function loadState() {"""
data = data.replace('function loadState() {', js_injection)

# 4. Call applyTheme() inside loadState()
loadstate_injection = """        function loadState() {
            const saved = localStorage.getItem('examflow_state_2026');
            if (saved) {
                try { state = JSON.parse(saved); } catch (e) {}
            }
            applyTheme();"""
data = data.replace("""        function loadState() {
            const saved = localStorage.getItem('examflow_state_2026');
            if (saved) {
                try { state = JSON.parse(saved); } catch (e) {}
            }""", loadstate_injection)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Theme added!")
