with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

print('trainer modal div exists:', 'id="trainer-modal"' in data)
