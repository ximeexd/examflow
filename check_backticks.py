with open('debug_script_0.js', 'r', encoding='utf-8') as f:
    js = f.read()

print('Length:', len(js))
print('Backticks:', js.count('`'))
