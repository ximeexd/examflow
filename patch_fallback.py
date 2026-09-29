import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

old_fallback = r"""            if \(!pool\) \{
                for \(let k in questionBank\) \{
                    if \(rawTopic\.includes\(k\) \|\| k\.includes\(rawTopic\)\) \{
                        pool = questionBank\[k\];
                        break;
                    \}
                \}
            \}
            if \(!pool\) pool = questionBank\["Общая база"\] \|\| Object\.values\(questionBank\)\[0\] \|\| \[\];"""

new_fallback = r"""            if (!pool) {
                for (let k in questionBank) {
                    if (rawTopic.includes(k) || k.includes(rawTopic)) {
                        pool = questionBank[k];
                        break;
                    }
                }
            }
            if (!pool && state.activeSyllabusSubject) {
                let subjBase = state.activeSyllabusSubject + " (Общая)";
                pool = questionBank[subjBase];
            }
            if (!pool) {
                let subj = state.activeSyllabusSubject || "";
                if (subj.includes("\u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0430")) pool = questionBank["Математика (Общая)"];
            }
            if (!pool) pool = questionBank["Общая база"] || Object.values(questionBank)[0] || [];"""

data = re.sub(old_fallback, lambda m: new_fallback, data, flags=re.DOTALL)

old_fill = r'let fallbackFill = questionBank\["Общая база"\] \|\| Object\.values\(questionBank\)\[0\] \|\| \[\];'
new_fill = r'let fallbackFill = pool && pool.length > 0 ? pool : (questionBank[state.activeSyllabusSubject + " (Общая)"] || questionBank["Общая база"] || Object.values(questionBank)[0] || []);'

data = re.sub(old_fill, lambda m: new_fill, data)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Updated fallback logic!")
