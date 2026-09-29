import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

trainer_modal = """
    <!-- TRAINER MODAL -->
    <div id="trainer-modal" class="modal-overlay hidden fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeModal('trainer-modal')"></div>
        <div class="modal-sheet rounded-t-[28px] p-5 w-full max-w-md space-y-4 relative" style="background: rgba(10,15,22,0.98); border-top: 1px solid rgba(255,255,255,0.06);">
            <div class="w-10 h-1.5 rounded-full bg-white/20 mx-auto mb-4"></div>
            <h2 class="text-xl font-extrabold text-white tracking-tight">Выбери предмет</h2>
            <p class="text-xs font-medium text-gray-400">Умный алгоритм подберёт задания на основе твоих сегодняшних ошибок.</p>
            
            <div class="grid grid-cols-2 gap-3 mt-4">
                <button onclick="startTrainer('Математика')" class="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 active:scale-95 transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-3xl">📐</div>
                    <span class="text-[13px] font-bold text-white mt-1">Математика</span>
                </button>
                <button onclick="startTrainer('Русский язык')" class="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 active:scale-95 transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-3xl">📚</div>
                    <span class="text-[13px] font-bold text-white mt-1">Русский язык</span>
                </button>
                <button onclick="startTrainer('Информатика')" class="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 active:scale-95 transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-3xl">💻</div>
                    <span class="text-[13px] font-bold text-white mt-1">Информатика</span>
                </button>
                <button onclick="startTrainer('Обществознание')" class="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 active:scale-95 transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-3xl">🌍</div>
                    <span class="text-[13px] font-bold text-white mt-1">Общество</span>
                </button>
            </div>
            <button onclick="closeModal('trainer-modal')" class="w-full mt-2 py-4 rounded-2xl text-gray-400 font-bold active:scale-95 transition-all hover:bg-white/5">Закрыть</button>
        </div>
    </div>
"""

data = data.replace('<!-- QUIZ SCREEN -->', trainer_modal + '\n    <!-- QUIZ SCREEN -->')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Restored trainer modal!")
