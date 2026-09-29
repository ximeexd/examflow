import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

old_fill = r"""            // Shuffle and pick
            quizBatch = \[\.\.\.pool\]\.sort\(\(\) => Math\.random\(\) - 0\.5\)\.slice\(0, QUIZ_SIZE\);
            // If the pool has less than QUIZ_SIZE, fill the rest from General
            if \(quizBatch\.length < QUIZ_SIZE\) \{
                let fallbackFill = pool && pool\.length > 0 \? pool : \(questionBank\[state\.activeSyllabusSubject \+ " \(Общая\)"\] \|\| questionBank\["Общая база"\] \|\| Object\.values\(questionBank\)\[0\] \|\| \[\]\);
                const fill = \[\.\.\.fallbackFill\]\.sort\(\(\) => Math\.random\(\) - 0\.5\)\.slice\(0, QUIZ_SIZE - quizBatch\.length\);
                quizBatch = quizBatch\.concat\(fill\);
            \}"""

new_fill = r"""            // Shuffle and pick
            quizBatch = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(QUIZ_SIZE, pool.length));
            if (quizBatch.length === 0) {
                let fallbackFill = questionBank[state.activeSyllabusSubject + " (Общая)"] || questionBank["Общая база"] || Object.values(questionBank)[0] || [];
                quizBatch = [...fallbackFill].sort(() => Math.random() - 0.5).slice(0, Math.min(QUIZ_SIZE, fallbackFill.length));
            }
"""

data = re.sub(old_fill, new_fill, data)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Updated fill logic!")
