import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('<div id="textbook-modal"')
end = data.find('<!-- TRAINER MODAL')
if end == -1: end = data.find('<!-- QUIZ SCREEN')

print(data[start:end])
