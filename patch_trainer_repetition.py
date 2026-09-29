import re

with open('index.html', 'r', encoding='utf-8') as f:
    data = f.read()

# Replace getQuestions logic
old_getq = r'getQuestions: \(topic, count\) => {\s*let qs = \[\];\s*for \(let i = 0; i < count; i\+\+\) {\s*if \(topic\.includes\("Уравнения"\) \|\| topic\.includes\("Алгебра"\)\) qs\.push\(ProceduralEngine\.math_equations\(\)\);\s*else if \(topic\.includes\("Вероятност"\) \|\| topic\.includes\("Статистика"\)\) qs\.push\(ProceduralEngine\.math_probability\(\)\);\s*else if \(topic\.includes\("Числа"\) \|\| topic\.includes\("Вычисления"\) \|\| topic\.includes\("Степени"\)\) qs\.push\(ProceduralEngine\.math_numbers\(\)\);\s*else if \(topic\.includes\("Системы"\) \|\| topic\.includes\("Кодирование"\) \|\| topic\.includes\("Информатика"\)\) qs\.push\(ProceduralEngine\.info_systems\(\)\);\s*else if \(topic\.includes\("Орфоэпия"\) \|\| topic\.includes\("Русский"\)\) qs\.push\(ProceduralEngine\.rus_accents\(\)\);\s*}\s*return qs\.length > 0 \? qs : null;\s*}'

new_getq = """getQuestions: (topic, count) => {
                let qs = [];
                for (let i = 0; i < count; i++) {
                    let q = null;
                    if (topic.includes("Уравнения") || topic.includes("Алгебра")) { q = ProceduralEngine.math_equations(); q.genTopic = "Алгебра"; }
                    else if (topic.includes("Вероятност") || topic.includes("Статистика")) { q = ProceduralEngine.math_probability(); q.genTopic = "Вероятность"; }
                    else if (topic.includes("Числа") || topic.includes("Вычисления") || topic.includes("Степени")) { q = ProceduralEngine.math_numbers(); q.genTopic = "Числа"; }
                    else if (topic.includes("Системы") || topic.includes("Кодирование") || topic.includes("Информатика")) { q = ProceduralEngine.info_systems(); q.genTopic = "Информатика"; }
                    else if (topic.includes("Орфоэпия") || topic.includes("Русский")) { q = ProceduralEngine.rus_accents(); q.genTopic = "Русский"; }
                    
                    // Fallback to random if not found but generic topic asked
                    if (!q && (topic.includes("Математика") || topic.includes("Общая"))) {
                        const fallbacks = [ProceduralEngine.math_equations, ProceduralEngine.math_probability, ProceduralEngine.math_numbers];
                        q = fallbacks[ProceduralEngine.randomInt(0, fallbacks.length - 1)]();
                        q.genTopic = "Математика";
                    }
                    if (!q && topic.includes("Обществознание")) {
                        q = {
                            q: "Какая экономическая система характеризуется свободой ценообразования?",
                            opts: ["Рыночная", "Традиционная", "Командная", "Смешанная"],
                            ans: 0,
                            title: "Обществознание",
                            genTopic: "Обществознание"
                        };
                    }
                    if (q) qs.push(q);
                }
                return qs.length > 0 ? qs : null;
            }"""

data = re.sub(old_getq, new_getq, data)

# Modify checkAnswer to push the failed question, AND a similar one
old_check = r'quizBatch\.push\(cur\);\s*showToastMsg\(\'Упс!\', \'Это задание вернётся позже для закрепления\.\', \'error\'\);'

new_check = """// Push exact failed question to end
                quizBatch.push({...cur}); 
                
                // Add a similar question if we know the topic
                if (cur.genTopic && ProceduralEngine) {
                    let similar = ProceduralEngine.getQuestions(cur.genTopic, 1);
                    if (similar && similar.length > 0) {
                        quizBatch.push(similar[0]);
                    }
                } else if (cur.title) {
                    // Fallback: get questions from questionBank matching title
                    if (typeof questionBank !== 'undefined') {
                        let pool = null;
                        for (let k in questionBank) {
                            if (cur.title.includes(k) || k.includes(cur.title)) {
                                pool = questionBank[k];
                                break;
                            }
                        }
                        if (pool && pool.length > 0) {
                            let randomSimilar = pool[Math.floor(Math.random() * pool.length)];
                            quizBatch.push({...randomSimilar});
                        }
                    }
                }
                
                showToastMsg('Упс!', 'Это задание и похожее на него вернутся позже.', 'error');"""

data = re.sub(old_check, new_check, data)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(data)

print("Patched trainer repetition logic!")
