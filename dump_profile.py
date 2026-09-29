with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('id="view-profile"')
print(data[start:start+4000][-500:])
