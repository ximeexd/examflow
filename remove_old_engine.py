import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# The old engine code starts with `let currentTextbookLevel = 'subjects';`
# and ends with `function getSubjectIcon(subj) { ... }`
# Let's find it.
start_str = "let currentTextbookLevel = 'subjects';"
end_str = "return '📘';\n        }"

start_idx = data.find(start_str)
end_idx = data.find(end_str)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_str)
    # We should also remove any extra whitespace or comments around it
    data = data[:start_idx] + data[end_idx:]

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(data)
    print("Removed old textbook engine!")
else:
    print("Could not find old textbook engine bounds.", start_idx, end_idx)
