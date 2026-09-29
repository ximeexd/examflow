import re
with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

matches = re.findall(r'.{0,60}Тренаж[ёе]р.{0,60}', data, flags=re.IGNORECASE)
with open('matches.txt', 'w', encoding='utf-8') as f:
    for m in matches:
        f.write(m + "\n")
