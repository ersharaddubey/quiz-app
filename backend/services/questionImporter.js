const crypto = require('crypto');
const Question = require('../models/Question');
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const Syllabus = require('../models/Syllabus');

const clean = value => String(value || '').trim();
const key = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hashQuestion = value => crypto.createHash('sha256').update(key(value)).digest('hex');

function normalizeQuestion(raw, sourceName) {
  // Accept a simple canonical JSON format and common Open Trivia DB-style records.
  const options = Array.isArray(raw.options) ? raw.options :
    (raw.incorrect_answers && raw.correct_answer ? [...raw.incorrect_answers, raw.correct_answer] : []);
  let correctAnswer = raw.correctAnswer;
  if (typeof correctAnswer === 'string' && !/^\d+$/.test(correctAnswer)) {
    correctAnswer = options.findIndex(option => key(option) === key(correctAnswer));
  } else if (raw.correct_answer && !Array.isArray(raw.options)) {
    correctAnswer = options.findIndex(option => key(option) === key(raw.correct_answer));
  } else {
    correctAnswer = Number(correctAnswer);
  }

  return {
    question: clean(raw.question || raw.questionText || raw.text),
    options: options.map(clean),
    correctAnswer,
    categoryName: clean(raw.categoryName || raw.category || raw.exam || raw.examName),
    subjectName: clean(raw.subjectName || raw.subject || raw.topic || raw.subcategory),
    syllabusName: clean(raw.syllabusName || raw.syllabus || raw.chapter),
    difficulty: ['Easy', 'Medium', 'Hard'].includes(raw.difficulty) ? raw.difficulty : 'Medium',
    explanation: clean(raw.explanation || raw.solution),
    sourceId: clean(raw.id || raw.sourceId || ''),
    source: sourceName
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'ExamFoundery-QuestionImporter/1.0' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}: ${url}`);
  return response.json();
}

async function fetchGitHubSources() {
  const urls = [process.env.QUESTION_SOURCE_URLS, process.env.QUESTION_API_URLS]
    .filter(Boolean).join(',').split(',').map(v => v.trim()).filter(Boolean);
  const results = [];
  const errors = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      const list = Array.isArray(payload) ? payload : (payload.questions || payload.results || payload.data || []);
      if (!Array.isArray(list)) throw new Error('JSON must be an array or contain questions/results/data array');
      results.push({ name: url, questions: list });
    } catch (error) { errors.push(`${url}: ${error.message}`); }
  }
  return { results, errors };
}

async function fetchAiQuestions() {
  const endpoint = process.env.QUESTION_AI_API_URL;
  const apiKey = process.env.QUESTION_AI_API_KEY;
  if (!endpoint || !apiKey) return { questions: [], error: null };
  const count = Math.min(Math.max(Number(process.env.QUESTION_AI_BATCH_SIZE || 25), 1), 100);
  const prompt = `Generate ${count} original Indian competitive-exam multiple-choice questions as JSON only. Return {"questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"categoryName":"an existing exam category name","subjectName":"an existing subject name within that category","difficulty":"Easy|Medium|Hard","explanation":"brief factual explanation"}]}. Use unambiguous facts, exactly four options, zero-based correctAnswer. Do not copy known question banks. Prefer broad static GK, reasoning, mathematics, science and English; do not invent current affairs. Categories and subjects must match the application's existing database names.`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.QUESTION_AI_MODEL || 'configured-model', temperature: 0.3, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`);
  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || data.output_text || '';
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  return { questions: parsed.questions || parsed.data || [] };
}

async function existsInQuestionBank(question, questionHash) {
  const byHash = await Question.findOne({ questionHash }).select('_id').lean();
  if (byHash) return true;
  // Legacy/manual records predate questionHash; also compare normalized whitespace and case.
  const pattern = question.trim().split(/\s+/).map(escapeRegex).join('\\s+');
  const legacy = await Question.findOne({ question: new RegExp(`^\\s*${pattern}\\s*$`, 'i') }).select('_id').lean();
  return Boolean(legacy);
}

function structurallyValid(q) {
  return q.question.length >= 8 && q.question.length <= 1200 &&
    q.options.length >= 2 && q.options.length <= 6 &&
    q.options.every(option => option.length > 0 && option.length <= 500) &&
    new Set(q.options.map(key)).size === q.options.length &&
    Number.isInteger(q.correctAnswer) && q.correctAnswer >= 0 && q.correctAnswer < q.options.length &&
    q.categoryName && q.subjectName;
}

async function importQuestions({ trigger = 'github-actions' } = {}) {
  const ImportRun = require('../models/QuestionImportRun');
  const run = await ImportRun.create({ trigger });
  const errors = [];
  let fetched = 0, inserted = 0, duplicates = 0, skipped = 0;
  const sourceNames = [];
  try {
    const github = await fetchGitHubSources();
    errors.push(...github.errors);
    if (!github.results.length && !(process.env.QUESTION_AI_API_URL && process.env.QUESTION_AI_API_KEY)) {
      errors.push('No question sources configured. Set QUESTION_SOURCE_URLS and/or QUESTION_API_URLS; configure AI variables for AI generation.');
    }
    for (const source of github.results) {
      sourceNames.push(source.name);
      for (const raw of source.questions) {
        fetched++;
        const q = normalizeQuestion(raw, source.name);
        if (!structurallyValid(q)) { skipped++; continue; }
        const category = await Category.findOne({ name: new RegExp(`^${escapeRegex(q.categoryName)}$`, 'i'), isActive: true });
        if (!category) { skipped++; continue; }
        const subject = await Subject.findOne({ category: category._id, name: new RegExp(`^${escapeRegex(q.subjectName)}$`, 'i'), isActive: true });
        if (!subject) { skipped++; continue; }
        let syllabus;
        if (q.syllabusName) syllabus = await Syllabus.findOne({ category: category._id, subject: subject._id, title: new RegExp(`^${escapeRegex(q.syllabusName)}$`, 'i') });
        const questionHash = hashQuestion(q.question);
        if (await existsInQuestionBank(q.question, questionHash)) { duplicates++; continue; }
        try {
          await Question.create({ question: q.question, options: q.options, correctAnswer: q.correctAnswer,
            category: category._id, subject: subject._id, syllabus: syllabus?._id,
            categoryName: category.name, subjectName: subject.name, difficulty: q.difficulty,
            explanation: q.explanation, source: q.source, sourceId: q.sourceId,
            questionHash, autoValidated: true, verified: false, importedAt: new Date() });
          inserted++;
        } catch (error) {
          if (error.code === 11000) duplicates++;
          else { skipped++; errors.push(`Question insert: ${error.message}`); }
        }
      }
    }

    if (process.env.QUESTION_AI_API_URL && process.env.QUESTION_AI_API_KEY) {
      try {
        const ai = await fetchAiQuestions();
        sourceNames.push('ai-provider');
        for (const raw of ai.questions) {
          fetched++;
          const q = normalizeQuestion(raw, 'ai-provider');
          if (!structurallyValid(q)) { skipped++; continue; }
          const category = await Category.findOne({ name: new RegExp(`^${escapeRegex(q.categoryName)}$`, 'i'), isActive: true });
          if (!category) { skipped++; continue; }
          const subject = await Subject.findOne({ category: category._id, name: new RegExp(`^${escapeRegex(q.subjectName)}$`, 'i'), isActive: true });
          if (!subject) { skipped++; continue; }
          const questionHash = hashQuestion(q.question);
          if (await existsInQuestionBank(q.question, questionHash)) { duplicates++; continue; }
          try {
            await Question.create({ question: q.question, options: q.options, correctAnswer: q.correctAnswer,
              category: category._id, subject: subject._id, categoryName: category.name, subjectName: subject.name,
              difficulty: q.difficulty, explanation: q.explanation, source: 'ai-provider',
              questionHash, autoValidated: true, verified: false, importedAt: new Date() });
            inserted++;
          } catch (error) { if (error.code === 11000) duplicates++; else { skipped++; errors.push(`AI insert: ${error.message}`); } }
        }
      } catch (error) { errors.push(`AI source: ${error.message}`); }
    }

    const status = errors.length ? (inserted || duplicates ? 'partial' : 'failed') : 'success';
    Object.assign(run, { finishedAt: new Date(), status, fetched, inserted, duplicates, skipped, errors: errors.slice(0, 100), sources: sourceNames });
    await run.save();
    return run;
  } catch (error) {
    run.status = 'failed'; run.finishedAt = new Date(); run.errors = [...errors, error.message].slice(0, 100);
    await run.save();
    throw error;
  }
}

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

module.exports = { importQuestions, hashQuestion };
