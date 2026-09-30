import re

with open('temp_check.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Try to find common syntax errors or unbalanced braces
code_no_strings = re.sub(r'\"(?:\\.|[^\\\"])*\"|\'(?:\\.|[^\\\'])*\'|\`(?:\\.|[^\\\`])*\`', '', code)
code_no_comments = re.sub(r'//.*?\n|/\*.*?\*/', '', code_no_strings, flags=re.DOTALL)

print('Braces {}:', code_no_comments.count('{'), code_no_comments.count('}'))
print('Parentheses ():', code_no_comments.count('('), code_no_comments.count(')'))
print('Brackets []:', code_no_comments.count('['), code_no_comments.count(']'))

