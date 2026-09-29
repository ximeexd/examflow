import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

scripts = re.findall(r'<script>(.*?)</script>', data, flags=re.DOTALL)
for i, s in enumerate(scripts):
    with open(f'debug_script_{i}.js', 'w', encoding='utf-8') as fOut:
        fOut.write(s)

print("Dumped scripts. Number of scripts:", len(scripts))
