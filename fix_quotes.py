import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

data = data.replace("openModal(\\'trainer-modal\\')", "openModal('trainer-modal')")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Fixed quotes!")
