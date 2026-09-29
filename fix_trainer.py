import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# 1. Remove my new Trainer full-width tile
new_tile_regex = r'<!-- Trainer full-width tile -->.*?<div class="bg-white text-slate-900 text-\[11px\] font-extrabold px-4 py-2\.5 rounded-xl shadow-lg active:scale-95 transition-transform">Тренировка</div>\s*</div>'
data = re.sub(new_tile_regex, '', data, flags=re.DOTALL)

# 2. Update the old Trainer tile
old_trainer_regex = r'(<div onclick=")startDuoQuiz\(\)(" class="bento-tile cursor-pointer h-\[132px\] p-4 flex flex-col justify-between" style="background: linear-gradient\(145deg, #a855f7 0%, #7c3aed 100%\); border-bottom: 4px solid #5b21b6;">\s*<div class="flex justify-between items-start">\s*<div>\s*<div class="text-\[14px\] font-extrabold text-white leading-tight tracking-tight">Тренажёр</div>\s*<div class="text-\[10px\] font-semibold text-white/60 mt-0\.5">)Тесты ФИПИ(</div>)'
new_trainer_str = r'\1openModal(\'trainer-modal\')\2Похожие задания\3'
data = re.sub(old_trainer_regex, new_trainer_str, data)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Restored original tile and updated onclick!")
