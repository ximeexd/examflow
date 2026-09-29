with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('// TEXTBOOK ENGINE')
with open('temp_js.txt', 'w', encoding='utf-8') as f:
    f.write(data[start:start+4000])
