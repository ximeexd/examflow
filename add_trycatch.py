import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# Replace startLesson to wrap startDuoQuiz in a try/catch
old_startLesson = """function startLesson(id, title) {
            playSoftTap();
            activeCurriculumNode = id;
            startDuoQuiz(title);
        }"""

new_startLesson = """function startLesson(id, title) {
            try {
                playSoftTap();
                activeCurriculumNode = id;
                startDuoQuiz(title);
            } catch (err) {
                showToastMsg("Error", err.message + " | " + err.stack.split('\\n')[1], "error");
                console.error(err);
            }
        }"""

data = data.replace(old_startLesson, new_startLesson)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Injected try/catch!")
