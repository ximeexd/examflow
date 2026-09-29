import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

data = data.replace('        </div> <!-- END HOME VIEW -->', '        </div>\n        </div> <!-- END HOME VIEW -->')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Balanced!")
