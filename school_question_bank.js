// School-curriculum question bank for ExamFlow.
// window.SCHOOL_QUESTION_BANK[examKey][canonicalSubject][topic.key] = exactly 50
// question objects in fixed lesson order: questions[5*(lesson-1) .. 5*lesson).
// Content files register defs via window.__SCHOOL_QUESTION_DEFS BEFORE this file
// loads; the bank is materialized here deterministically at load time.
// Authoring contract per topic: def.types = 5 task-type builders; builder(lesson0..9)
// returns {q, correct, wrong:[3 unique strings], exp} or {q, opts:[4 unique], ans, exp}.
// Generators must supply four genuinely distinct options: buildQuestion validates
// string equality AND numeric equivalence of plain numeric/rational options, and
// reports every failure to window.SCHOOL_QUESTION_BANK_ERRORS.
(function () {
    'use strict';

    const EXAM_NAMES = { oge: 'ОГЭ', ege: 'ЕГЭ' };
    const PER_LESSON = 5;
    const LESSONS_PER_TOPIC = 10;
    const PER_TOPIC = PER_LESSON * LESSONS_PER_TOPIC;
    // Alias -> canonical bank subject, mirroring the compatibility aliases in
    // school_curriculum.js plus the app's existing Английский язык -> Английский.
    const SUBJECT_ALIASES = {
        oge: { 'Базовая математика': 'Математика', 'Профильная математика': 'Математика', 'Английский язык': 'Английский' },
        ege: { 'Математика': 'Базовая математика', 'Английский язык': 'Английский' }
    };

    function canonicalSubject(examKey, subject) {
        return (SUBJECT_ALIASES[examKey] && SUBJECT_ALIASES[examKey][subject]) || subject;
    }

    function normalizeTitle(value) {
        return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
    }

    function topicRecords(examKey, canonical) {
        const curricula = window.SCHOOL_CURRICULUM || {};
        return (curricula[examKey] && curricula[examKey][canonical]) || [];
    }

    function topicRecord(examKey, canonical, keyOrTitle) {
        return topicRecords(examKey, canonical).find(item => item.key === keyOrTitle || normalizeTitle(item.title) === normalizeTitle(keyOrTitle)) || null;
    }

    // Parses a whole option string as a plain number or simple fraction:
    // "21", "−3,5", "0.25", "3/4", "−1/8". Returns null for anything richer
    // (intervals, coordinates, units, expressions) so only unambiguously
    // numeric options take part in the equivalence check.
    function numericValue(text) {
        const match = String(text).trim().match(/^([−-]?\d+(?:[.,]\d+)?)(?:\/([−-]?\d+(?:[.,]\d+)?))?$/);
        if (!match) return null;
        const num = parseFloat(match[1].replace('−', '-').replace(',', '.'));
        const den = match[2] ? parseFloat(match[2].replace('−', '-').replace(',', '.')) : 1;
        if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
        return num / den;
    }

    // Four options must differ both as strings AND as values when they are
    // plain numbers/rationals (e.g. "0,5" vs "1/2" is a collision).
    function optionConflict(opts) {
        if (opts.length !== 4 || opts.some(opt => typeof opt !== 'string' || !opt.trim())) return 'варианты ответа неполные';
        if (new Set(opts).size !== 4) return 'повторяются варианты ответа';
        const values = opts.map(numericValue);
        for (let a = 0; a < 4; a++) {
            for (let b = a + 1; b < 4; b++) {
                if (values[a] !== null && values[a] === values[b]) {
                    return `эквивалентные варианты: "${opts[a]}" и "${opts[b]}"`;
                }
            }
        }
        return null;
    }

    // Builds one question object from a task-type result. Returns
    // { question } or { error } — never silently adjusts authored content.
    function buildQuestion(def, item, canonical, record, index) {
        const lesson = Math.floor(index / PER_LESSON);
        const typeIndex = index % PER_LESSON;
        if (!item || typeof item.q !== 'string' || !item.q.trim()) return { error: 'пустой текст вопроса' };
        if (typeof item.exp !== 'string' || item.exp.trim().length <= 10) return { error: 'нет содержательного пояснения' };
        let opts;
        let ans;
        if (item.opts !== undefined) {
            if (!Array.isArray(item.opts)) return { error: 'варианты ответа не массив' };
            opts = item.opts;
            if (typeof item.ans !== 'number' || !Number.isInteger(item.ans) || item.ans < 0 || item.ans > 3) return { error: 'некорректный индекс ответа' };
            ans = item.ans;
        } else {
            if ((typeof item.correct !== 'string' && typeof item.correct !== 'number') || (typeof item.correct === 'number' && !Number.isFinite(item.correct)) || (typeof item.correct === 'string' && !item.correct.trim())) return { error: 'некорректный верный ответ' };
            const correct = String(item.correct);
            if (!Array.isArray(item.wrong) || item.wrong.length !== 3 || item.wrong.some(w => (typeof w !== 'string' && typeof w !== 'number') || (typeof w === 'number' && !Number.isFinite(w)) || (typeof w === 'string' && !w.trim()))) return { error: 'ровно три непустых неверных варианта' };
            const wrongs = item.wrong;
            const wrongStrings = wrongs.map(String);
            const position = (lesson + typeIndex * 2) % 4;
            opts = [];
            let wrongIndex = 0;
            for (let slot = 0; slot < 4; slot++) {
                opts.push(slot === position ? correct : wrongStrings[wrongIndex++]);
            }
            ans = position;
        }
        const conflict = optionConflict(opts);
        if (conflict) return { error: conflict };
        return {
            question: {
                id: 'school:' + def.exam + ':' + canonical + ':' + record.key + ':q' + (index + 1),
                topicId: record.key,
                subject: canonical,
                exam: EXAM_NAMES[def.exam],
                topicKey: record.key,
                topic: record.title,
                courseTopic: record.title,
                title: record.title,
                cat: canonical,
                topicMatch: true,
                source: 'ExamFlow: авторское задание',
                q: String(item.q),
                opts,
                ans,
                exp: String(item.exp)
            }
        };
    }

    function materialize() {
        const bank = { oge: {}, ege: {} };
        const errors = window.SCHOOL_QUESTION_BANK_ERRORS = [];
        const report = (def, canonical, topicLabel, message) => {
            errors.push({ exam: def.exam, subject: canonical || def.subject, topic: topicLabel || def.topic, message });
        };
        const defsList = window.__SCHOOL_QUESTION_DEFS;
        if (typeof defsList !== 'undefined' && !Array.isArray(defsList)) {
            errors.push({ exam: '', subject: '', topic: '', message: '__SCHOOL_QUESTION_DEFS должен быть массивом' });
        }
        (Array.isArray(defsList) ? defsList : []).forEach(def => {
            if (!def || typeof def !== 'object') { errors.push({ exam: '', subject: '', topic: '', message: 'пустое описание темы' }); return; }
            const examKey = def.exam;
            const canonical = canonicalSubject(examKey, def.subject);
            if (!EXAM_NAMES[examKey]) { report(def, canonical, def.topic, 'неизвестный экзамен'); return; }
            const record = topicRecord(examKey, canonical, def.topic);
            if (!record) { report(def, canonical, def.topic, 'тема не найдена в программе'); return; }
            if (!Array.isArray(def.types) || def.types.length !== PER_LESSON) { report(def, canonical, record.title, 'нужно ровно 5 типов заданий'); return; }
            const questions = [];
            const seenPrompts = new Set();
            for (let lesson = 0; lesson < LESSONS_PER_TOPIC; lesson++) {
                for (let typeIndex = 0; typeIndex < PER_LESSON; typeIndex++) {
                    let item = null;
                    let thrown = null;
                    try { item = def.types[typeIndex](lesson); } catch (e) { thrown = e; }
                    if (!item) {
                        report(def, canonical, record.title, `урок ${lesson + 1}, тип ${typeIndex + 1}: генератор не вернул задание${thrown ? ' (' + thrown.message + ')' : ''}`);
                        continue;
                    }
                    const built = buildQuestion(def, item, canonical, record, lesson * PER_LESSON + typeIndex);
                    if (built.error) {
                        report(def, canonical, record.title, `урок ${lesson + 1}, тип ${typeIndex + 1}: ${built.error}`);
                        continue;
                    }
                    const prompt = normalizeTitle(built.question.q);
                    if (seenPrompts.has(prompt)) {
                        report(def, canonical, record.title, `урок ${lesson + 1}, тип ${typeIndex + 1}: повтор формулировки вопроса`);
                        continue;
                    }
                    seenPrompts.add(prompt);
                    questions.push(built.question);
                }
            }
            // A topic is registered only when the full fixed 10x5 grid exists.
            if (questions.length === PER_TOPIC) {
                bank[examKey][canonical] = bank[examKey][canonical] || {};
                bank[examKey][canonical][record.key] = questions;
            } else {
                report(def, canonical, record.title, `тема не собрана: ${questions.length}/${PER_TOPIC} вопросов`);
            }
        });
        return bank;
    }

    const bank = materialize();
    window.SCHOOL_QUESTION_BANK = bank;

    function cloneForCaller(question, callerSubject, examKey) {
        // Identity (id, topicId, topic) stays canonical; subject/cat follow the
        // caller's requested (possibly alias) subject so mastery/history keys stay
        // consistent with the rest of the app.
        return {
            ...question,
            opts: [...question.opts],
            subject: callerSubject,
            cat: callerSubject,
            exam: EXAM_NAMES[examKey]
        };
    }

    // Exactly 5 fixed questions for lesson 1..10 of a filled curriculum topic.
    // Returns null for an unknown exam/subject/key or an invalid lesson number.
    window.getSchoolLessonQuestions = function getSchoolLessonQuestions(examKey, subject, topicKey, lessonNumber) {
        if (!EXAM_NAMES[examKey] || !Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > LESSONS_PER_TOPIC) return null;
        const canonical = canonicalSubject(examKey, subject);
        const questions = bank[examKey] && bank[examKey][canonical] ? bank[examKey][canonical][topicKey] : null;
        if (!questions || questions.length !== PER_TOPIC) return null;
        return questions.slice((lessonNumber - 1) * PER_LESSON, lessonNumber * PER_LESSON)
            .map(question => cloneForCaller(question, subject, examKey));
    };

    // All 50 questions of a filled topic, found by exact exam/subject/topic title.
    // Used by free practice; returns null when the topic has no authored coverage.
    window.getSchoolTopicQuestions = function getSchoolTopicQuestions(examKey, subject, topicTitle) {
        if (!EXAM_NAMES[examKey]) return null;
        const canonical = canonicalSubject(examKey, subject);
        const record = topicRecord(examKey, canonical, topicTitle);
        if (!record) return null;
        const questions = bank[examKey] && bank[examKey][canonical] ? bank[examKey][canonical][record.key] : null;
        if (!questions || questions.length !== PER_TOPIC) return null;
        return questions.map(question => cloneForCaller(question, subject, examKey));
    };

    window.getCanonicalSchoolSubject = canonicalSubject;
})();
