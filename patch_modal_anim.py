import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# Add CSS for slide-in-right-modal
css = """
        /* ===== SLIDE-IN RIGHT MODAL ===== */
        .slide-in-right-modal {
            position: fixed; inset: 0;
            z-index: 50;
            transform: translateX(100%);
            transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
            background: #090e14;
        }
        .slide-in-right-modal.active {
            transform: translateX(0);
        }
"""
if '/* ===== SLIDE-IN RIGHT MODAL ===== */' not in data:
    data = data.replace('/* ===== FULLSCREEN MODAL ===== */', css + '\n        /* ===== FULLSCREEN MODAL ===== */')

# Change textbook-modal class
data = data.replace('<div id="textbook-modal" class="fullscreen-modal', '<div id="textbook-modal" class="slide-in-right-modal')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Changed textbook modal animation to slide-in right!")
