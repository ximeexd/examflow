import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

data = data.replace('Шпаргалки', 'Учебник')
data = data.replace('Формулы и схемы', 'Вся теория ОГЭ/ЕГЭ')
data = data.replace("openModal('textbook-modal')", "openTextbook()")
data = data.replace('openModal("textbook-modal")', "openTextbook()")

if '<script src="textbook_db.js"></script>' not in data:
    data = data.replace('<script>', '<script src="textbook_db.js"></script>\n    <script>')

# Rewrite textbook modal
modal_regex = r'<div id="textbook-modal".*?</div>\n    </div>'
new_modal = """<div id="textbook-modal" class="fullscreen-modal flex flex-col p-4 sm:p-5 max-w-md mx-auto" style="background: #090e14;">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4">
            <div class="flex items-center space-x-3">
                <button onclick="closeTextbook()" class="w-10 h-10 rounded-2xl glass-card flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <h3 class="text-[15px] font-black text-white tracking-tight" id="textbook-title">Учебник</h3>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 pb-4 no-scrollbar" id="textbook-content">
            <!-- Rendered by JS -->
        </div>
    </div>"""

data = re.sub(modal_regex, new_modal, data, flags=re.DOTALL)

# Add JS functions
js_logic = """
        // ==========================================
        // TEXTBOOK ENGINE
        // ==========================================
        let currentTextbookLevel = 'subjects';
        let currentTextbookSubject = '';

        function openTextbook() {
            currentTextbookLevel = 'subjects';
            renderTextbook();
            openFullscreen('textbook-modal');
        }

        function closeTextbook() {
            if (currentTextbookLevel === 'article') {
                currentTextbookLevel = 'topics';
                renderTextbook();
            } else if (currentTextbookLevel === 'topics') {
                currentTextbookLevel = 'subjects';
                renderTextbook();
            } else {
                closeFullscreen('textbook-modal');
            }
        }

        function renderTextbook() {
            const content = document.getElementById('textbook-content');
            const title = document.getElementById('textbook-title');
            if (!content) return;

            const isEge = state.exam && state.exam.includes('ЕГЭ') ? 'ЕГЭ' : 'ОГЭ';
            const db = typeof TEXTBOOK_DB !== 'undefined' ? TEXTBOOK_DB[isEge] : null;

            if (!db) {
                content.innerHTML = `<div class="text-gray-500 font-bold text-center text-sm mt-10">Загрузка базы данных...</div>`;
                return;
            }

            if (currentTextbookLevel === 'subjects') {
                title.textContent = `Учебник ${isEge}`;
                let html = '';
                const subjects = Object.keys(db);
                subjects.forEach(subj => {
                    html += `
                        <div onclick="openTextbookSubject('${subj}')" class="glass-card p-4 rounded-[22px] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" style="background: rgba(14,20,32,0.6);">
                            <div class="flex items-center space-x-4">
                                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); box-shadow: inset 0 2px 10px rgba(255,255,255,0.02);">${getSubjectIcon(subj)}</div>
                                <div>
                                    <div class="text-[15px] font-extrabold text-white tracking-tight">${subj}</div>
                                    <div class="text-[11px] font-semibold text-gray-500 mt-0.5">${db[subj].length} тем(ы)</div>
                                </div>
                            </div>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    `;
                });
                content.innerHTML = html;
            } 
            else if (currentTextbookLevel === 'topics') {
                title.textContent = currentTextbookSubject;
                let html = '';
                const topics = db[currentTextbookSubject];
                if (!topics || topics.length === 0) {
                    content.innerHTML = `<div class="text-gray-500 font-bold text-center text-sm mt-10">В этом разделе пока пусто</div>`;
                    return;
                }
                topics.forEach((topic, idx) => {
                    html += `
                        <div onclick="openTextbookArticle(${idx})" class="glass-card p-4 rounded-[20px] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform hover:bg-white/[0.03]">
                            <div class="text-[13px] font-bold text-gray-200 leading-tight pr-4">${topic.title}</div>
                            <div class="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                        </div>
                    `;
                });
                content.innerHTML = html;
            }
        }

        function openTextbookSubject(subj) {
            currentTextbookSubject = subj;
            currentTextbookLevel = 'topics';
            renderTextbook();
        }

        function openTextbookArticle(idx) {
            currentTextbookLevel = 'article';
            const isEge = state.exam && state.exam.includes('ЕГЭ') ? 'ЕГЭ' : 'ОГЭ';
            const article = TEXTBOOK_DB[isEge][currentTextbookSubject][idx];
            
            const title = document.getElementById('textbook-title');
            title.textContent = "Чтение";
            
            const content = document.getElementById('textbook-content');
            content.innerHTML = `
                <div class="glass-card p-6 rounded-[24px]" style="background: rgba(14,20,32,0.7); border: 1px solid rgba(255,255,255,0.08);">
                    <h2 class="text-xl font-black text-white leading-tight mb-5 tracking-tight">${article.title}</h2>
                    <div class="text-[14px] font-medium text-gray-300 space-y-4 leading-relaxed" style="word-wrap: break-word;">
                        ${article.html}
                    </div>
                </div>
            `;
        }

        function getSubjectIcon(subj) {
            if (subj.includes('Математика')) return '📐';
            if (subj.includes('Русский')) return '📚';
            if (subj.includes('Информатика')) return '💻';
            if (subj.includes('Общество')) return '🌍';
            if (subj.includes('Литература')) return '📖';
            if (subj.includes('Физика')) return '⚡';
            if (subj.includes('История')) return '🏛️';
            return '📘';
        }

        // ==========================================
"""

if 'TEXTBOOK ENGINE' not in data:
    data = data.replace('// STATE', js_logic + '// STATE')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("index.html patched!")
