const express = require('express');
const router = express.Router();
const MockTest = require('../models/MockTest');
const Question = require('../models/Question');
const auth = require('../middleware/auth');
const studentAuth = require('../middleware/studentAuth');
const MockTestAttempt = require('../models/MockTestAttempt');
const MockTestSession = require('../models/MockTestSession');
const { scoreMockTest } = require('../services/mockTestScoring');

function safeQuestion(question) {
  const item = question.toObject ? question.toObject() : { ...question };
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
    if (!Array.isArray(test.questions) || test.questions.length === 0) {
      return res.status(409).json({ message: 'This mock test has no questions yet' });
    }
    const questions = await Question.find({ _id: { $in: test.questions } }).populate('category', 'name').populate('subject', 'name');
    const ordered = test.questions.map(id => questions.find(q => String(q._id) === String(id))).filter(Boolean).map(safeQuestion);
    if (!ordered.length) return res.status(409).json({ message: 'No available questions are assigned to this mock test' });
    res.json({ ...test.toObject(), questions: ordered });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.post('/:id/submit', studentAuth, async (req, res) => {
  let claimedSessionId;
  try {
    const test = await MockTest.findOne({ _id: req.params.id, isPublished: true });
    if (!test) return res.status(404).json({ message: 'Mock test not found' });
    const { sessionId, answers = {} } = req.body || {};
    if (!sessionId || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ message: 'A valid session and answers object are required' });
    }

    const now = new Date();
    let session = await MockTestSession.findOneAndUpdate(
      { _id: sessionId, test: test._id, student: req.student._id, status: 'active', expiresAt: { $gte: now } },
      { $set: { status: 'submitting' } },
      { new: true }
    );

    // A retry after a network/process failure returns the already persisted result.
    if (!session) {
      const existing = await MockTestAttempt.findOne({ session: sessionId, student: req.student._id, test: test._id });
      if (existing) return res.status(200).json({
        attemptId: existing._id, total: existing.correct + existing.wrong + existing.unanswered,
        correct: existing.correct, wrong: existing.wrong, unanswered: existing.unanswered,
        score: existing.score, maxMarks: existing.maxMarks, accuracy: existing.accuracy
      });
      await MockTestSession.updateOne(
        { _id: sessionId, test: test._id, student: req.student._id, status: 'active', expiresAt: { $lt: now } },
        { $set: { status: 'expired' } }
      );
      return res.status(409).json({ message: 'Mock test session is invalid, expired or already being submitted. Start a new attempt.' });
    }
    claimedSessionId = session._id;

    const questions = await Question.find({ _id: { $in: test.questions } }).select('correctAnswer options');
    const result = scoreMockTest({
      questionIds: test.questions,
      questions,
      answers,
      marksPerQuestion: test.marksPerQuestion,
      negativeMarksPerWrong: test.negativeMarksPerWrong
    });
    const { correct, wrong, unanswered, score, maxMarks, accuracy, wrongQuestionIds, normalizedAnswers } = result;

    const attempt = await MockTestAttempt.findOneAndUpdate(
      { session: session._id },
      { $setOnInsert: {
        session: session._id, student: req.student._id, test: test._id,
        answers: normalizedAnswers, correct, wrong, unanswered, score, maxMarks, accuracy, wrongQuestionIds
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await MockTestSession.updateOne(
      { _id: session._id, student: req.student._id, status: 'submitting' },
      { $set: { status: 'submitted', submittedAt: new Date() } }
    );
    res.status(201).json({ attemptId: attempt._id, total: test.questions.length, correct, wrong, unanswered, score, maxMarks, accuracy });
  } catch (error) {
    if (claimedSessionId) {
      await MockTestSession.updateOne(
        { _id: claimedSessionId, student: req.student._id, status: 'submitting', expiresAt: { $gte: new Date() } },
        { $set: { status: 'active' } }
      ).catch(() => {});
    }
    res.status(400).json({ message: error.message });
  }
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
      if (!Array.isArray(payload.questions) || payload.questions.length === 0) return res.status(400).json({ message: 'At least one question is required' });
      if (new Set(payload.questions.map(String)).size !== payload.questions.length) return res.status(400).json({ message: 'Duplicate question IDs are not allowed' });
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
