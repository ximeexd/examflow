import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# Replace the old textbook-modal HTML
modal_regex = r'<div id="textbook-modal".*?<!-- QUIZ SCREEN -->'

new_modal = """<div id="textbook-modal" class="fullscreen-modal flex flex-col pt-12 pb-5 px-4 max-w-md mx-auto relative" style="background: #090e14; z-index: 90;">
        <!-- Background tech grid matching the app -->
        <div class="absolute inset-0 z-0 pointer-events-none opacity-30">
            <div class="absolute inset-0" style="background-image: repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 12px);"></div>
        </div>

        <div class="relative z-10 flex flex-col h-full">
            <!-- Header -->
            <div class="flex items-center mb-4">
                <button onclick="closeFullscreen('textbook-modal')" class="text-white active:scale-90 transition-transform p-1 -ml-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <h2 class="text-xl font-bold text-white ml-2 tracking-tight" id="textbook-main-title">Учебник</h2>
            </div>

            <!-- Search -->
            <div class="relative mb-5" id="textbook-search-container">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input type="text" id="textbook-search" onkeyup="filterTextbook()" placeholder="Поиск" class="w-full bg-[#1e252e] text-gray-200 rounded-[18px] py-3 pl-11 pr-4 outline-none border border-transparent focus:border-white/10 text-[15px] placeholder-gray-500 font-medium">
            </div>

            <!-- Filters -->
            <div class="flex flex-wrap gap-2 mb-4" id="textbook-filters">
                <!-- JS populated -->
            </div>

            <!-- Article List -->
            <div class="flex-1 overflow-y-auto space-y-3 pb-4 no-scrollbar" id="textbook-content">
                <!-- JS populated -->
            </div>
            
            <!-- Article Reader (Hidden by default) -->
            <div id="textbook-reader" class="hidden flex-1 overflow-y-auto pb-8 no-scrollbar bg-[#090e14] absolute inset-0 pt-12 px-4 z-20">
                <div class="flex items-center mb-6">
                    <button onclick="closeTextbookReader()" class="text-white active:scale-90 transition-transform p-1 -ml-1">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <div id="reader-subject-badge" class="ml-3 text-[10px] font-bold text-white px-2 py-0.5 rounded"></div>
                </div>
                <h1 id="reader-title" class="text-2xl font-black text-white leading-tight mb-5 tracking-tight"></h1>
                <div id="reader-body" class="text-[15px] font-medium text-gray-300 space-y-4 leading-relaxed" style="word-wrap: break-word;">
                </div>
            </div>
        </div>
    </div>

    <!-- QUIZ SCREEN -->"""

data = re.sub(modal_regex, new_modal, data, flags=re.DOTALL)

# Replace the old textbook JS logic
js_regex = r'// ==========================================\s*// TEXTBOOK ENGINE.*?// =========================================='

