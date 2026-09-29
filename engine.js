const ProceduralEngine = {
            randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
            
            math_equations: () => {
                let a = ProceduralEngine.randomInt(2, 9);
                let x = ProceduralEngine.randomInt(-10, 10);
                let b = ProceduralEngine.randomInt(-20, 20);
                let c = a * x + b;
                let sign = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
                let q = `Решите уравнение: ${a}x ${sign} = ${c}`;
                
                let wrong1 = x + ProceduralEngine.randomInt(1, 3);
                let wrong2 = x - ProceduralEngine.randomInt(1, 4);
                let wrong3 = -x;
                if (wrong3 === x) wrong3 = x + 5;
                
                let opts = [x.toString(), wrong1.toString(), wrong2.toString(), wrong3.toString()].sort(() => Math.random() - 0.5);
                let ans = opts.indexOf(x.toString());
                return { q, title: "ФИПИ: Алгебра (Уравнения)", cat: "Математика", opts, ans, exp: `${a}x = ${c} ${b >= 0 ? '-' : '+'} ${Math.abs(b)} \n${a}x = ${c - b} \nx = ${x}` };
            },

            math_probability: () => {
                let total = ProceduralEngine.randomInt(10, 30);
                let target = ProceduralEngine.randomInt(2, total - 5);
                let q = `В партии из ${total} деталей ${target} бракованных. Какова вероятность того, что случайно выбранная деталь окажется бракованной? (округлите до сотых)`;
                let ansVal = (target / total).toFixed(2);
                let w1 = ((target+1)/total).toFixed(2);
                let w2 = (target/(total+1)).toFixed(2);
                let w3 = (1 - (target/total)).toFixed(2);
                
                let opts = [ansVal, w1, w2, w3].sort(() => Math.random() - 0.5);
                let ans = opts.indexOf(ansVal);
                return { q, title: "ФИПИ: Теория вероятностей", cat: "Математика", opts, ans, exp: `Вероятность P = m/n, где m = ${target} (брак), n = ${total} (всего). P = ${target}/${total} ≈ ${ansVal}` };
            },

            math_numbers: () => {
                let base = ProceduralEngine.randomInt(2, 9);
                let exp1 = ProceduralEngine.randomInt(3, 7);
                let exp2 = ProceduralEngine.randomInt(1, exp1 - 1);
                let q = `Найдите значение выражения: (${base}^${exp1}) / (${base}^${exp2})`;
                let ansVal = Math.pow(base, exp1 - exp2).toString();
                let opts = [ansVal, Math.pow(base, exp1).toString(), Math.pow(base, exp1+exp2).toString(), (base*(exp1-exp2)).toString()].sort(() => Math.random() - 0.5);
                return { q, title: "ФИПИ: Степени и корни", cat: "Математика", opts, ans: opts.indexOf(ansVal), exp: `При делении степеней с одинаковым основанием показатели вычитаются: ${exp1} - ${exp2} = ${exp1-exp2}. ${base}^${exp1-exp2} = ${ansVal}` };
            },

            info_systems: () => {
                let n = ProceduralEngine.randomInt(10, 60);
                let bin = n.toString(2);
                let q = `Переведите число ${n} из десятичной системы счисления в двоичную.`;
                let opts = [bin, (n+1).toString(2), (n-1).toString(2), parseInt(bin.split('').reverse().join(''), 2).toString(2)].sort(() => Math.random() - 0.5);
                return { q, title: "ФИПИ: Системы счисления", cat: "Информатика", opts, ans: opts.indexOf(bin), exp: `Перевод числа ${n} в двоичную систему даёт ${bin}.` };
            },

            rus_accents: () => {
                const words = [
                    {w: "звОнит", trueW: "звонИт", w1: "звОнит", w2: "звонитЕ", desc: "Ударение всегда падает на И: звонИт, позвонИт."},
                    {w: "катАлог", trueW: "каталОг", w1: "кАталог", w2: "катАлог", desc: "Слово заимствованное, ударение на последний слог."},
                    {w: "тОрты", trueW: "тОрты", w1: "тортЫ", w2: "тОрта", desc: "Ударение неподвижное, на первый слог (как в слове тОрт)."},
                    {w: "красивЕе", trueW: "красИвее", w1: "красивЕе", w2: "крАсивее", desc: "Сравнительная степень от красИвый."},
                    {w: "баловАть", trueW: "баловАть", w1: "бАловать", w2: "баловатЬ", desc: "Глагол, ударение на А."}
                ];
                let item = words[ProceduralEngine.randomInt(0, words.length - 1)];
                let q = `В каком варианте верно указано ударение?`;
                let opts = [item.trueW, item.w1, item.w2, "Все неверны"].sort(() => Math.random() - 0.5);
                return { q, title: "ФИПИ: Орфоэпия", cat: "Русский язык", opts, ans: opts.indexOf(item.trueW), exp: item.desc };
            },

            getQuestions: (topic, count) => {
                let qs = [];
                for (let i = 0; i < count; i++) {
                    if (topic.includes("Уравнения") || topic.includes("Алгебра")) qs.push(ProceduralEngine.math_equations());
                    else if (topic.includes("Вероятност") || topic.includes("Статистика")) qs.push(ProceduralEngine.math_probability());
                    else if (topic.includes("Числа") || topic.includes("Вычисления") || topic.includes("Степени")) qs.push(ProceduralEngine.math_numbers());
                    else if (topic.includes("Системы") || topic.includes("Кодирование") || topic.includes("Информатика")) qs.push(ProceduralEngine.info_systems());
                    else if (topic.includes("Орфоэпия") || topic.includes("Русский")) qs.push(ProceduralEngine.rus_accents());
                }
                return qs.length > 0 ? qs : null;
            }
        };