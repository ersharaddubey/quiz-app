const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const { hashQuestion } = require('../services/questionImporter');

// Get all questions (public - for mobile app)
router.get('/', async (req, res) => {
  try {
    const { category, subject, syllabus, difficulty, limit, isPreviousYearQuestion, examName, examYear } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (subject) filter.subject = subject;
    if (syllabus) filter.syllabus = syllabus;
    if (difficulty) filter.difficulty = difficulty;
    if (isPreviousYearQuestion === 'true') { filter.isPreviousYearQuestion = true; filter.verified = true; }
    if (examName) filter.examName = examName;
    if (examYear && Number.isInteger(Number(examYear))) filter.examYear = Number(examYear);

    let query = Question.find(filter)
      .populate('category', 'name icon')
      .populate('subject', 'name icon')
      .populate('syllabus', 'title')
      .select('-__v');

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const questions = await query.sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single question
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('category', 'name icon')
      .populate('subject', 'name icon')
      .populate('syllabus', 'title');
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create question (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { question, options, correctAnswer, category, subject, syllabus, difficulty, explanation, examName, examYear, paperName, pyqSourceUrl, questionLanguage, translation, isPreviousYearQuestion, verified } = req.body;

    if (!question || !options || options.length < 2 || correctAnswer === undefined) {
      return res.status(400).json({ message: 'Please provide question, at least 2 options and correctAnswer index' });
    }

    if (!category || !subject) {
      return res.status(400).json({ message: 'Category and Subject are required' });
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({ message: 'correctAnswer index is invalid' });
    }

    const cat = await Category.findById(category);
    const sub = await Subject.findById(subject);
    if (!cat || !sub) {
      return res.status(400).json({ message: 'Invalid category or subject' });
    }

    const questionHash = hashQuestion(question);
    const duplicate = await Question.findOne({ questionHash }).select('_id');
    if (duplicate) return res.status(409).json({ message: 'This question already exists' });

    const newQuestion = new Question({
      question,
      questionHash,
      options,
      correctAnswer,
      category,
      subject,
      syllabus: syllabus || undefined,
      categoryName: cat.name,
      subjectName: sub.name,
      difficulty: difficulty || 'Medium',
      explanation: explanation || '',
      examName: examName || '',
      examYear: examYear ? Number(examYear) : null,
      paperName: paperName || '',
      pyqSourceUrl: pyqSourceUrl || '',
      questionLanguage: questionLanguage || '',
      translation: translation || '',
      isPreviousYearQuestion: Boolean(isPreviousYearQuestion),
      verified: Boolean(verified)
    });

    const saved = await newQuestion.save();
    const populated = await Question.findById(saved._id)
      .populate('category', 'name icon')
      .populate('subject', 'name icon')
      .populate('syllabus', 'title');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update question (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.question) {
      body.questionHash = hashQuestion(body.question);
      const duplicate = await Question.findOne({ questionHash: body.questionHash, _id: { $ne: req.params.id } }).select('_id');
      if (duplicate) return res.status(409).json({ message: 'Another question with this text already exists' });
    }

    if (body.category) {
      const cat = await Category.findById(body.category);
      if (cat) body.categoryName = cat.name;
    }
    if (body.subject) {
      const sub = await Subject.findById(body.subject);
      if (sub) body.subjectName = sub.name;
    }

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    )
      .populate('category', 'name icon')
      .populate('subject', 'name icon')
      .populate('syllabus', 'title');

    if (!updated) return res.status(404).json({ message: 'Question not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete question (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
