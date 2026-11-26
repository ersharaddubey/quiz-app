const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const { hashQuestion } = require('../services/questionImporter');

router.get('/', async (req, res) => {
  try {
    const { category, subject, syllabus, difficulty, limit, isPreviousYearQuestion, examName, examYear } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (subject) filter.subject = subject;
    if (syllabus) filter.syllabus = syllabus;
    if (difficulty) filter.difficulty = difficulty;
    if (isPreviousYearQuestion === 'true') { filter.isPreviousYearQuestion = true; filter.verified = true; }
    if (examName) filter.examName = examName;
    if (examYear && Number.isInteger(Number(examYear))) filter.examYear = Number(examYear);
    let query = Question.find(filter).populate('category', 'name icon').populate('subject', 'name icon').populate('syllabus', 'title').select('-__v');
    if (limit) query = query.limit(Math.min(Math.max(parseInt(limit, 10) || 1, 1), 200));
    const questions = await query.sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('category', 'name icon').populate('subject', 'name icon').populate('syllabus', 'title');
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { question, questionHi, options, optionsHi, correctAnswer, category, subject, syllabus, difficulty, explanation, explanationHi, examName, examYear, paperName, pyqSourceUrl, questionLanguage, translation, isPreviousYearQuestion, verified } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2 || !Number.isInteger(Number(correctAnswer))) {
      return res.status(400).json({ message: 'Please provide question, at least 2 options and correctAnswer index' });
    }
    if (!category || !subject) return res.status(400).json({ message: 'Category and Subject are required' });
    if (Number(correctAnswer) < 0 || Number(correctAnswer) >= options.length) return res.status(400).json({ message: 'correctAnswer index is invalid' });
    if (optionsHi !== undefined && (!Array.isArray(optionsHi) || (optionsHi.length !== 0 && optionsHi.length !== options.length))) {
      return res.status(400).json({ message: 'Hindi options must be provided for every option or left blank' });
    }
    const cat = await Category.findById(category);
    const sub = await Subject.findById(subject);
    if (!cat || !sub) return res.status(400).json({ message: 'Invalid category or subject' });
    const questionHash = hashQuestion(question);
    const duplicate = await Question.findOne({ questionHash }).select('_id');
    if (duplicate) return res.status(409).json({ message: 'This question already exists' });
    const newQuestion = new Question({
      question, questionHi: questionHi || '', optionsHi: Array.isArray(optionsHi) ? optionsHi : [], questionHash,
      options, correctAnswer: Number(correctAnswer), category, subject, syllabus: syllabus || undefined,
      categoryName: cat.name, subjectName: sub.name, difficulty: difficulty || 'Medium',
      explanation: explanation || '', explanationHi: explanationHi || '', examName: examName || '',
      examYear: examYear ? Number(examYear) : null, paperName: paperName || '', pyqSourceUrl: pyqSourceUrl || '',
      questionLanguage: questionLanguage || '', translation: translation || '',
      isPreviousYearQuestion: Boolean(isPreviousYearQuestion), verified: Boolean(verified)
    });
    const saved = await newQuestion.save();
    const populated = await Question.findById(saved._id).populate('category', 'name icon').populate('subject', 'name icon').populate('syllabus', 'title');
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.question) {
      body.questionHash = hashQuestion(body.question);
      const duplicate = await Question.findOne({ questionHash: body.questionHash, _id: { $ne: req.params.id } }).select('_id');
      if (duplicate) return res.status(409).json({ message: 'Another question with this text already exists' });
    }
    if (body.optionsHi !== undefined && !Array.isArray(body.optionsHi)) return res.status(400).json({ message: 'Hindi options must be an array' });
    if (body.category) {
      const cat = await Category.findById(body.category);
      if (!cat) return res.status(400).json({ message: 'Invalid category' });
      body.categoryName = cat.name;
    }
    if (body.subject) {
      const sub = await Subject.findById(body.subject);
      if (!sub) return res.status(400).json({ message: 'Invalid subject' });
      body.subjectName = sub.name;
    }
    // Document save runs schema pre-validate hooks; findByIdAndUpdate does not.
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    Object.assign(question, body);
    await question.save();
    const updated = await Question.findById(question._id).populate('category', 'name icon').populate('subject', 'name icon').populate('syllabus', 'title');
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
