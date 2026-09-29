with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

print("view-tasks:", "view-tasks" in data)
print("view-leagues:", "view-leagues" in data)
print("view-profile:", "view-profile" in data)
