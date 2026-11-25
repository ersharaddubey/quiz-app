const crypto = require('crypto');
const Question = require('../models/Question');
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const Syllabus = require('../models/Syllabus');

const clean = value => decodeText(String(value == null ? '' : value)).trim();
const key = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hashQuestion = value => crypto.createHash('sha256').update(key(value)).digest('hex');

function decodeText(value) {
  let text = String(value == null ? '' : value);
  try { if (/%[0-9a-f]{2}/i.test(text)) text = decodeURIComponent(text); } catch (_) {}
  return text
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function subjectForTriviaCategory(category) {
  const c = key(category);
  if (c.includes('history')) return 'History';
  if (c.includes('geography')) return 'Geography';
  if (c.includes('politics')) return 'Polity';
  if (c.includes('computer')) return 'Computer Awareness';
  if (c.includes('mathematics')) return 'Quantitative Aptitude';
  if (c.includes('science') || c.includes('nature')) return 'General Science';
  return 'General Knowledge';
}

function normalizeQuestion(raw, sourceName) {
  const isOpenTrivia = Array.isArray(raw.incorrect_answers) && raw.correct_answer != null;
  let options = Array.isArray(raw.options) ? raw.options.slice() :
    (isOpenTrivia ? [...raw.incorrect_answers, raw.correct_answer] : []);
  let correctAnswer = raw.correctAnswer;
  if (isOpenTrivia) {
    const correct = clean(raw.correct_answer);
    // Shuffle the choices so the correct option is not always in the final position.
    for (let i = options.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [options[i], options[j]] = [options[j], options[i]];
    }
    correctAnswer = options.findIndex(option => key(option) === key(correct));
  } else if (typeof correctAnswer === 'string' && !/^\d+$/.test(correctAnswer)) {
    correctAnswer = options.findIndex(option => key(option) === key(correctAnswer));
  } else if (raw.correct_answer && !Array.isArray(raw.options)) {
    correctAnswer = options.findIndex(option => key(option) === key(raw.correct_answer));
  } else {
    correctAnswer = Number(correctAnswer);
  }

  const triviaCategory = clean(raw.category || '');
  const defaultCategory = clean(process.env.QUESTION_DEFAULT_CATEGORY || 'SSC');
  return {
    question: clean(raw.question || raw.questionText || raw.text),
    options: options.map(clean),
    correctAnswer,
    // Open Trivia DB is general trivia, not an exam-specific PYQ bank. It is
    // deliberately placed in one configured general-practice exam category.
    categoryName: clean(raw.categoryName || raw.exam || raw.examName || (isOpenTrivia ? defaultCategory : raw.category)),
    subjectName: clean(raw.subjectName || raw.subject || raw.topic || raw.subcategory || (isOpenTrivia ? subjectForTriviaCategory(triviaCategory) : '')),
    syllabusName: clean(raw.syllabusName || raw.syllabus || raw.chapter),
    difficulty: normalizeDifficulty(raw.difficulty),
    explanation: clean(raw.explanation || raw.solution || ''),
    sourceId: clean(raw.id || raw.sourceId || ''),
    source: sourceName,
  };
}

function normalizeDifficulty(value) {
  const v = clean(value).toLowerCase();
  if (v === 'easy') return 'Easy';
  if (v === 'hard') return 'Hard';
  return 'Medium';
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'ExamFoundery-QuestionImporter/1.1' },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}: ${url}`);
  return response.json();
}

function extractQuestionList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.questions)) return payload.questions;
  if (Array.isArray(payload.results)) return payload.results; // Open Trivia DB
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  throw new Error('JSON response must be an array or contain questions/results/data/items array');
}

async function fetchQuestionSources() {
  const urls = [process.env.QUESTION_SOURCE_URLS, process.env.QUESTION_API_URLS]
    .filter(Boolean).join(',').split(',').map(v => v.trim()).filter(Boolean);
  const results = [];
  const errors = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      if (payload.response_code && payload.response_code !== 0) {
        throw new Error(`Open Trivia DB response_code ${payload.response_code}`);
      }
      results.push({ name: url, questions: extractQuestionList(payload) });
    } catch (error) { errors.push(`${url}: ${error.message}`); }
  }
  return { results, errors };
}

async function fetchAiQuestions() {
  const endpoint = process.env.QUESTION_AI_API_URL;
  const apiKey = process.env.QUESTION_AI_API_KEY;
  if (!endpoint || !apiKey) return { questions: [], error: null };

  // Give the model the real category/subject pairs from MongoDB. This avoids
  // guessed names and lets one import fill the existing exam sections.
  const categories = await Category.find({ isActive: true }).select('_id name').lean();
  const subjects = await Subject.find({ isActive: true }).select('name category').lean();
  const categoryById = new Map(categories.map(c => [String(c._id), c.name]));
  const pairs = subjects
    .filter(s => categoryById.has(String(s.category)))
    .map(s => ({ categoryName: categoryById.get(String(s.category)), subjectName: s.name }));
  if (!pairs.length) throw new Error('No active category/subject pairs found. Seed the existing categories and subjects first.');

  const count = Math.min(Math.max(Number(process.env.QUESTION_AI_BATCH_SIZE || 25), 1), 60);
  const prompt = `Create ${count} original multiple-choice practice questions for Indian competitive exams. Return JSON only: {"questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"categoryName":"EXACT CATEGORY","subjectName":"EXACT SUBJECT","difficulty":"Easy|Medium|Hard","explanation":"brief explanation"}]}.\n\nUse ONLY these exact existing category/subject pairs (copy names exactly):\n${JSON.stringify(pairs)}\n\nDistribute questions across different categories and subjects, prioritizing UPSC, SSC, Banking, Railways, Defence and State PSC. Use Indian exam-relevant static facts, maths, reasoning, English, science, polity, history, geography and economy. Do not create current-affairs claims or claim these are previous-year questions. Exactly four distinct options; correctAnswer is zero-based. Do not add markdown.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.QUESTION_AI_MODEL,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || data.output_text || '';
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  return { questions: extractQuestionList(parsed) };
}

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function structurallyValid(q) {
  return q.question.length >= 8 && q.question.length <= 1200 &&
    q.options.length >= 2 && q.options.length <= 6 &&
    q.options.every(option => option.length > 0 && option.length <= 500) &&
    new Set(q.options.map(key)).size === q.options.length &&
    Number.isInteger(q.correctAnswer) && q.correctAnswer >= 0 && q.correctAnswer < q.options.length &&
    q.categoryName && q.subjectName;
}

