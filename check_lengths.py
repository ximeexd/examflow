with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start1 = data.find('id="view-tasks"')
print("Tasks content:", len(data[start1:data.find('id="view-leagues"')]))

start2 = data.find('id="view-leagues"')
print("Leagues content:", len(data[start2:data.find('id="view-profile"')]))

start3 = data.find('id="view-profile"')
print("Profile content:", len(data[start3:data.find('</main>')]))
