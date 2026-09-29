with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('function checkAns()')
if start != -1:
    end = data.find('function nextCard', start)
    if end == -1: end = start + 3000
    with open('quiz_logic.txt', 'w', encoding='utf-8') as out:
        out.write(data[start:end])
    print("Extracted to quiz_logic.txt")
else:
    print("Not found")
