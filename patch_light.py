import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

old_css = r'body\.theme-light \{\s*filter: invert\(1\) hue-rotate\(180deg\);\s*\}\s*body\.theme-light \.keep-dark \{\s*filter: invert\(1\) hue-rotate\(180deg\);\s*\}'

new_css = """
        /* ---------------- LIGHT THEME OVERRIDES ---------------- */
        body.theme-light { background-color: #f8fafc !important; color: #334155 !important; }
        .theme-light .text-white { color: #0f172a !important; }
        .theme-light .text-slate-200, .theme-light .text-gray-300 { color: #334155 !important; }
        .theme-light .text-gray-400 { color: #64748b !important; }
        .theme-light .text-gray-500, .theme-light .text-gray-600 { color: #94a3b8 !important; }
        
        .theme-light [style*="background: #090e14"], .theme-light [style*="background: rgba(9,14,20"] { background: #f8fafc !important; }
        
        .theme-light .glass-card,
        .theme-light .modal-sheet,
        .theme-light [style*="background: rgba(10,15,22"],
        .theme-light [style*="background: rgba(10,16,24"],
        .theme-light [style*="background: rgba(12,18,28"],
        .theme-light [style*="background: rgba(14,20,32"],
        .theme-light [style*="background: rgba(18,28,42"],
        .theme-light [style*="background: rgba(255,255,255,0.02)"] {
            background: #ffffff !important;
            border-color: #e2e8f0 !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.04) !important;
        }
        
        .theme-light .bg-\\[\\#121820\\]\\/90 { background-color: rgba(255, 255, 255, 0.95) !important; border-color: #e2e8f0 !important; }
        
        .theme-light svg[stroke="white"] { stroke: #0f172a !important; }
        .theme-light svg[fill="white"] { fill: #0f172a !important; }
        
        .theme-light [style*="background: linear-gradient"] { color: #ffffff !important; }
        .theme-light [style*="background: linear-gradient"] .text-white { color: #ffffff !important; }
        .theme-light [style*="background: linear-gradient"] svg[stroke="white"],
        .theme-light [style*="background: linear-gradient"] svg[stroke="#0f172a"] { stroke: #ffffff !important; }
        .theme-light [style*="background: linear-gradient"] svg[fill="white"],
        .theme-light [style*="background: linear-gradient"] svg[fill="#0f172a"] { fill: #ffffff !important; }
        
        .theme-light .bg-\\[\\#1c242a\\] { background-color: #ffffff !important; }
        .theme-light .border-\\[\\#131a1e\\] { border-color: #e2e8f0 !important; }
        
        .theme-light [style*="background: rgba(14,20,32,0.8)"] { background: #e2e8f0 !important; border-color: #cbd5e1 !important; }
        .theme-light [style*="background: rgba(255,255,255,0.06)"] { background: #e2e8f0 !important; }
        
        .theme-light [style*="background: rgba(88,204,2,0.1)"] .text-white { color: #58cc02 !important; }
        .theme-light [style*="background: rgba(168,85,247,0.1)"] .text-white { color: #a855f7 !important; }
        .theme-light [style*="background: rgba(255,200,0,0.1)"] .text-white { color: #d4a000 !important; }
"""

data = re.sub(old_css, new_css, data)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Light theme updated!")
