
        // ==========================================
        // SOUND ENGINE (Web Audio — warm organic)
        // ==========================================
        let audioCtx = null;
        function getAudio() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return audioCtx;
        }

        function playSoftTap() {
            try {
                const ctx = getAudio();
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, t);
                filter.Q.setValueAtTime(0.7, t);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, t);
                osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

                gain.gain.setValueAtTime(0.06, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + 0.07);
            } catch(e) {}
        }

        function playWarmChime() {
            try {
                const ctx = getAudio();
                const t = ctx.currentTime;
                const notes = [523.25, 659.25, 783.99, 1046.50];
                const convolver = ctx.createConvolver();

                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(2000, t);

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t + i * 0.08);

                    gain.gain.setValueAtTime(0, t + i * 0.08);
                    gain.gain.linearRampToValueAtTime(0.05, t + i * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.6);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(t + i * 0.08);
                    osc.stop(t + i * 0.08 + 0.65);
                });
            } catch(e) {}
        }

        function playSuccess() {
            try {
                const ctx = getAudio();
                const t = ctx.currentTime;
                [392, 523.25, 659.25].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t + i * 0.12);
                    gain.gain.setValueAtTime(0, t + i * 0.12);
                    gain.gain.linearRampToValueAtTime(0.06, t + i * 0.12 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t + i * 0.12);
                    osc.stop(t + i * 0.12 + 0.45);
                });
            } catch(e) {}
        }

        function playError() {
            try {
                const ctx = getAudio();
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.linearRampToValueAtTime(150, t + 0.2);
                gain.gain.setValueAtTime(0.06, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.3);
            } catch(e) {}
        }

        // ==========================================
        // PARTICLES
        // ==========================================
        function initParticles() {
            const container = document.getElementById('particles-container');
            const colors = ['rgba(88,204,2,0.3)', 'rgba(28,176,246,0.2)', 'rgba(206,130,255,0.2)', 'rgba(255,200,0,0.2)'];
            for (let i = 0; i < 8; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = Math.random() * 100 + '%';
                p.style.width = (2 + Math.random() * 3) + 'px';
                p.style.height = p.style.width;
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.animationDuration = (15 + Math.random() * 20) + 's';
                p.style.animationDelay = (Math.random() * 15) + 's';
                container.appendChild(p);
            }
        }

        // ==========================================
        // TOAST NOTIFICATIONS (replaces alert)
        // ==========================================
        function showToastMsg(title, desc, type = 'info') {
            playSoftTap();
            const container = document.getElementById('toast-container');
            const colors = {
                info: '#1cb0f6', success: '#58cc02', error: '#ff4b4b',
                diamond: '#1cb0f6', xp: '#58cc02', coin: '#ffc800'
            };
            const color = colors[type] || colors.info;

            const toast = document.createElement('div');
            toast.className = 'toast-item';
            toast.innerHTML = `
                <div class="glass-card p-4 flex items-center space-x-3 shadow-2xl" style="border-left: 3px solid ${color};">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style="background: ${color}20;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    </div>
                    <div>
                        <div class="text-[12px] font-black text-white">${title}</div>
                        <div class="text-[10px] text-gray-400 font-bold">${desc}</div>
                    </div>
                </div>`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('leaving');
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        }

        // ==========================================
        // XP POPUP ANIMATION
        // ==========================================
        function showXpPopup(amount, x, y) {
            const el = document.createElement('div');
            el.className = 'xp-popup';
            el.textContent = `+${amount} XP`;
            el.style.left = (x || window.innerWidth / 2 - 30) + 'px';
            el.style.top = (y || window.innerHeight / 2) + 'px';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        }

        // ==========================================
        // MODAL MANAGEMENT
        // ==========================================
        function openModal(id) {
            playSoftTap();
            document.getElementById(id).classList.add('active');
            if (id === 'subject-modal' && typeof renderSubjects === 'function') {
                renderSubjects();
            }
        }
        function closeModal(id) {
            playSoftTap();
            document.getElementById(id).classList.remove('active');
        }
        function openFullscreen(id) {
            playSoftTap();
            document.getElementById(id).classList.add('active');
        }
        function closeFullscreen(id) {
            playSoftTap();
            document.getElementById(id).classList.remove('active');
        }

        // ==========================================
        // NAV
        // ==========================================
        let activeNav = 0;
        function navTo(idx) {
            playSoftTap();
            activeNav = idx;
            const btns = document.querySelectorAll('.nav-btn');
            const pill = document.getElementById('nav-pill');
            btns.forEach((b, i) => {
                const svgs = b.querySelectorAll('svg');
                const label = b.querySelector('span');
                if (i === idx) {
                    svgs.forEach(s => s.setAttribute('stroke', '#58cc02'));
                    if (label) { label.style.color = '#58cc02'; }
                } else {
                    svgs.forEach(s => s.setAttribute('stroke', 'rgba(255,255,255,0.3)'));
                    if (label) { label.style.color = 'rgba(255,255,255,0.35)'; }
                }
            });
            const positions = [12.5, 37.5, 62.5, 87.5];
            pill.style.left = `calc(${positions[idx]}% - 20px)`;

            const viewHome = document.getElementById('view-home');
            const viewTasks = document.getElementById('view-tasks');

            const viewLeagues = document.getElementById('view-leagues');
            const viewProfile = document.getElementById('view-profile');

            [viewHome, viewTasks, viewLeagues, viewProfile].forEach(v => v && v.classList.add('hidden'));

            if (idx === 0) { if(viewHome) viewHome.classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
            if (idx === 1) { if(viewTasks) viewTasks.classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); if (typeof renderPath === 'function') renderPath(); }
            if (idx === 2) { if(viewLeagues) viewLeagues.classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); renderLeagues(); }
            if (idx === 3) { if(viewProfile) viewProfile.classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); renderProfileView(); }

        }

        function renderLeagues() {
            // Update league XP bar
            const xpNeeded = 500;
            const pct = Math.min(100, (state.xp / xpNeeded) * 100);
            const bar = document.getElementById('league-xp-bar');
            const txt = document.getElementById('league-xp-text');
            if (bar) bar.style.width = pct + '%';
            if (txt) txt.textContent = `${state.xp} / ${xpNeeded} XP`;

            // Mock leaderboard
            const board = document.getElementById('league-board');
            if (!board) return;
            const players = [
                { name: state.nickname || 'Ты', xp: state.xp, isMe: true },
                { name: 'Алина', xp: 420 },
                { name: 'Максим', xp: 310 },
                { name: 'Соня', xp: 280 },
                { name: 'Данила', xp: 195 },
            ].sort((a, b) => b.xp - a.xp);

            board.innerHTML = players.map((p, i) => {
                const colors = ['text-[#ffd700]', 'text-[#c0c0c0]', 'text-[#cd7f32]'];
                const bg = p.isMe ? 'background: rgba(88,204,2,0.08); border: 1px solid rgba(88,204,2,0.15);' : 'background: transparent;';
                return `<div class="flex items-center space-x-3 p-3 rounded-xl" style="${bg}">
                    <div class="w-6 text-center text-[13px] font-extrabold ${i < 3 ? colors[i] : 'text-gray-500'}">${i + 1}</div>
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-black text-white" style="background: linear-gradient(145deg, ${p.isMe ? '#7c3aed, #4f46e5' : '#1e293b, #0f172a'});">${p.name.charAt(0)}</div>
                    <div class="flex-1">
                        <div class="text-[13px] font-semibold ${p.isMe ? 'text-white' : 'text-gray-400'}">${p.isMe ? p.name + ' (ты)' : p.name}</div>
                    </div>
                    <div class="text-[12px] font-bold text-[#58cc02]">${p.xp} XP</div>
                </div>`;
            }).join('');
        }

        function renderProfileView() {
            const nameEl = document.getElementById('profile-name');
            const rankEl = document.getElementById('profile-rank');
            const streakEl = document.getElementById('profile-streak');
            const xpEl = document.getElementById('profile-xp');
            const avatarEl = document.getElementById('profile-avatar');
            const levelEl = document.getElementById('profile-level-badge');
            const statXp = document.getElementById('profile-stat-xp');
            const statCoins = document.getElementById('profile-stat-coins');
            const statStreak = document.getElementById('profile-stat-streak');
            const statQuizzes = document.getElementById('profile-stat-quizzes');
            const subjectsEl = document.getElementById('profile-subjects');

            if (nameEl) nameEl.textContent = state.nickname || 'Ученик';
            if (rankEl) rankEl.textContent = `${state.statusText || 'Новичок'} • ${state.exam || 'ОГЭ 2026'}`;
            if (streakEl) streakEl.textContent = `${state.streak || 0} дней`;
            if (xpEl) xpEl.textContent = `${state.xp || 0} XP`;
            if (avatarEl) avatarEl.textContent = (state.nickname || 'У').charAt(0).toUpperCase();
            if (levelEl) levelEl.textContent = state.level || 1;
            if (statXp) statXp.textContent = state.xp || 0;
            if (statCoins) statCoins.textContent = state.coins || 0;
            if (statStreak) statStreak.textContent = state.streak || 0;
            if (statQuizzes) statQuizzes.textContent = state.quizzesDone || 0;

            if (subjectsEl && state.subjects) {
                subjectsEl.innerHTML = state.subjects.map(s =>
                    `<span class="text-[11px] font-semibold px-3 py-1.5 rounded-xl" style="background: rgba(88,204,2,0.1); border: 1px solid rgba(88,204,2,0.15); color: #58cc02;">${s}</span>`
                ).join('');
            }
        }

        // ==========================================
        
        // ==========================================
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
// STATE
        // ==========================================
        const resetKey = 'examflow_v4_reset';
        if (!localStorage.getItem(resetKey)) {
            ['examflow_umschool_state','examflow_duo_state','examflow_clean_state_v1','examflow_zero_v3_state','examflow_zero_v3_force'].forEach(k => localStorage.removeItem(k));
            localStorage.setItem(resetKey, 'true');
        }

        const freshState = {
            nickname: "Ученик",
            exam: "ОГЭ 2026",
            subjects: ["Математика", "Русский язык"],
            level: 1,
            statusText: "Новичок",
            rank: 0,
            coins: 0,
            xp: 0,
            streak: 0,
            onboarded: false,
            questsDone: [],
            cardsLearned: 0,
            quizzesDone: 0
        };

        function loadState() {
            const s = localStorage.getItem('examflow_v4_state');
            return s ? { ...freshState, ...JSON.parse(s) } : { ...freshState };
        }

        let state = loadState();
        let prevLevel = state.level;

        function saveState() {
            const prevLvl = state.level;
            state.level = Math.floor(state.xp / 100) + 1;

            const statusNames = { 1: 'Новичок', 2: 'Стажер', 3: 'Боец', 4: 'Знаток', 5: 'Эксперт' };
            state.statusText = statusNames[Math.min(state.level, 5)] || 'Мастер';

            localStorage.setItem('examflow_v4_state', JSON.stringify(state));

            // Update UI
            const $ = id => document.getElementById(id);
            $('stat-streak').innerText = state.streak;
            $('stat-coins').innerText = state.coins;
            $('stat-xp').innerText = state.xp;
            $('stat-rank').innerText = state.rank;
            $('shop-coins-counter').innerText = state.coins;
            $('user-display-name').innerText = state.nickname;
            $('level-badge').innerText = state.level;
            $('lvl-star').innerText = state.level;
            $('bottom-lvl-badge').innerText = `Уровень ${state.level}`;
            $('bottom-status-name').innerText = `${state.statusText} ${state.exam.split(' ')[0]}`;
            $('active-exam-label').innerText = `${state.exam.split(' ')[0]} • ${state.statusText}`;

            if ($('user-name-input')) $('user-name-input').value = state.nickname;

            // XP to next level
            const xpInLevel = state.xp % 100;
            const xpNeeded = 100 - xpInLevel;
            $('xp-level-bar').style.width = xpInLevel + '%';
            $('xp-level-text').innerText = `${xpInLevel} / 100 XP`;
            $('bottom-xp-info').innerText = `${xpNeeded} XP до следующего уровня`;

            // Avatar progress ring
            const ring = $('avatar-ring');
            if (ring) {
                const circumference = 131.95;
                const progress = xpInLevel / 100;
                ring.style.strokeDashoffset = circumference * (1 - progress);
            }

            // Avatar letter or TG avatar
            const avatarContainer = $('user-avatar-container');
            if (avatarContainer) {
                if (state.avatarUrl) {
                    avatarContainer.innerHTML = `<img src="${state.avatarUrl}" alt="avatar" class="w-full h-full object-cover">`;
                    avatarContainer.className = "absolute inset-[4px] rounded-full flex items-center justify-center shadow-lg overflow-hidden";
                } else {
                    avatarContainer.innerHTML = `<span id="user-avatar-letter" class="text-sm font-black text-white" style="text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${(state.nickname || 'У')[0].toUpperCase()}</span>`;
                    avatarContainer.className = "absolute inset-[4px] rounded-full bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg overflow-hidden";
                }
            }

            // Flame SVG (Duolingo Bubbly Style)
            const flameWrapper = $('flame-wrapper');
            if (flameWrapper) {
                if (state.streak > 0) {
                    flameWrapper.innerHTML = `
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style="animation: flame-dance 1s infinite alternate ease-in-out; filter: drop-shadow(0 0 4px rgba(255,150,0,0.4));">
                          <!-- Shadow depth -->
                          <path d="M16 4 C16 4 26 11 26 19 C26 24.5 21.5 29 16 29 C10.5 29 6 24.5 6 19 C6 11 16 4 16 4 Z" fill="#D94E00" stroke="#D94E00" stroke-width="2" stroke-linejoin="round" transform="translate(0, 2)"/>
                          <!-- Main Fire -->
                          <path d="M16 4 C16 4 26 11 26 19 C26 24.5 21.5 29 16 29 C10.5 29 6 24.5 6 19 C6 11 16 4 16 4 Z" fill="#FF9600" stroke="#FF9600" stroke-width="2" stroke-linejoin="round"/>
                          <!-- Inner Fire -->
                          <path d="M16 13 C16 13 21 17 21 21.5 C21 24.5 18.8 26.5 16 26.5 C13.2 26.5 11 24.5 11 21.5 C11 17 16 13 16 13 Z" fill="#FFC800" stroke="#FFC800" stroke-width="2" stroke-linejoin="round"/>
                          <circle cx="12" cy="18" r="1.5" fill="#FFFFFF" opacity="0.8"/>
                        </svg>`;
                    $('stat-streak').style.color = '#ff9600';
                } else {
                    flameWrapper.innerHTML = `
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                          <path d="M16 4 C16 4 26 11 26 19 C26 24.5 21.5 29 16 29 C10.5 29 6 24.5 6 19 C6 11 16 4 16 4 Z" fill="#4A5568" stroke="#4A5568" stroke-width="2" stroke-linejoin="round" transform="translate(0, 2)"/>
                          <path d="M16 4 C16 4 26 11 26 19 C26 24.5 21.5 29 16 29 C10.5 29 6 24.5 6 19 C6 11 16 4 16 4 Z" fill="#718096" stroke="#718096" stroke-width="2" stroke-linejoin="round"/>
                          <path d="M16 13 C16 13 21 17 21 21.5 C21 24.5 18.8 26.5 16 26.5 C13.2 26.5 11 24.5 11 21.5 C11 17 16 13 16 13 Z" fill="#A0AEC0" stroke="#A0AEC0" stroke-width="2" stroke-linejoin="round"/>
                        </svg>`;
                    $('stat-streak').style.color = '#718096';
                }
            }

            if (typeof renderPath === 'function') renderPath();

            // Quests
            const qDone = (state.questsDone || []).length;
            $('quests-counter').innerText = `${qDone}/3`;
            (state.questsDone || []).forEach(num => {
                const check = $(`quest-check-${num}`);
                if (check) {
                    check.className = "w-6 h-6 rounded-lg bg-[#58cc02] text-slate-950 flex items-center justify-center font-black text-[11px]";
                    check.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
                }
            });

            // Progress bars
            const qProgBar = $('quiz-prog-bar');
            const qProgText = $('quiz-prog-text');
            if (qProgBar && qProgText) {
                const pct = Math.min(100, (state.quizzesDone || 0) * 20);
                qProgBar.style.width = pct + '%';
                qProgText.innerText = pct + '%';
            }
            const cProgBar = $('cards-prog-bar');
            const cProgText = $('cards-prog-text');
            if (cProgBar && cProgText) {
                const count = state.cardsLearned || 0;
                cProgBar.style.width = Math.min(100, Math.round((count / 50) * 100)) + '%';
                cProgText.innerText = `${count}/50`;
            }

            // Level up check
            if (state.level > prevLvl && prevLvl > 0) {
                showLevelUp(state.level);
            }
        }

        // ==========================================
        // LEVEL UP
        // ==========================================
        function showLevelUp(lvl) {
            const statusNames = { 1: 'Новичок', 2: 'Стажер', 3: 'Боец', 4: 'Знаток', 5: 'Эксперт' };
            document.getElementById('lvlup-title').innerText = `Уровень ${lvl}!`;
            document.getElementById('lvlup-subtitle').innerText = `Теперь ты «${statusNames[Math.min(lvl, 5)] || 'Мастер'}»`;
            document.getElementById('level-up-screen').classList.add('active');
            playSuccess();
            if (window.confetti) {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
                setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } }), 300);
            }
        }
        function closeLevelUp() {
            playSoftTap();
            document.getElementById('level-up-screen').classList.remove('active');
        }

        // ==========================================
        // STREAK MODAL
        // ==========================================
        function showStreakModal() {
            playSoftTap();
            const cal = document.getElementById('streak-calendar');
            const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
            const today = new Date().getDay();
            const todayIdx = today === 0 ? 6 : today - 1;
            cal.innerHTML = '';
            days.forEach((d, i) => {
                const div = document.createElement('div');
                div.className = 'streak-day ' + (i < todayIdx && state.streak > (todayIdx - i) ? 'active' : i === todayIdx ? (state.streak > 0 ? 'active' : 'today') : 'inactive');
                const fireSvg = `<svg class="w-3.5 h-3.5 mx-auto ${state.streak > 0 ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'text-gray-500'}" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 10c0 3.5-3.5 5.5-3.5 5.5S12 11 12 7c-4.5 4-4.5 10-4.5 10C5.5 14 7 10 7 10s-3.5 2.5-3.5 7.5A8.5 8.5 0 0 0 12 22a8.5 8.5 0 0 0 8.5-8.5C20.5 8.5 17.5 10 17.5 10z"/></svg>`;
                const emptySvg = `<svg class="w-3.5 h-3.5 mx-auto text-gray-700" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" opacity="0.4"/></svg>`;
                const icon = (i < todayIdx && state.streak > (todayIdx - i)) ? fireSvg : (i === todayIdx ? (state.streak > 0 ? fireSvg : emptySvg) : emptySvg);
                div.innerHTML = `<div class="text-center"><div class="text-[8px] opacity-60 mb-1">${d}</div><div>${icon}</div></div>`;
                cal.appendChild(div);
            });

            const streakFire = document.getElementById('streak-fire');
            if (state.streak > 0) {
                streakFire.innerHTML = `
                    <svg width="64" height="64" viewBox="0 0 32 32" fill="none" style="filter: drop-shadow(0 4px 12px rgba(255, 150, 0, 0.6)); animation: flame-dance 1s infinite alternate ease-in-out;">
                      <path d="M16 4 C16 4 26 11 26 19 C26 24.5 21.5 29 16 29 C10.5 29 6 24.5 6 19 C6 11 16 4 16 4 Z" fill="#D94E00" stroke="#D94E00" stroke-width="2" stroke-linejoin="round" transform="translate(0, 2)"/>
                      <path d="M16 4 C16 4 26 11 26 19 C26 24.5 21.5 29 16 29 C10.5 29 6 24.5 6 19 C6 11 16 4 16 4 Z" fill="#FF9600" stroke="#FF9600" stroke-width="2" stroke-linejoin="round"/>
                      <path d="M16 13 C16 13 21 17 21 21.5 C21 24.5 18.8 26.5 16 26.5 C13.2 26.5 11 24.5 11 21.5 C11 17 16 13 16 13 Z" fill="#FFC800" stroke="#FFC800" stroke-width="2" stroke-linejoin="round"/>
                      <circle cx="12" cy="18" r="1.5" fill="#FFFFFF" opacity="0.8"/>
                    </svg>`;
                document.getElementById('streak-title').innerText = `${state.streak} ${state.streak === 1 ? 'день' : 'дней'} подряд!`;
                document.getElementById('streak-desc').innerText = 'Так держать! Не прерывай серию.';
            } else {
                streakFire.innerHTML = `
                    <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
                      <path d="M16 4 C16 4 26 11 26 19 C26 24.5 21.5 29 16 29 C10.5 29 6 24.5 6 19 C6 11 16 4 16 4 Z" fill="#4A5568" stroke="#4A5568" stroke-width="2" stroke-linejoin="round" transform="translate(0, 2)"/>
                      <path d="M16 4 C16 4 26 11 26 19 C26 24.5 21.5 29 16 29 C10.5 29 6 24.5 6 19 C6 11 16 4 16 4 Z" fill="#718096" stroke="#718096" stroke-width="2" stroke-linejoin="round"/>
                      <path d="M16 13 C16 13 21 17 21 21.5 C21 24.5 18.8 26.5 16 26.5 C13.2 26.5 11 24.5 11 21.5 C11 17 16 13 16 13 Z" fill="#A0AEC0" stroke="#A0AEC0" stroke-width="2" stroke-linejoin="round"/>
                    </svg>`;
                document.getElementById('streak-title').innerText = 'Ударный режим';
                document.getElementById('streak-desc').innerText = 'Реши задание сегодня, чтобы зажечь огонь!';
            }

            openModal('streak-modal');
        }

        // ==========================================
        // INIT
        // ==========================================
        let tg = window.Telegram?.WebApp;
        if (tg) {
            tg.expand();
            tg.setHeaderColor('#131f24');
            tg.setBackgroundColor('#131f24');
            if (tg.initDataUnsafe?.user) {
                if (tg.initDataUnsafe.user.first_name && !state.onboarded) {
                    state.nickname = tg.initDataUnsafe.user.first_name;
                }
                if (tg.initDataUnsafe.user.username) {
                    state.tgUsername = tg.initDataUnsafe.user.username;
                }
                if (tg.initDataUnsafe.user.photo_url) {
                    state.avatarUrl = tg.initDataUnsafe.user.photo_url;
                }
            }
        }

        document.addEventListener("DOMContentLoaded", () => {
            initParticles();
            saveState();
            if (!state.onboarded) {
                setTimeout(() => openModal('subject-modal'), 500);
            }
        });

        // ==========================================
        // ==========================================
        // EDSOO CURRICULUM GENERATOR (ФГОС)
        // ==========================================
        function generateCurriculum(isEge, subject) {
            const monthsCount = isEge ? 18 : 9; // 10-11th grade = ~18 months of study, 9th = ~9 months
            const topics = {
                "Математика": [
                                "Числа и вычисления",
                                "Алгебраические выражения",
                                "Уравнения и системы",
                                "Неравенства",
                                "Координаты и графики",
                                "Арифметическая прогрессия",
                                "Геометрия: Углы и Треугольники",
                                "Геометрия: Четырехугольники",
                                "Геометрия: Окружность и Площадь",
                                "Вероятность и статистика",
                                "Текстовые задачи",
                                "Сложная геометрия ч.1",
                                "Сложная геометрия ч.2",
                                "Алгебра 2 часть",
                                "Параметры базовые",
                                "Экономическая задача",
                                "Повторение ОГЭ",
                                "Резерв/Пробники"
                ],
                "Профильная математика": [
                                "Планиметрия (база)",
                                "Текстовые задачи",
                                "Теория вероятностей",
                                "Тригонометрические уравнения",
                                "Стереометрия (база)",
                                "Производная и первообразная",
                                "Логарифмы и степени",
                                "Экономическая задача",
                                "Неравенства (сложные)",
                                "Сложная планиметрия",
                                "Сложная стереометрия",
                                "Параметры ч.1",
                                "Параметры ч.2",
                                "Теория чисел ч.1",
                                "Теория чисел ч.2",
                                "Повторение алгебры",
                                "Повторение геометрии",
                                "Пробники ЕГЭ"
                ],
                "Базовая математика": [
                                "Вычисления и преобразования",
                                "Проценты и пропорции",
                                "Текстовые задачи",
                                "Графики и диаграммы",
                                "Базовая планиметрия",
                                "Базовая стереометрия",
                                "Простые уравнения",
                                "Неравенства",
                                "Логические задачи",
                                "Анализ данных",
                                "Свойства функций",
                                "Размеры и единицы измерения",
                                "Задачи на смекалку",
                                "Теория вероятностей",
                                "Повторение геометрии",
                                "Повторение алгебры",
                                "Комплексные задачи",
                                "Пробники ЕГЭ"
                ],
                "Русский язык": [
                                "Орфоэпия (Ударения)",
                                "Паронимы и лексика",
                                "Морфологические нормы",
                                "Синтаксические нормы",
                                "Орфография: Корни",
                                "Орфография: Приставки",
                                "Орфография: Суффиксы",
                                "Орфография: Н и НН",
                                "Пунктуация: Простое предложение",
                                "Пунктуация: Сложное предложение",
                                "Текст: Средства связи",
                                "Средства выразительности",
                                "Сочинение: Проблема",
                                "Сочинение: Комментарий",
                                "Сочинение: Аргументация",
                                "Повторение орфографии",
                                "Повторение пунктуации",
                                "Пробники ЕГЭ"
                ],
                "Информатика": [
                                "Анализ информационных моделей",
                                "Таблицы истинности",
                                "Алгебра логики (база)",
                                "Базы данных и Excel",
                                "Кодирование звука и графики",
                                "Кодирование информации (комбинаторика)",
                                "Программирование: База",
                                "Программирование: Циклы и массивы",
                                "Анализ алгоритмов (черепашка)",
                                "Рекурсия",
                                "Графы и пути",
                                "Системы счисления",
                                "Алгебра логики (сложная)",
                                "Обработка строк",
                                "Теория игр (камни)",
                                "Электронные таблицы (сложные)",
                                "Обработка файлов (27 задание)",
                                "Пробники ЕГЭ"
                ],
                "Обществознание": [
                                "Общество как система",
                                "Духовная культура",
                                "Познание и истина",
                                "Экономика: База",
                                "Рынок и конкуренция",
                                "Финансы и банки",
                                "Социальная структура",
                                "Социальные нормы и конфликты",
                                "Политика и власть",
                                "Государство и выборы",
                                "Право: Основы",
                                "Конституция РФ",
                                "Гражданское право",
                                "Трудовое и Семейное право",
                                "Уголовное право",
                                "Эссе / Развернутый ответ",
                                "Повторение и термины",
                                "Пробники ЕГЭ"
                ],
                "Физика": [
                                "Кинематика",
                                "Динамика",
                                "Законы сохранения",
                                "Статика и гидростатика",
                                "Молекулярно-кинетическая теория",
                                "Термодинамика",
                                "Электростатика",
                                "Постоянный ток",
                                "Магнитное поле",
                                "Электромагнитная индукция",
                                "Колебания и волны",
                                "Оптика",
                                "Квантовая физика",
                                "Ядерная физика",
                                "Методы научного познания",
                                "Сложные задачи (Механика/МКТ)",
                                "Сложные задачи (Электродинамика)",
                                "Пробники ЕГЭ"
                ],
                "Биология": [
                                "Биология как наука. Методы",
                                "Строение клетки (Цитология)",
                                "Обмен веществ и энергии",
                                "Деление клетки (Митоз, Мейоз)",
                                "Размножение и онтогенез",
                                "Основы генетики",
                                "Закономерности изменчивости",
                                "Селекция и биотехнология",
                                "Вирусы и бактерии. Грибы",
                                "Ботаника",
                                "Зоология беспозвоночных",
                                "Зоология позвоночных",
                                "Анатомия человека: Опора и движение",
                                "Анатомия человека: Системы органов",
                                "Эволюция (Дарвинизм)",
                                "Макроэволюция",
                                "Экология и биосфера",
                                "Пробники ЕГЭ"
                ],
                "Химия": [
                                "Строение атома",
                                "Периодический закон",
                                "Химическая связь и решетки",
                                "Степень окисления и валентность",
                                "Неорганика: Классификация",
                                "Металлы и неметаллы",
                                "ОВР (Окислительно-восстановительные)",
                                "Электролитическая диссоциация",
                                "Гидролиз и электролиз",
                                "Скорость реакций и равновесие",
                                "Органика: Углеводороды",
                                "Органика: Кислородсодержащие",
                                "Органика: Азотсодержащие",
                                "Полимеры и биохимия",
                                "Задачи на растворы",
                                "Сложные задачи неорганики",
                                "Сложные задачи органики",
                                "Пробники ЕГЭ"
                ],
                "История": [
                                "Восточные славяне и Древняя Русь",
                                "Раздробленность и Монголы",
                                "Объединение земель вокруг Москвы",
                                "Россия при Иване Грозном",
                                "Смутное время",
                                "Россия в XVII веке (Первые Романовы)",
                                "Эпоха Петра I",
                                "Дворцовые перевороты",
                                "Правление Екатерины II",
                                "Александр I и Николай I",
                                "Реформы Александра II",
                                "Россия на рубеже XIX-XX вв.",
                                "Революции 1917 г.",
                                "СССР в 1920-1930-е",
                                "Великая Отечественная война",
                                "СССР в 1945-1991 гг.",
                                "Российская Федерация (1991-2026)",
                                "Пробники ЕГЭ"
                ],
                "Английский": [
                                "Tenses: Present & Past",
                                "Tenses: Future & Perfect",
                                "Passive Voice & Reported Speech",
                                "Conditionals & Wishes",
                                "Modal Verbs",
                                "Gerund & Infinitive",
                                "Vocabulary: Word Formation",
                                "Vocabulary: Phrasal Verbs",
                                "Listening: Matching & True/False",
                                "Listening: Multiple Choice",
                                "Reading: Matching Headings",
                                "Reading: Gapped Text",
                                "Reading: Multiple Choice",
                                "Writing: Email",
                                "Writing: Essay (Graph/Table)",
                                "Speaking: Reading & Questions",
                                "Speaking: Interview & Project",
                                "Mock Tests"
                ],
                "Литература": [
                                "Слово о полку Игореве, Фонвизин",
                                "Грибоедов: Горе от ума",
                                "Пушкин: Евгений Онегин, Лирика",
                                "Лермонтов: Герой нашего времени",
                                "Гоголь: Ревизор, Мертвые души",
                                "Островский: Гроза, Бесприданница",
                                "Гончаров и Тургенев",
                                "Тютчев, Фет, Некрасов",
                                "Салтыков-Щедрин",
                                "Толстой: Война и мир",
                                "Достоевский: Преступление и наказание",
                                "Чехов: Пьесы и рассказы",
                                "Бунин, Куприн, Горький",
                                "Поэзия Серебряного века",
                                "Булгаков и Шолохов",
                                "Литература второй половины XX века",
                                "Теория литературы",
                                "Пробники ЕГЭ"
                ],
                "География": [
                                "Источники географической информации",
                                "Природа Земли",
                                "Население мира",
                                "Мировое хозяйство",
                                "Природопользование и экология",
                                "География России: Природа",
                                "География России: Население",
                                "География России: Хозяйство",
                                "Регионы России",
                                "Страноведение",
                                "Политическая карта мира",
                                "Глобальные проблемы человечества",
                                "Геоэкология",
                                "Экономическая география РФ",
                                "Физическая география",
                                "Картография и топография",
                                "Анализ географических данных",
                                "Пробники ЕГЭ"
                ]
};

            const subjTopics = topics[subject] || topics["Математика"];
            const curriculum = [];

            for (let m = 0; m < monthsCount; m++) {
                const topic = subjTopics[m % subjTopics.length];
                const daysInMonth = 20; // 20 study days a month
                
                let nodes = [];
                for (let d = 1; d <= daysInMonth; d++) {
                    const isTest = d % 5 === 0;
                    nodes.push({
                        id: `s_${subject}_m${m}_d${d}`,
                        title: topic,
                        type: isTest ? 'test' : 'practice'
                    });
                }

                curriculum.push({
                    title: `Месяц ${m + 1}: ${topic}`,
                    desc: `Ежедневная практика (${daysInMonth} занятий)`,
                    nodes: nodes
                });
            }
            return curriculum;
        }

        function switchSyllabusSubject(subj) {
            playSoftTap();
            state.activeSyllabusSubject = subj;
            renderPath();
        }

        function renderPath() {
            const container = document.getElementById('syllabus-container');
            const tabsContainer = document.getElementById('syllabus-subject-tabs');
            if (!container || !tabsContainer) return;
            
            const isEge = state.exam && state.exam.includes('ЕГЭ');
            const userSubjects = (state.subjects && state.subjects.length > 0) ? state.subjects : ['Математика'];
            
            if (!state.activeSyllabusSubject || !userSubjects.includes(state.activeSyllabusSubject)) {
                state.activeSyllabusSubject = userSubjects[0];
            }

            // Render subject tabs
            tabsContainer.innerHTML = userSubjects.map(subj => {
                const isActive = subj === state.activeSyllabusSubject;
                const bg = isActive ? 'bg-[#58cc02] text-slate-950 font-black' : 'bg-white/[0.05] text-gray-400 font-bold hover:bg-white/[0.1]';
                return `<button onclick="switchSyllabusSubject('${subj}')" class="px-4 py-2 rounded-xl text-xs transition-colors whitespace-nowrap shadow-sm ${bg}">${subj}</button>`;
            }).join('');

            // Generate curriculum on the fly for the active subject
            const data = generateCurriculum(isEge, state.activeSyllabusSubject);

            let html = '';
            let previousNodeCompleted = true; 

            data.forEach((month, mIdx) => {
                html += `
                <div class="mb-10">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-white/[0.05] to-transparent p-4 rounded-2xl mb-4 border border-white/[0.05] flex justify-between items-center shadow-lg relative overflow-hidden">
                        <div class="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full"></div>
                        <div class="relative z-10">
                            <h2 class="text-[15px] font-black text-white tracking-wide">${month.title}</h2>
                            <p class="text-[10px] font-bold text-gray-400 mt-0.5">${month.desc}</p>
                        </div>
                        <button onclick="startExternTest(${mIdx}, '${month.title}')" class="relative z-10 p-2.5 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl text-gray-300 transition-colors text-[9px] uppercase font-bold tracking-widest border border-white/10 backdrop-blur-md">
                            Экстерн
                        </button>
                    </div>
                    <!-- Nodes Grid -->
                    <div class="px-2 pb-6 grid grid-cols-4 gap-3">
                `;
                
                month.nodes.forEach((node, nIdx) => {
                    const isCompleted = state.completedNodes && state.completedNodes.includes(node.id);
                    const isNext = !isCompleted && previousNodeCompleted;
                    
                    if (isCompleted) previousNodeCompleted = true;
                    else previousNodeCompleted = false;
                    
                    const iconClass = "w-6 h-6 stroke-current drop-shadow-md";
                    const ICONS = [
                        `<svg class="${iconClass}" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
                        `<svg class="${iconClass}" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
                        `<svg class="${iconClass}" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
                        `<svg class="${iconClass}" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`,
                        `<svg class="${iconClass}" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
                    ];
                    const testIcon = `<svg class="w-7 h-7 stroke-current drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C6 4 8 4 12 4s6 0 7.5 0a2.5 2.5 0 0 1 0 5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
                    
                    const icon = node.type === 'test' ? testIcon : ICONS[nIdx % ICONS.length];
                    
                    let content = `<div class="flex flex-col items-center justify-center gap-1.5 h-full w-full">${icon}<span class="text-[8px] font-black uppercase tracking-wider opacity-60">Урок ${nIdx + 1}</span></div>`;

                    let bg = "opacity-50";
                    let bgStyle = "background: rgba(14,20,32,0.8); border: 1px solid rgba(255,255,255,0.06);";
                    let ring = "";
                    let stagger = nIdx % 2 !== 0 ? "translate-y-3" : ""; // Zig-zag layout

                    if (isCompleted) {
                        bg = "opacity-100";
                        bgStyle = "background: linear-gradient(145deg, #4cb300, #3a8f00); border: 1px solid rgba(88,204,2,0.3); box-shadow: 0 4px 20px rgba(88,204,2,0.25);";
                        if (node.type === 'test') {
                            bgStyle = "background: linear-gradient(145deg, #e6b400, #c09000); border: 1px solid rgba(255,200,0,0.3); box-shadow: 0 4px 20px rgba(255,200,0,0.25);";
                        }
                    } else if (isNext) {
                        bg = "opacity-100";
                        bgStyle = "background: linear-gradient(145deg, #5dce08, #3a8f00); border: 1px solid rgba(88,204,2,0.4); box-shadow: 0 4px 24px rgba(88,204,2,0.35), 0 0 0 4px rgba(88,204,2,0.12);";
                        ring = "";
                    }

                    const clickAction = (isNext || isCompleted) ? `startLesson('${node.id}', '${node.title}')` : `showToastMsg('Закрыто', 'Пройдите предыдущие уроки', 'error'); playError();`;

                    html += `
                    <button onclick="${clickAction}" class="aspect-[4/5] rounded-2xl ${bg} ${ring} ${stagger} transition-all active:scale-90 hover:brightness-110 flex flex-col items-center justify-center relative overflow-hidden group" style="${bgStyle}">
                        ${isNext ? '<div class="absolute inset-0 bg-white/10 blur-xl group-hover:bg-white/20 transition-all"></div>' : ''}
                        <div class="relative z-10 w-full h-full">${content}</div>
                    </button>
                    `;
                });
                
                html += `
                    </div>
                </div>`;
            });

            container.innerHTML = html;
        }

        let activeCurriculumNode = null;
        let activeExternSection = null;

        function startExternTest(sIdx, title) {
            playSoftTap();
            activeExternSection = sIdx;
            // Launch quiz for the overall subject to act as an extern test
            const mainSubj = state.activeSyllabusSubject || 'Математика';
            startDuoQuiz(mainSubj);
        }

        function startLesson(id, title) {
            try {
                playSoftTap();
                activeCurriculumNode = id;
                startDuoQuiz(title);
            } catch (err) {
                showToastMsg("Error", err.message + " | " + err.stack.split('\n')[1], "error");
                console.error(err);
            }
        }

        // ==========================================
        // SUBJECT SELECTION
        // ==========================================
        const S_ICONS = {
            math: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19l16-14M4 5l16 14"/></svg>`,
            book: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>`,
            pc: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
            gov: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="20" width="20" height="2"/><rect x="4" y="10" width="2" height="10"/><rect x="10" y="10" width="2" height="10"/><rect x="16" y="10" width="2" height="10"/><polygon points="12 2 2 10 22 10"/></svg>`,
            bolt: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
            dna: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2Z"/><path d="M12 12 2.1 7.1"/></svg>`,
            flask: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6"/><path d="M12 2v7"/><path d="M6 22h12a2 2 0 0 0 2-2V13l-4-4V2H8v7l-4 4v7a2 2 0 0 0 2 2z"/></svg>`,
            history: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
            map: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
            lang: `<svg class="w-6 h-6 stroke-current drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`
        };

        const OGE_SUBJECTS = [
            { id: "Математика", icon: S_ICONS.math, name: "Математика" },
            { id: "Русский язык", icon: S_ICONS.book, name: "Русский язык" },
            { id: "Информатика", icon: S_ICONS.pc, name: "Информатика" },
            { id: "Обществознание", icon: S_ICONS.gov, name: "Общество" },
            { id: "Физика", icon: S_ICONS.bolt, name: "Физика" },
            { id: "Биология", icon: S_ICONS.dna, name: "Биология" },
            { id: "Химия", icon: S_ICONS.flask, name: "Химия" },
            { id: "История", icon: S_ICONS.history, name: "История" },
            { id: "География", icon: S_ICONS.map, name: "География" },
            { id: "Литература", icon: S_ICONS.book, name: "Литература" },
            { id: "Английский", icon: S_ICONS.lang, name: "Английский" }
        ];

        const EGE_SUBJECTS = [
            { id: "Профильная математика", icon: S_ICONS.math, name: "Проф. мат." },
            { id: "Базовая математика", icon: S_ICONS.math, name: "Базовая мат." },
            { id: "Русский язык", icon: S_ICONS.book, name: "Русский язык" },
            { id: "Информатика", icon: S_ICONS.pc, name: "Информатика" },
            { id: "Обществознание", icon: S_ICONS.gov, name: "Общество" },
            { id: "Физика", icon: S_ICONS.bolt, name: "Физика" },
            { id: "Биология", icon: S_ICONS.dna, name: "Биология" },
            { id: "Химия", icon: S_ICONS.flask, name: "Химия" },
            { id: "История", icon: S_ICONS.history, name: "История" },
            { id: "География", icon: S_ICONS.map, name: "География" },
            { id: "Литература", icon: S_ICONS.book, name: "Литература" },
            { id: "Английский", icon: S_ICONS.lang, name: "Английский" }
        ];

        function renderSubjects() {
            const list = document.getElementById('subjects-list');
            if (!list) return;

            const isEge = state.exam && state.exam.includes('ЕГЭ');
            const subjects = isEge ? EGE_SUBJECTS : OGE_SUBJECTS;

            list.className = "grid grid-cols-3 gap-2";
            list.innerHTML = subjects.map(s => {
                const isSelected = state.subjects && state.subjects.includes(s.id);
                if (isSelected) {
                    return `<button onclick="toggleUserSubject(this,'${s.id}')" class="relative p-2.5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1 active:scale-95 transition-all bg-[#58cc02]/10 text-[#58cc02] border-2 border-[#58cc02]/40">
                                <span class="text-xl mb-0.5">${s.icon}</span>
                                <span class="text-[9px] font-black leading-tight uppercase tracking-wider truncate w-full">${s.name}</span>
                                <div class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#58cc02] rounded-full text-slate-950 flex items-center justify-center text-[10px] font-black shadow-sm">✓</div>
                            </button>`;
                } else {
                    return `<button onclick="toggleUserSubject(this,'${s.id}')" class="relative p-2.5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1 active:scale-95 transition-all bg-white/[0.04] text-gray-400 border-2 border-transparent">
                                <span class="text-xl mb-0.5">${s.icon}</span>
                                <span class="text-[9px] font-black leading-tight uppercase tracking-wider truncate w-full">${s.name}</span>
                            </button>`;
                }
            }).join('');
        }

        function selectExamType(exam) {
            playSoftTap();
            if (state.exam !== exam) {
                state.exam = exam;
                state.subjects = []; // reset subjects on exam change
            }
            const bOge = document.getElementById('exam-btn-oge');
            const bEge = document.getElementById('exam-btn-ege');
            if (exam.includes('ОГЭ')) {
                bOge.className = "p-3.5 rounded-2xl bg-[#58cc02] text-slate-950 text-xs font-black active:scale-95 transition-all shadow-md";
                bEge.className = "p-3.5 rounded-2xl bg-white/[0.06] text-gray-400 text-xs font-black active:scale-95 transition-all hover:bg-white/[0.08]";
            } else {
                bEge.className = "p-3.5 rounded-2xl bg-[#58cc02] text-slate-950 text-xs font-black active:scale-95 transition-all shadow-md";
                bOge.className = "p-3.5 rounded-2xl bg-white/[0.06] text-gray-400 text-xs font-black active:scale-95 transition-all hover:bg-white/[0.08]";
            }
            renderSubjects();
        }

        function toggleUserSubject(btn, name) {
            playSoftTap();
            if (state.subjects.includes(name)) {
                state.subjects = state.subjects.filter(s => s !== name);
            } else {
                if (state.subjects.length >= 4) {
                    playError();
                    showToastMsg('Лимит!', 'Можно выбрать не более 4 предметов', 'error');
                    return;
                }
                state.subjects.push(name);
            }
            renderSubjects();
        }

        function saveUserOnboarding() {
            const name = document.getElementById('user-name-input').value.trim();
            if (name) state.nickname = name;

            if (!state.onboarded) {
                state.onboarded = true;
                state.xp += 20;
                state.coins += 5;
                toggleQuest(1, true);
                if (window.confetti) confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } });
                playWarmChime();
                showToastMsg('Добро пожаловать!', `Привет, ${state.nickname}! Начни с решения заданий.`, 'success');
            } else {
                showToastMsg('Сохранено', 'Настройки обновлены', 'success');
            }

            saveState();
            closeModal('subject-modal');
        }

        // ==========================================
        // QUESTS
        // ==========================================
        function toggleQuest(num, silent = false) {
            if ((state.questsDone || []).includes(num)) return;
            state.questsDone = state.questsDone || [];
            state.questsDone.push(num);

            const check = document.getElementById(`quest-check-${num}`);
            if (check) {
                check.className = "w-6 h-6 rounded-lg bg-[#58cc02] text-slate-950 flex items-center justify-center font-black text-[11px]";
                check.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
                check.style.animation = 'bounce-in 0.4s cubic-bezier(0.16,1,0.3,1)';
            }

            if (num === 1) { state.coins += 5; }
            if (num === 2) { state.xp += 25; }
            if (num === 3) { state.xp += 30; }

            saveState();

            if (!silent) {
                playWarmChime();
                if (window.confetti) confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
                showXpPopup(num === 1 ? 5 : num === 2 ? 25 : 30);
            }
        }

        // ==========================================
        // QUIZ ENGINE (10 questions)
        // ==========================================
        
        // ==========================================
        // PROCEDURAL EXAM ENGINE (ФГОС/ФИПИ 2026)
        // ==========================================
        const ProceduralEngine = {
            randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
            
            math_equations: () => {
                let a = ProceduralEngine.randomInt(2, 9);
                let x = ProceduralEngine.randomInt(-10, 10);
                let b = ProceduralEngine.randomInt(-20, 20);
                let c = a * x + b;
                let sign = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
                let q = `Решите уравнение: ${a}x ${sign} = ${c}`;
                
                let wrong1 = x + ProceduralEngine.randomInt(1, 3);
                let wrong2 = x - ProceduralEngine.randomInt(1, 4);
                let wrong3 = -x;
                if (wrong3 === x) wrong3 = x + 5;
                
                let opts = [x.toString(), wrong1.toString(), wrong2.toString(), wrong3.toString()].sort(() => Math.random() - 0.5);
                let ans = opts.indexOf(x.toString());
                return { q, title: "ФИПИ: Алгебра (Уравнения)", cat: "Математика", opts, ans, exp: `${a}x = ${c} ${b >= 0 ? '-' : '+'} ${Math.abs(b)} \n${a}x = ${c - b} \nx = ${x}` };
            },

            math_probability: () => {
                let total = ProceduralEngine.randomInt(10, 30);
                let target = ProceduralEngine.randomInt(2, total - 5);
                let q = `В партии из ${total} деталей ${target} бракованных. Какова вероятность того, что случайно выбранная деталь окажется бракованной? (округлите до сотых)`;
                let ansVal = (target / total).toFixed(2);
                let w1 = ((target+1)/total).toFixed(2);
                let w2 = (target/(total+1)).toFixed(2);
                let w3 = (1 - (target/total)).toFixed(2);
                
                let opts = [ansVal, w1, w2, w3].sort(() => Math.random() - 0.5);
                let ans = opts.indexOf(ansVal);
                return { q, title: "ФИПИ: Теория вероятностей", cat: "Математика", opts, ans, exp: `Вероятность P = m/n, где m = ${target} (брак), n = ${total} (всего). P = ${target}/${total} ≈ ${ansVal}` };
            },

            math_numbers: () => {
                let base = ProceduralEngine.randomInt(2, 9);
                let exp1 = ProceduralEngine.randomInt(3, 7);
                let exp2 = ProceduralEngine.randomInt(1, exp1 - 1);
                let q = `Найдите значение выражения: (${base}^${exp1}) / (${base}^${exp2})`;
                let ansVal = Math.pow(base, exp1 - exp2).toString();
                let opts = [ansVal, Math.pow(base, exp1).toString(), Math.pow(base, exp1+exp2).toString(), (base*(exp1-exp2)).toString()].sort(() => Math.random() - 0.5);
                return { q, title: "ФИПИ: Степени и корни", cat: "Математика", opts, ans: opts.indexOf(ansVal), exp: `При делении степеней с одинаковым основанием показатели вычитаются: ${exp1} - ${exp2} = ${exp1-exp2}. ${base}^${exp1-exp2} = ${ansVal}` };
            },

            info_systems: () => {
                let n = ProceduralEngine.randomInt(10, 60);
                let bin = n.toString(2);
                let q = `Переведите число ${n} из десятичной системы счисления в двоичную.`;
                let opts = [bin, (n+1).toString(2), (n-1).toString(2), parseInt(bin.split('').reverse().join(''), 2).toString(2)].sort(() => Math.random() - 0.5);
                return { q, title: "ФИПИ: Системы счисления", cat: "Информатика", opts, ans: opts.indexOf(bin), exp: `Перевод числа ${n} в двоичную систему даёт ${bin}.` };
            },

            rus_accents: () => {
                const words = [
                    {w: "звОнит", trueW: "звонИт", w1: "звОнит", w2: "звонитЕ", desc: "Ударение всегда падает на И: звонИт, позвонИт."},
                    {w: "катАлог", trueW: "каталОг", w1: "кАталог", w2: "катАлог", desc: "Слово заимствованное, ударение на последний слог."},
                    {w: "тОрты", trueW: "тОрты", w1: "тортЫ", w2: "тОрта", desc: "Ударение неподвижное, на первый слог (как в слове тОрт)."},
                    {w: "красивЕе", trueW: "красИвее", w1: "красивЕе", w2: "крАсивее", desc: "Сравнительная степень от красИвый."},
                    {w: "баловАть", trueW: "баловАть", w1: "бАловать", w2: "баловатЬ", desc: "Глагол, ударение на А."}
                ];
                let item = words[ProceduralEngine.randomInt(0, words.length - 1)];
                let q = `В каком варианте верно указано ударение?`;
                let opts = [item.trueW, item.w1, item.w2, "Все неверны"].sort(() => Math.random() - 0.5);
                return { q, title: "ФИПИ: Орфоэпия", cat: "Русский язык", opts, ans: opts.indexOf(item.trueW), exp: item.desc };
            },

            getQuestions: (topic, count) => {
                let qs = [];
                for (let i = 0; i < count; i++) {
                    if (topic.includes("Уравнения") || topic.includes("Алгебра")) qs.push(ProceduralEngine.math_equations());
                    else if (topic.includes("Вероятност") || topic.includes("Статистика")) qs.push(ProceduralEngine.math_probability());
                    else if (topic.includes("Числа") || topic.includes("Вычисления") || topic.includes("Степени")) qs.push(ProceduralEngine.math_numbers());
                    else if (topic.includes("Системы") || topic.includes("Кодирование") || topic.includes("Информатика")) qs.push(ProceduralEngine.info_systems());
                    else if (topic.includes("Орфоэпия") || topic.includes("Русский")) qs.push(ProceduralEngine.rus_accents());
                }
                return qs.length > 0 ? qs : null;
            }
        };

                const questionBank = {
            "Общая база": [
                { "q": "Сколько будет 2+2?", "title": "Разминка", "cat": "Общее", "opts": ["3", "4", "5", "6"], "ans": 1, "exp": "2+2=4" }
            ],
            "Математика (Общая)": [
                { "q": "Найдите корень уравнения 3x - 5 = 10", "title": "Алгебра", "cat": "Математика", "opts": ["3", "5", "10", "15"], "ans": 1, "exp": "3x = 15, x = 5" },
                { "q": "Вычислите: 5/6 - 3/4", "title": "Дроби", "cat": "Математика", "opts": ["1/12", "1/6", "2/12", "0.5"], "ans": 0, "exp": "10/12 - 9/12 = 1/12" }
            ],
            "Профильная математика (Общая)": [
                { "q": "Найдите значение производной функции y = x^2 - 4x в точке x = 3", "title": "Производная", "cat": "Математика", "opts": ["1", "2", "3", "4"], "ans": 1, "exp": "y' = 2x - 4. Подставляем x=3: 2*3 - 4 = 2." }
            ],
            "Базовая математика (Общая)": [
                { "q": "В треугольнике ABC угол C равен 90 градусов. AB=10, AC=8. Найдите BC.", "title": "Геометрия", "cat": "Математика", "opts": ["5", "6", "7", "8"], "ans": 1, "exp": "По теореме Пифагора: BC = sqrt(100 - 64) = sqrt(36) = 6." }
            ],
            "Русский язык (Общая)": [
                { "q": "В каком слове верно выделена буква, обозначающая ударный гласный?", "title": "Орфоэпия", "cat": "Русский язык", "opts": ["звОнит", "катАлог", "красивЕе", "тОрты"], "ans": 3, "exp": "Правильно: звонИт, каталОг, красИвее, тОрты." },
                { "q": "Укажите варианты ответов, в которых во всех словах одного ряда пропущена безударная чередующаяся гласная.", "title": "Орфография", "cat": "Русский язык", "opts": ["г..реть, выб..рать", "к..сить, к..стер", "р..скошный, р..са", "п..левой, п..лзти"], "ans": 0, "exp": "гореть (гор-гар), выбирать (бир-бер) - это чередования." }
            ],
            "Физика (Общая)": [
                { "q": "Автомобиль движется со скоростью 72 км/ч. Какой путь он пройдёт за 10 секунд?", "title": "Кинематика", "cat": "Физика", "opts": ["720 м", "200 м", "72 м", "20 м"], "ans": 1, "exp": "72 км/ч = 20 м/с. S = v*t = 20 * 10 = 200 м." },
                { "q": "Какая сила действует на тело массой 2 кг, движущееся с ускорением 3 м/с²?", "title": "Динамика", "cat": "Физика", "opts": ["1.5 Н", "5 Н", "6 Н", "12 Н"], "ans": 2, "exp": "F = m*a = 2 * 3 = 6 Н." }
            ],
            "Обществознание (Общая)": [
                { "q": "Кто является гарантом Конституции РФ?", "title": "Политика", "cat": "Обществознание", "opts": ["Президент", "Государственная Дума", "Конституционный суд", "Народ РФ"], "ans": 0, "exp": "Согласно ст. 80, Президент РФ — гарант Конституции." },
                { "q": "Что из перечисленного относится к факторам производства?", "title": "Экономика", "cat": "Обществознание", "opts": ["Прибыль", "Труд", "Заработная плата", "Рента"], "ans": 1, "exp": "Факторы производства: труд, земля, капитал, предпринимательство, информация." }
            ],
            "История (Общая)": [
                { "q": "В каком году произошло Крещение Руси?", "title": "Древняя Русь", "cat": "История", "opts": ["862 г.", "988 г.", "1147 г.", "1223 г."], "ans": 1, "exp": "Крещение Руси произошло в 988 году при князе Владимире." },
                { "q": "Кто командовал русской армией в Бородинском сражении?", "title": "XIX век", "cat": "История", "opts": ["А.В. Суворов", "М.И. Кутузов", "П.И. Багратион", "М.Б. Барклай-де-Толли"], "ans": 1, "exp": "Главнокомандующим был М.И. Кутузов." }
            ],
            "Биология (Общая)": [
                { "q": "Где в клетке происходит синтез белка?", "title": "Цитология", "cat": "Биология", "opts": ["Лизосомы", "Митохондрии", "Рибосомы", "Ядро"], "ans": 2, "exp": "Синтез белка (трансляция) осуществляется рибосомами." },
                { "q": "Какой газ выделяется в процессе фотосинтеза?", "title": "Ботаника", "cat": "Биология", "opts": ["Азот", "Углекислый газ", "Кислород", "Водород"], "ans": 2, "exp": "В световой фазе фотосинтеза при фотолизе воды выделяется кислород." }
            ],
            "Химия (Общая)": [
                { "q": "Какой тип химической связи в молекуле воды (H2O)?", "title": "Химическая связь", "cat": "Химия", "opts": ["Ионная", "Ковалентная полярная", "Ковалентная неполярная", "Металлическая"], "ans": 1, "exp": "Связь между разными неметаллами — ковалентная полярная." },
                { "q": "Степень окисления кислорода в большинстве соединений равна:", "title": "Степень окисления", "cat": "Химия", "opts": ["+1", "+2", "-1", "-2"], "ans": 3, "exp": "Кислород почти всегда проявляет степень окисления -2 (исключения: пероксиды и фторид)." }
            ],
            "Информатика (Общая)": [
                { "q": "Сколько бит в 2 байтах?", "title": "Измерение информации", "cat": "Информатика", "opts": ["8", "16", "24", "32"], "ans": 1, "exp": "1 байт = 8 бит. 2 байта = 16 бит." },
                { "q": "Какой из перечисленных языков не является языком программирования?", "title": "Основы ПО", "cat": "Информатика", "opts": ["Python", "Java", "HTML", "C++"], "ans": 2, "exp": "HTML — это язык гипертекстовой разметки, а не программирования." }
            ],
            "Английский (Общая)": [
                { "q": "Выберите правильный вариант: I ___ to the cinema yesterday.", "title": "Past Simple", "cat": "Английский", "opts": ["go", "goes", "went", "have gone"], "ans": 2, "exp": "Yesterday указывает на Past Simple (went)." },
                { "q": "Вставьте пропущенное слово: He is interested ___ reading books.", "title": "Prepositions", "cat": "Английский", "opts": ["in", "on", "at", "with"], "ans": 0, "exp": "Устойчивое выражение: to be interested IN something." }
            ],
            "Литература (Общая)": [
                { "q": "Кто автор романа «Преступление и наказание»?", "title": "Русская классика", "cat": "Литература", "opts": ["Л.Н. Толстой", "Ф.М. Достоевский", "А.П. Чехов", "И.С. Тургенев"], "ans": 1, "exp": "Роман написан Ф.М. Достоевским в 1866 году." },
                { "q": "К какому литературному направлению относится творчество А.А. Фета?", "title": "Поэзия", "cat": "Литература", "opts": ["Романтизм", "Реализм", "Чистое искусство", "Символизм"], "ans": 2, "exp": "Афанасий Фет — яркий представитель направления «Чистое искусство»." }
            ],
            "География (Общая)": [
                { "q": "Самый большой по площади материк Земли:", "title": "Материки", "cat": "География", "opts": ["Африка", "Северная Америка", "Евразия", "Антарктида"], "ans": 2, "exp": "Евразия — крупнейший материк, занимает около 36% суши." },
                { "q": "Как называется столица Австралии?", "title": "Страны и столицы", "cat": "География", "opts": ["Сидней", "Мельбурн", "Канберра", "Перт"], "ans": 2, "exp": "Канберра была специально построена как компромиссная столица между Сиднеем и Мельбурном." }
            ]
        };

        let qIdx = 0;
        let quizBatch = [];
        let selected = null;
        let checked = false;
        const QUIZ_SIZE = 5;

        function startDuoQuiz(topic = "Общая база") {
            playSoftTap();
            qIdx = 0;
            selected = null;
            checked = false;
            
            let rawTopic = topic.replace(/ \(\u0443\u0440\u043e\u043a \d+\)$/, "").replace(/^\u0422\u0435\u0441\u0442: /, "");
            let pool = typeof ProceduralEngine !== 'undefined' ? ProceduralEngine.getQuestions(rawTopic, QUIZ_SIZE) : null;
            if (!pool) pool = questionBank[rawTopic];
            
            if (!pool) {
                for (let k in questionBank) {
                    if (rawTopic.includes(k) || k.includes(rawTopic)) {
                        pool = questionBank[k];
                        break;
                    }
                }
            }
            if (!pool && state.activeSyllabusSubject) {
                let subjBase = state.activeSyllabusSubject + " (Общая)";
                pool = questionBank[subjBase];
            }
            if (!pool) {
                let subj = state.activeSyllabusSubject || "";
                if (subj.includes("\u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0430")) pool = questionBank["Математика (Общая)"];
            }
            if (!pool) pool = questionBank["Общая база"] || Object.values(questionBank)[0] || [];

            // Shuffle and pick
            quizBatch = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(QUIZ_SIZE, pool.length));
            if (quizBatch.length === 0) {
                let fallbackFill = questionBank[state.activeSyllabusSubject + " (Общая)"] || questionBank["Общая база"] || Object.values(questionBank)[0] || [];
                quizBatch = [...fallbackFill].sort(() => Math.random() - 0.5).slice(0, Math.min(QUIZ_SIZE, fallbackFill.length));
            }

            
            openFullscreen('quiz-screen');
            renderQ();
        }

        function renderQ() {
            selected = null;
            checked = false;
            const cur = quizBatch[qIdx];
            document.getElementById('q-box').innerText = cur.q;
            document.getElementById('q-title').innerText = cur.title;
            document.getElementById('q-category-badge').innerText = cur.cat;
            document.getElementById('quiz-step-text').innerText = `${qIdx + 1}/${quizBatch.length}`;
            document.getElementById('quiz-progress-bar').style.width = `${((qIdx + 1) / quizBatch.length) * 100}%`;
            document.getElementById('quiz-feedback').innerHTML = '';

            const btn = document.getElementById('quiz-action-btn');
            btn.innerText = "ПРОВЕРИТЬ";
            btn.className = "bg-gray-700 text-gray-400 text-xs font-black uppercase tracking-wider py-4 px-7 rounded-2xl cursor-not-allowed opacity-50 transition-all";

            const container = document.getElementById('q-options');
            container.innerHTML = '';

            cur.opts.forEach((opt, idx) => {
                const b = document.createElement('button');
                b.className = "glass-card p-4 text-center text-lg font-black text-white hover:bg-white/[0.06] active:scale-95 transition-all border-2 border-transparent";
                b.innerText = opt;
                b.onclick = () => {
                    if (checked) return;
                    playSoftTap();
                    for (let c of container.children) {
                        c.className = "glass-card p-4 text-center text-lg font-black text-white transition-all border-2 border-transparent";
                        c.style.background = '';
                    }
                    b.className = "glass-card p-4 text-center text-lg font-black text-white transition-all border-2 border-[#1cb0f6] shadow-[0_0_10px_rgba(28,176,246,0.2)]";
                    b.style.background = 'rgba(28,176,246,0.1)';
                    selected = idx;
                    btn.className = "text-white text-xs font-black uppercase tracking-wider py-4 px-7 rounded-2xl active:scale-95 transition-all shadow-lg";
                    btn.style.background = 'linear-gradient(135deg, #58cc02, #4cb300)';
                    btn.style.borderBottom = '3px solid #3d9400';
                    btn.style.cursor = 'pointer';
                    btn.style.opacity = '1';
                };
                container.appendChild(b);
            });
        }

        
        function startTrainer(subj) {
            closeModal('trainer-modal');
            startDuoQuiz(subj);
        }
        
        function checkAnswer() {
            if (selected === null && !checked) return;
            const cur = quizBatch[qIdx];
            const btn = document.getElementById('quiz-action-btn');
            const feed = document.getElementById('quiz-feedback');

            if (!checked) {
                checked = true;
                const options = document.getElementById('q-options').children;
                if (selected === cur.ans) {
                    playSuccess();
                    options[selected].style.background = 'rgba(88,204,2,0.2)';
                    options[selected].style.borderColor = '#58cc02';
                    feed.innerHTML = `<span class="text-[#58cc02] font-black">${cur.exp}</span>`;
                    btn.style.background = 'linear-gradient(135deg, #58cc02, #4cb300)';
                    btn.innerText = "ДАЛЬШЕ →";
                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
                    showXpPopup(10);
                } else {
                    playError();
                    if (options[selected]) {
                        options[selected].style.background = 'rgba(255,75,75,0.2)';
                        options[selected].style.borderColor = '#ff4b4b';
                        options[selected].className += ' border-2';
                    }
                    if (options[cur.ans]) {
                        options[cur.ans].style.background = 'rgba(88,204,2,0.15)';
                        options[cur.ans].style.borderColor = '#58cc02';
                        options[cur.ans].className += ' border-2';
                    }
                    feed.innerHTML = `<span class="text-[#ff6b6b] font-black">${cur.exp}</span>`;
                    btn.style.background = 'linear-gradient(135deg, #ff4b4b, #e03030)';
                    btn.style.borderBottom = '3px solid #c02020';
                    btn.innerText = "ПОНЯТНО →";
                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
                    quizBatch.push(cur);
                }
            } else {
                if (qIdx + 1 < quizBatch.length) {
                    qIdx++;
                    renderQ();
                } else {
                    closeFullscreen('quiz-screen');
                    
                    if (activeExternSection !== null) {
                        const isEge = state.exam && state.exam.includes('ЕГЭ');
                        const mainSubj = state.activeSyllabusSubject || 'Математика';
                        const data = generateCurriculum(isEge, mainSubj);
                        
                        if (!state.completedNodes) state.completedNodes = [];
                        for (let i = 0; i <= activeExternSection; i++) {
                            data[i].nodes.forEach(node => {
                                if (!state.completedNodes.includes(node.id)) {
                                    state.completedNodes.push(node.id);
                                }
                            });
                        }
                        activeExternSection = null;
                        if (typeof renderPath === 'function') renderPath();
                        
                        state.xp += 500;
                        showToastMsg('Экстерн сдан!', '+500 XP • Раздел завершен', 'success');
                        showXpPopup(500);
                    } else if (activeCurriculumNode) {
                        if (!state.completedNodes) state.completedNodes = [];
                        if (!state.completedNodes.includes(activeCurriculumNode)) {
                            state.completedNodes.push(activeCurriculumNode);
                        }
                        activeCurriculumNode = null;
                        if (typeof renderPath === 'function') renderPath();
                        
                        state.xp += 50;
                        showToastMsg('Урок пройден!', '+50 XP • Вы отлично справились!', 'success');
                        showXpPopup(50);
                    } else {
                        state.xp += 50;
                        showToastMsg('Тест пройден!', '+50 XP • Стрик зажжён!', 'success');
                        showXpPopup(50);
                    }

                    state.coins += 10;
                    state.rank += 5;
                    state.streak = Math.max(1, (state.streak || 0) + 1);
                    state.quizzesDone = (state.quizzesDone || 0) + 1;
                    toggleQuest(2, true);
                    saveState();
                    playSuccess();
                    if (window.confetti) {
                        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
                        setTimeout(() => confetti({ particleCount: 60, spread: 50, origin: { y: 0.5 } }), 200);
                    }
                }
            }
        }

        // ==========================================
        // FLASHCARDS (8 terms)
        // ==========================================
        const cardsData = [
            { term: "Инфляция", desc: "Устойчивый рост общего уровня цен, приводящий к снижению покупательной способности денег." },
            { term: "ВВП", desc: "Рыночная стоимость всех конечных товаров и услуг, произведенных на территории страны за год." },
            { term: "Конституция", desc: "Основной закон государства, обладающий высшей юридической силой." },
            { term: "Демократия", desc: "Политический режим, при котором власть принадлежит народу и осуществляется через выборы." },
            { term: "Дефицит бюджета", desc: "Ситуация, когда расходы государства превышают его доходы за определённый период." },
            { term: "Правовое государство", desc: "Государство, где верховенство закона распространяется на все ветви власти и граждан." },
            { term: "Социализация", desc: "Процесс усвоения человеком норм и ценностей общества на протяжении жизни." },
            { term: "Монополия", desc: "Рыночная ситуация, когда единственный производитель контролирует весь объём выпуска товара." }
        ];
        let cardIdx = 0;
        let isFlipped = false;
        let cardBatch = [];

        function openFlashcards() {
            playSoftTap();
            cardIdx = 0;
            isFlipped = false;
            cardBatch = [...cardsData].sort(() => Math.random() - 0.5);
            showCard();
            openFullscreen('cards-screen');
        }

        function showCard() {
            isFlipped = false;
            const c = cardBatch[cardIdx];
            document.getElementById('card-term').innerText = c.term;
            document.getElementById('card-desc').innerText = c.desc;
            document.getElementById('card-desc').classList.add('hidden');
            document.getElementById('flashcard-counter').innerText = `${cardIdx + 1}/${cardBatch.length}`;
            const card = document.getElementById('flashcard');
            card.style.transform = 'scale(0.95)';
            requestAnimationFrame(() => { card.style.transform = 'scale(1)'; });
        }

        function flipCard() {
            playSoftTap();
            isFlipped = !isFlipped;
            const card = document.getElementById('flashcard');
            if (isFlipped) {
                document.getElementById('card-desc').classList.remove('hidden');
                card.style.transform = 'scale(1.02)';
                setTimeout(() => { card.style.transform = 'scale(1)'; }, 150);
            } else {
                document.getElementById('card-desc').classList.add('hidden');
            }
        }

        function nextCard(known) {
            playSoftTap();
            if (known) state.cardsLearned = Math.min(50, (state.cardsLearned || 0) + 1);

            if (cardIdx + 1 < cardBatch.length) {
                cardIdx++;
                showCard();
            } else {
                closeFullscreen('cards-screen');
                state.xp += 30;
                state.cardsLearned = Math.min(50, (state.cardsLearned || 0) + 2);
                toggleQuest(3, true);
                saveState();
                playWarmChime();
                if (window.confetti) confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                showToastMsg('Карточки пройдены!', '+30 XP • Отличное повторение!', 'success');
                showXpPopup(30);
            }
        }

        // ==========================================
        // SHOP
        // ==========================================
        function buyShopItem(name, cost) {
            if (state.coins < cost) {
                showToastMsg('Недостаточно монет', `Нужно ${cost}. Решай задания!`, 'error');
                playError();
                return;
            }
            state.coins -= cost;
            saveState();
            playWarmChime();
            showToastMsg('Куплено!', name, 'success');
            if (window.confetti) confetti({ particleCount: 40, spread: 40, origin: { y: 0.8 } });
        }

        // ==========================================
        // AI TUTOR
        // ==========================================
        

        // ==========================================
        // NOTIFICATIONS
        // ==========================================
        function openNotifSheet() {
            showToastMsg('Уведомления', 'Добро пожаловать в ExamFlow! Реши первое задание.', 'info');
        }

        // ==========================================
        // SHARE
        // ==========================================
        function shareWithFriends() {
            playSoftTap();
            state.coins += 50;
            saveState();
            playSuccess();
            if (window.confetti) confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
            showToastMsg('Ссылка скопирована!', '+50 монет начислено', 'coin');
            showXpPopup(50);
        }
    