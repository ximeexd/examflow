with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('id="view-tasks"')
print("VIEW TASKS:\n", data[start-10:start+300])

start = data.find('id="view-leagues"')
print("\nVIEW LEAGUES:\n", data[start-10:start+300])

start = data.find('id="view-profile"')
print("\nVIEW PROFILE:\n", data[start-10:start+300])
