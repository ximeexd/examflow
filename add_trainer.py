import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

trainer_tile = """
            <!-- Trainer full-width tile -->
            <div onclick="openModal('trainer-modal')" class="bento-tile cursor-pointer p-4 flex items-center justify-between stagger-4" style="background: linear-gradient(145deg, #8b5cf6 0%, #6d28d9 100%); border-bottom: 4px solid #4c1d95; border-radius: 22px; margin-bottom: 12px;">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center backdrop-blur-sm">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                    </div>
                    <div>
                        <div class="text-[15px] font-extrabold text-white tracking-tight">Тренажёр</div>
                        <div class="text-[11px] font-semibold text-white/70 mt-0.5">Умное повторение</div>
                    </div>
                </div>
                <div class="bg-white text-slate-900 text-[11px] font-extrabold px-4 py-2.5 rounded-xl shadow-lg active:scale-95 transition-transform">Тренировка</div>
            </div>
"""

data = data.replace('<!-- Mock Exams full-width tile -->', trainer_tile + '<!-- Mock Exams full-width tile -->')

trainer_modal = """
    <!-- TRAINER MODAL -->
    <div id="trainer-modal" class="modal-overlay hidden fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeModal('trainer-modal')"></div>
        <div class="modal-sheet rounded-t-[28px] p-5 w-full max-w-md space-y-4 relative" style="background: rgba(10,15,22,0.98); border-top: 1px solid rgba(255,255,255,0.06);">
            <div class="w-10 h-1.5 rounded-full bg-white/20 mx-auto mb-4"></div>
            <h2 class="text-xl font-extrabold text-white">Выбери предмет для тренировки</h2>
            <p class="text-xs font-medium text-gray-400">Алгоритм подберёт задания на основе твоих сегодняшних ошибок и успехов.</p>
            
            <div class="grid grid-cols-2 gap-3 mt-4">
                <button onclick="startTrainer('Математика')" class="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 active:scale-95 transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-3xl">📐</div>
                    <span class="text-xs font-bold text-white mt-2">Математика</span>
                </button>
                <button onclick="startTrainer('Русский язык')" class="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 active:scale-95 transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-3xl">📚</div>
                    <span class="text-xs font-bold text-white mt-2">Русский язык</span>
                </button>
                <button onclick="startTrainer('Информатика')" class="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 active:scale-95 transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-3xl">💻</div>
                    <span class="text-xs font-bold text-white mt-2">Информатика</span>
                </button>
                <button onclick="startTrainer('Обществознание')" class="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 active:scale-95 transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-3xl">🌍</div>
                    <span class="text-xs font-bold text-white mt-2">Общество</span>
                </button>
            </div>
            <button onclick="closeModal('trainer-modal')" class="w-full mt-2 py-4 rounded-2xl text-gray-400 font-bold active:scale-95 transition-all hover:bg-white/5">Закрыть</button>
        </div>
    </div>
"""

data = data.replace('<!-- QUIZ SCREEN -->', trainer_modal + '\n    <!-- QUIZ SCREEN -->')

js_injection = """
        function startTrainer(subj) {
            closeModal('trainer-modal');
            startDuoQuiz(subj);
        }
        
        function checkAnswer() {"""

data = data.replace('function checkAnswer() {', js_injection)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Trainer added!")
