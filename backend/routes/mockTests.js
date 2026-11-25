const express = require('express');
const router = express.Router();
const MockTest = require('../models/MockTest');
const Question = require('../models/Question');
const auth = require('../middleware/auth');
const studentAuth = require('../middleware/studentAuth');
const MockTestAttempt = require('../models/MockTestAttempt');
const MockTestSession = require('../models/MockTestSession');

function safeQuestion(question) {
  const item = question.toObject ? question.toObject() : question;
  delete item.correctAnswer;
  return item;
}

router.get('/', async (req, res) => {
  try {
    const filter = { isPublished: true };
    if (req.query.category) filter.category = req.query.category;
    const tests = await MockTest.find(filter).populate('category', 'name').select('-questions').sort({ createdAt: -1 }).lean();
    res.json(tests);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/admin/all', auth, async (req, res) => {
  try { res.json(await MockTest.find().populate('category', 'name').sort({ createdAt: -1 }).lean()); }
  catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const test = await MockTest.findOne({ _id: req.params.id, isPublished: true }).populate('category', 'name');
    if (!test) return res.status(404).json({ message: 'Mock test not found' });
    const questions = await Question.find({ _id: { $in: test.questions } }).populate('category', 'name').populate('subject', 'name');
    const ordered = test.questions.map(id => questions.find(q => String(q._id) === String(id))).filter(Boolean).map(safeQuestion);
    res.json({ ...test.toObject(), questions: ordered });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.post('/:id/submit', studentAuth, async (req, res) => {
  try {
    const test = await MockTest.findOne({ _id: req.params.id, isPublished: true });
    if (!test) return res.status(404).json({ message: 'Mock test not found' });
    const { sessionId, answers = {} } = req.body;
    if (!sessionId || !answers || typeof answers !== 'object' || Array.isArray(answers)) return res.status(400).json({ message: 'A valid session and answers object are required' });
    const session = await MockTestSession.findOne({ _id: sessionId, test: test._id, student: req.student._id, status: 'active' });
    if (!session) return res.status(409).json({ message: 'Mock test session is invalid, expired or already submitted. Start a new attempt.' });
    const now = new Date();
    if (now > session.expiresAt) {
      session.status = 'expired'; await session.save();
      return res.status(410).json({ message: 'Time is over. This mock test session has expired.' });
    }
    const questions = await Question.find({ _id: { $in: test.questions } }).select('correctAnswer options');
    const byId = new Map(questions.map(q => [String(q._id), q]));
    let correct = 0, wrong = 0, unanswered = 0;
    const wrongQuestionIds = [];
    const normalizedAnswers = {};
    for (const id of test.questions.map(String)) {
      const q = byId.get(id);
      const value = answers[id];
      if (!q || value === undefined || value === null || value === '') { unanswered++; continue; }
      const selected = Number(value);
      if (!Number.isInteger(selected) || selected < 0 || selected >= q.options.length) { unanswered++; continue; }
      normalizedAnswers[id] = selected;
      if (selected === q.correctAnswer) correct++;
      else { wrong++; wrongQuestionIds.push(id); }
    }
    const score = Math.round((correct * test.marksPerQuestion - wrong * test.negativeMarksPerWrong) * 100) / 100;
    const maxMarks = test.questions.length * test.marksPerQuestion;
    const attempted = correct + wrong;
    const accuracy = attempted ? Math.round(correct / attempted * 10000) / 100 : 0;
    const attempt = await MockTestAttempt.create({ student: req.student._id, test: test._id, answers: normalizedAnswers, correct, wrong, unanswered, score, maxMarks, accuracy, wrongQuestionIds });
    session.status = 'submitted'; session.submittedAt = now; await session.save();
    res.status(201).json({ attemptId: attempt._id, total: test.questions.length, correct, wrong, unanswered, score, maxMarks, accuracy });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const payload = { ...req.body, questions: Array.isArray(req.body.questions) ? req.body.questions : [] };
    if (!payload.questions.length) return res.status(400).json({ message: 'At least one question is required' });
    if (new Set(payload.questions.map(String)).size !== payload.questions.length) return res.status(400).json({ message: 'Duplicate question IDs are not allowed' });
    const count = await Question.countDocuments({ _id: { $in: payload.questions } });
    if (count !== new Set(payload.questions.map(String)).size) return res.status(400).json({ message: 'One or more question IDs are invalid' });
    const test = await MockTest.create(payload);
    res.status(201).json(test);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const payload = { ...req.body, updatedAt: new Date() };
    if (payload.questions) {
      const count = await Question.countDocuments({ _id: { $in: payload.questions } });
      if (count !== new Set(payload.questions.map(String)).size) return res.status(400).json({ message: 'One or more question IDs are invalid' });
    }
    const test = await MockTest.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!test) return res.status(404).json({ message: 'Mock test not found' });
    res.json(test);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const test = await MockTest.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Mock test not found' });
    res.json({ message: 'Mock test deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
module.exports = router;
