import re
with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

start = data.find('function startDuoQuiz')
end = data.find('const cardsData')
with open('duo_quiz.txt', 'w', encoding='utf-8') as f:
    f.write(data[start:end])
