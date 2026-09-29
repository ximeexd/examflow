import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# Replace QUIZ_SIZE with quizBatch.length in renderQ
old_renderQ_steps = r"document\.getElementById\('quiz-step-text'\)\.innerText = `\$\{qIdx \+ 1\}/\$\{QUIZ_SIZE\}`;[\s\n]*document\.getElementById\('quiz-progress-bar'\)\.style\.width = `\$\{let p = \(\(qIdx \+ 1\) / QUIZ_SIZE\) \* 100; ...`"
# wait, exact string is:
# document.getElementById('quiz-step-text').innerText = `${qIdx + 1}/${QUIZ_SIZE}`;
# document.getElementById('quiz-progress-bar').style.width = `${((qIdx + 1) / QUIZ_SIZE) * 100}%`;

data = data.replace("`${qIdx + 1}/${QUIZ_SIZE}`", "`${qIdx + 1}/${quizBatch.length}`")
data = data.replace("`${((qIdx + 1) / QUIZ_SIZE) * 100}%`", "`${((qIdx + 1) / quizBatch.length) * 100}%`")

# For checkAnswer:
# if (qIdx + 1 < QUIZ_SIZE) {
data = data.replace("if (qIdx + 1 < QUIZ_SIZE) {", "if (qIdx + 1 < quizBatch.length) {")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Patched quizBatch.length logic!")