new_js = """// ==========================================
        // TEXTBOOK ENGINE
        // ==========================================
        let activeTextbookFilter = null;
        let searchQuery = '';

        const SUBJECT_CONFIG = {
            "Литература": { color: "#8b5cf6", class: "bg-purple-500", icon: "📚" },
            "География": { color: "#10b981", class: "bg-emerald-500", icon: "🧭" },
            "Русский язык": { color: "#f97316", class: "bg-orange-500", icon: "✍️" },
            "Математика": { color: "#3b82f6", class: "bg-blue-500", icon: "📐" },
            "Базовая математика": { color: "#2563eb", class: "bg-blue-600", icon: "📏" },
            "Обществознание": { color: "#eab308", class: "bg-yellow-500", icon: "🏛️" },
            "История": { color: "#ef4444", class: "bg-red-500", icon: "📜" },
            "Английский язык": { color: "#0ea5e9", class: "bg-sky-500", icon: "🇬🇧" },
            "Биология": { color: "#84cc16", class: "bg-lime-500", icon: "🧬" },
            "Химия": { color: "#d946ef", class: "bg-fuchsia-500", icon: "🧪" },
            "Физика": { color: "#06b6d4", class: "bg-cyan-500", icon: "⚛️" },
            "Информатика": { color: "#a855f7", class: "bg-purple-400", icon: "💻" }
        };

        function openTextbook() {
            activeTextbookFilter = null;
            searchQuery = '';
            document.getElementById('textbook-search').value = '';
            document.getElementById('textbook-reader').classList.add('hidden');
            document.getElementById('textbook-search-container').classList.remove('hidden');
            document.getElementById('textbook-filters').classList.remove('hidden');
            document.getElementById('textbook-content').classList.remove('hidden');
            document.getElementById('textbook-main-title').textContent = 'Учебник';
            
            renderTextbookFilters();
            renderTextbookList();
            openFullscreen('textbook-modal');
        }

        function filterTextbook() {
            searchQuery = document.getElementById('textbook-search').value.toLowerCase();
            renderTextbookList();
        }

        function toggleTextbookFilter(subj) {
            if (activeTextbookFilter === subj) {
                activeTextbookFilter = null;
            } else {
                activeTextbookFilter = subj;
            }
            renderTextbookFilters();
            renderTextbookList();
        }

        function renderTextbookFilters() {
            const container = document.getElementById('textbook-filters');
            if (!container || typeof TEXTBOOK_DB === 'undefined') return;
            
            // Get unique subjects from DB
            const subjectsSet = new Set();
            TEXTBOOK_DB.articles.forEach(a => subjectsSet.add(a.subject));
            const subjects = Array.from(subjectsSet);

            let html = '';
            subjects.forEach(subj => {
                const conf = SUBJECT_CONFIG[subj] || { color: "#6b7280", class: "bg-gray-500", icon: "📘" };
                const isActive = activeTextbookFilter === subj;
                
                // Style matching the premium screenshot
                const border = isActive ? `border-color: ${conf.color};` : `border-color: rgba(255,255,255,0.1);`;
                const bg = isActive ? `background: ${conf.color}20;` : `background: transparent;`;
                
                html += `
                    <button onclick="toggleTextbookFilter('${subj}')" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition-all active:scale-95" style="${border} ${bg}">
                        <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style="background: ${conf.color};">${conf.icon}</div>
                        <span class="text-[13px] font-semibold text-gray-200">${subj}</span>
                    </button>
                `;
            });
            container.innerHTML = html;
        }

        function renderTextbookList() {
            const content = document.getElementById('textbook-content');
            if (!content || typeof TEXTBOOK_DB === 'undefined') return;

            const isEge = state.exam && state.exam.includes('ЕГЭ') ? 'ЕГЭ' : 'ОГЭ';
            
            let articles = TEXTBOOK_DB.articles.filter(a => a.exam === 'all' || a.exam === isEge);
            
            if (activeTextbookFilter) {
                articles = articles.filter(a => a.subject === activeTextbookFilter);
            }
            if (searchQuery) {
                articles = articles.filter(a => a.title.toLowerCase().includes(searchQuery) || a.subject.toLowerCase().includes(searchQuery));
            }

            if (articles.length === 0) {
                content.innerHTML = `<div class="text-gray-500 font-medium text-center text-sm mt-10">Ничего не найдено</div>`;
                return;
            }

            let html = '';
            articles.forEach(a => {
                const conf = SUBJECT_CONFIG[a.subject] || { color: "#6b7280", class: "bg-gray-500", icon: "" };
                html += `
                    <div onclick="openTextbookArticle('${a.id}')" class="rounded-[18px] p-4 cursor-pointer active:scale-[0.98] transition-transform" style="background: #1e252e;">
                        <div class="inline-flex items-center px-2 py-0.5 rounded mb-2" style="background: ${conf.color};">
                            <span class="text-[10px] font-bold text-white">${a.subject}</span>
                        </div>
                        <div class="text-[15px] font-bold text-gray-200 leading-tight">${a.title}</div>
                    </div>
                `;
            });
            content.innerHTML = html;
        }

        function openTextbookArticle(id) {
            const article = TEXTBOOK_DB.articles.find(a => a.id === id);
            if (!article) return;

            document.getElementById('textbook-search-container').classList.add('hidden');
            document.getElementById('textbook-filters').classList.add('hidden');
            document.getElementById('textbook-content').classList.add('hidden');
            document.getElementById('textbook-main-title').textContent = '';
            
            const reader = document.getElementById('textbook-reader');
            reader.classList.remove('hidden');

            const conf = SUBJECT_CONFIG[article.subject] || { color: "#6b7280", class: "bg-gray-500" };
            const badge = document.getElementById('reader-subject-badge');
            badge.textContent = article.subject;
            badge.style.background = conf.color;

            document.getElementById('reader-title').textContent = article.title;
            document.getElementById('reader-body').innerHTML = article.html;
        }

        function closeTextbookReader() {
            document.getElementById('textbook-reader').classList.add('hidden');
            document.getElementById('textbook-search-container').classList.remove('hidden');
            document.getElementById('textbook-filters').classList.remove('hidden');
            document.getElementById('textbook-content').classList.remove('hidden');
            document.getElementById('textbook-main-title').textContent = 'Учебник';
        }
        // =========================================="""

data = re.sub(js_regex, new_js, data, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("index.html patched with new Umschool-style textbook!")
