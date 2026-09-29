import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

bad_line = r'const fill = \[\.\.\.questionBank\["Общая база"\]\]\.sort'
# Replace it with safe fallback
good_line = 'let fallbackFill = questionBank["Общая база"] || Object.values(questionBank)[0] || [];\n                const fill = [...fallbackFill].sort'

data = re.sub(bad_line, good_line, data)

# Also fix the earlier line just to be clean
bad_line2 = r'if \(!pool\) pool = questionBank\["Общая база"\] \|\| Object\.values\(questionBank\)\[0\];'
good_line2 = r'if (!pool) pool = questionBank["Общая база"] || Object.values(questionBank)[0] || [];'

data = re.sub(bad_line2, good_line2, data)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Fixed the undefined spread bug!")
