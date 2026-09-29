import re

with open('topics.json', 'r', encoding='utf-8') as f:
    data = f.read()

math_block = re.search(r'"Математика":\s*\[(.*?)\]', data, re.DOTALL)
if math_block:
    print("Math topics:", math_block.group(1))
else:
    print("Math not found")
