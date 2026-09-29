with open('debug_script_0.js', 'r', encoding='utf-8') as f:
    js = f.read()

def check_braces(text):
    stack = []
    lines = text.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char == '{':
                stack.append(('{', i+1))
            elif char == '}':
                if not stack:
                    return f"Unmatched }} on line {i+1}"
                stack.pop()
    if stack:
        return f"Unmatched {{ from line {stack[-1][1]}"
    return "Braces OK"

print(check_braces(js))
