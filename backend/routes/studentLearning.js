const express = require('express');
const MockTest = require('../models/MockTest');
const Question = require('../models/Question');
const MockTestAttempt = require('../models/MockTestAttempt');
const studentAuth = require('../middleware/studentAuth');
const router = express.Router();

router.post('/attempts', studentAuth, async (req, res) => {
  try {
    const { testId, answers = {} } = req.body;
    const test = await MockTest.findOne({ _id: testId, isPublished: true });
    if (!test) return res.status(404).json({ message: 'Mock test not found' });
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return res.status(400).json({ message: 'Answers must be an object' });
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
    const attempt = await MockTestAttempt.create({
      student: req.student._id, test: test._id, answers: normalizedAnswers,
      correct, wrong, unanswered, score, maxMarks, accuracy, wrongQuestionIds
    });
    res.status(201).json({ attemptId: attempt._id, total: test.questions.length, correct, wrong, unanswered, score, maxMarks, accuracy });
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
