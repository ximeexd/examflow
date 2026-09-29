import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

idx1 = data.find('const questionBank =')
idx2 = data.find('const cardsData =')
qb = data[idx1:idx2]

print('Общая база in questionBank?', '"Общая база":' in qb)
print('Length of questionBank code:', len(qb))
