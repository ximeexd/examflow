import re
with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

bgs = list(set(re.findall(r'style="[^"]*background:[^"]*"', data)))
for b in bgs:
    print(b[:100])
