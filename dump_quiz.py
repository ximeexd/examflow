with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('<!-- QUIZ SCREEN -->')
with open('temp_output.txt', 'w', encoding='utf-8') as f:
    f.write(data[max(0, start-400):start+200])
