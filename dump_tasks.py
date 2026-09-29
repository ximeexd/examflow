with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('id="view-tasks"')
print(data[start:start+750])