async function existsInQuestionBank(question, questionHash) {
  const byHash = await Question.findOne({ questionHash }).select('_id').lean();
  if (byHash) return true;
  const pattern = question.trim().split(/\s+/).map(escapeRegex).join('\\s+');
  const legacy = await Question.findOne({ question: new RegExp(`^\\s*${pattern}\\s*$`, 'i') }).select('_id').lean();
  return Boolean(legacy);
}

async function saveQuestion(raw, sourceName, stats, errors) {
  stats.fetched++;
  const q = normalizeQuestion(raw, sourceName);
  if (!structurallyValid(q)) { stats.skipped++; return; }

  const category = await Category.findOne({ name: new RegExp(`^${escapeRegex(q.categoryName)}$`, 'i'), isActive: true });
  if (!category) { stats.skipped++; return; }
  const subject = await Subject.findOne({ category: category._id, name: new RegExp(`^${escapeRegex(q.subjectName)}$`, 'i'), isActive: true });
  if (!subject) { stats.skipped++; return; }
  let syllabus;
  if (q.syllabusName) syllabus = await Syllabus.findOne({ category: category._id, subject: subject._id, title: new RegExp(`^${escapeRegex(q.syllabusName)}$`, 'i') });

  const questionHash = hashQuestion(q.question);
  if (await existsInQuestionBank(q.question, questionHash)) { stats.duplicates++; return; }
  try {
    await Question.create({
      question: q.question, options: q.options, correctAnswer: q.correctAnswer,
      category: category._id, subject: subject._id, syllabus: syllabus?._id,
      categoryName: category.name, subjectName: subject.name, difficulty: q.difficulty,
      explanation: q.explanation, source: sourceName, sourceId: q.sourceId,
      questionHash, autoValidated: true, verified: false, importedAt: new Date(),
    });
    stats.inserted++;
  } catch (error) {
    if (error.code === 11000) stats.duplicates++;
    else { stats.skipped++; errors.push(`Question insert: ${error.message}`); }
  }
}

async function importQuestions({ trigger = 'github-actions' } = {}) {
  const ImportRun = require('../models/QuestionImportRun');
  const run = await ImportRun.create({ trigger });
  const errors = [];
  const stats = { fetched: 0, inserted: 0, duplicates: 0, skipped: 0 };
  const sourceNames = [];
  try {
    const sources = await fetchQuestionSources();
    errors.push(...sources.errors);
    for (const source of sources.results) {
      sourceNames.push(source.name);
      for (const raw of source.questions) await saveQuestion(raw, source.name, stats, errors);
    }

    if (process.env.QUESTION_AI_API_URL && process.env.QUESTION_AI_API_KEY && process.env.QUESTION_AI_MODEL) {
      try {
        const ai = await fetchAiQuestions();
        sourceNames.push('ai-provider');
        for (const raw of ai.questions) await saveQuestion(raw, 'ai-provider', stats, errors);
      } catch (error) { errors.push(`AI source: ${error.message}`); }
    }

    if (!sourceNames.length && !errors.length) errors.push('No question sources configured. Set QUESTION_API_URLS and/or QUESTION_SOURCE_URLS; configure all three AI variables to enable AI generation.');
    const status = errors.length ? (stats.inserted || stats.duplicates ? 'partial' : 'failed') : 'success';
    Object.assign(run, { finishedAt: new Date(), status, ...stats, errors: errors.slice(0, 100), sources: sourceNames });
    await run.save();
    return run;
  } catch (error) {
    run.status = 'failed'; run.finishedAt = new Date(); run.errors = [...errors, error.message].slice(0, 100);
    await run.save();
    throw error;
  }
}

module.exports = { importQuestions, hashQuestion, normalizeQuestion, extractQuestionList, subjectForTriviaCategory };
