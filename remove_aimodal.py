import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# 1. Remove ai-modal
ai_modal_regex = r'<!-- AI MODAL -->.*?<!-- QUIZ SCREEN -->'
data = re.sub(ai_modal_regex, '<!-- QUIZ SCREEN -->', data, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("AI modal removed!")
