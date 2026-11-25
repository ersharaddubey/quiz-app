const express = require('express');
const MockTest = require('../models/MockTest');
const Question = require('../models/Question');
const MockTestAttempt = require('../models/MockTestAttempt');
const MockTestSession = require('../models/MockTestSession');

const studentAuth = require('../middleware/studentAuth');
const router = express.Router();

router.post('/sessions/start', studentAuth, async (req, res) => {
  try {
    const test = await MockTest.findOne({ _id: req.body.testId, isPublished: true });
    if (!test) return res.status(404).json({ message: 'Mock test not found' });
    const active = await MockTestSession.findOne({ student: req.student._id, test: test._id, status: 'active' });
    if (active && active.expiresAt > new Date()) return res.status(409).json({ message: 'An attempt for this test is already active', sessionId: active._id, expiresAt: active.expiresAt });
    if (active) { active.status = 'expired'; await active.save(); }
    const startedAt = new Date();
    const session = await MockTestSession.create({ student: req.student._id, test: test._id, startedAt, expiresAt: new Date(startedAt.getTime() + test.durationMinutes * 60000) });
    res.status(201).json({ sessionId: session._id, startedAt: session.startedAt, expiresAt: session.expiresAt, durationMinutes: test.durationMinutes });
  } catch (error) { res.status(400).json({ message: error.message }); }
});


router.get('/analytics', studentAuth, async (req, res) => {
  try {
    const [summary] = await MockTestAttempt.aggregate([
      { $match: { student: req.student._id } },
      { $group: { _id: null, attempts: { $sum: 1 }, totalCorrect: { $sum: '$correct' }, totalWrong: { $sum: '$wrong' }, totalQuestions: { $sum: { $add: ['$correct', '$wrong', '$unanswered'] } }, averageScore: { $avg: '$score' }, averageAccuracy: { $avg: '$accuracy' }, bestScore: { $max: '$score' } } }
    ]);
    const recent = await MockTestAttempt.find({ student: req.student._id }).populate('test', 'title').sort({ submittedAt: -1 }).limit(10).select('-answers');
    const weak = await MockTestAttempt.aggregate([
      { $match: { student: req.student._id } },
      { $unwind: '$wrongQuestionIds' },
      { $group: { _id: '$wrongQuestionIds', mistakes: { $sum: 1 } } },
      { $sort: { mistakes: -1 } }, { $limit: 10 },
      { $lookup: { from: 'questions', localField: '_id', foreignField: '_id', as: 'question' } },
      { $unwind: '$question' },
      { $project: { questionId: '$_id', mistakes: 1, question: '$question.question', subject: '$question.subjectName', topic: '$question.categoryName' } }
    ]);
    res.json({ summary: summary || { attempts: 0, totalCorrect: 0, totalWrong: 0, totalQuestions: 0, averageScore: 0, averageAccuracy: 0, bestScore: 0 }, recent, weakTopics: weak });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const rows = await MockTestAttempt.aggregate([
      { $match: { submittedAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      { $group: { _id: '$student', points: { $sum: '$score' }, attempts: { $sum: 1 }, accuracy: { $avg: '$accuracy' } } },
      { $sort: { points: -1, accuracy: -1, attempts: -1 } }, { $limit: limit },
      { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $project: { studentId: '$_id', name: '$student.name', points: 1, attempts: 1, accuracy: { $round: ['$accuracy', 1] } } }
    ]);
    res.json({ period: 'weekly', rankings: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/revision/wrong', studentAuth, async (req, res) => {
  try {
    const ids = await MockTestAttempt.distinct('wrongQuestionIds', { student: req.student._id });
    const questions = await Question.find({ _id: { $in: ids } })
      .select('question options correctAnswer explanation categoryName subjectName questionLanguage translation')
      .sort({ createdAt: -1 }).limit(100).lean();
    res.json(questions);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
