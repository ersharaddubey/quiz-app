const express = require('express');
const studentAuth = require('../middleware/studentAuth');
const Syllabus = require('../models/Syllabus');
const StudentTopicProgress = require('../models/StudentTopicProgress');
const StudyPlan = require('../models/StudyPlan');
const CurrentAffair = require('../models/CurrentAffair');
const JobAlert = require('../models/JobAlert');
const { summarizeTasks, dateKey, streakFromDateKeys, normalizeTopic } = require('../services/studentTools');
const router = express.Router();
router.use(studentAuth);

router.get('/syllabus', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subject) filter.subject = req.query.subject;
    const [items, progress] = await Promise.all([
      Syllabus.find(filter).populate('category', 'name').populate('subject', 'name').sort({ order: 1, title: 1 }).lean(),
      StudentTopicProgress.find({ student: req.student._id }).lean()
    ]);
    const bySyllabus = new Map();
    for (const item of progress) {
      if (!bySyllabus.has(String(item.syllabus))) bySyllabus.set(String(item.syllabus), new Map());
      bySyllabus.get(String(item.syllabus)).set(item.topic, item.completed);
    }
    res.json(items.map(item => {
      const states = bySyllabus.get(String(item._id)) || new Map();
      const topics = (item.topics || []).map(topic => ({ title: topic, completed: Boolean(states.get(topic)) }));
      const completed = topics.filter(topic => topic.completed).length;
      return { ...item, topics, completedTopics: completed, totalTopics: topics.length, completionPercent: topics.length ? Math.round(completed / topics.length * 100) : 0 };
    }));
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/syllabus/:id/topic', async (req, res) => {
  try {
    const topic = normalizeTopic(req.body.topic);
    if (!topic || topic.length > 160 || typeof req.body.completed !== 'boolean') return res.status(400).json({ message: 'Valid topic and completed boolean are required' });
    const syllabus = await Syllabus.findOne({ _id: req.params.id, isActive: true }).select('topics');
    if (!syllabus) return res.status(404).json({ message: 'Syllabus not found' });
    if (!(syllabus.topics || []).includes(topic)) return res.status(400).json({ message: 'Topic does not belong to this syllabus' });
    const progress = await StudentTopicProgress.findOneAndUpdate(
      { student: req.student._id, syllabus: syllabus._id, topic },
      { $set: { completed: req.body.completed, completedAt: req.body.completed ? new Date() : null, updatedAt: new Date() } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ topic: progress.topic, completed: progress.completed, completedAt: progress.completedAt });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/planner/today', async (req, res) => {
  try {
    const today = dateKey();
    const plan = await StudyPlan.findOne({ student: req.student._id, dateKey: today }).lean();
    const tasks = plan?.tasks || [];
    const recent = await StudyPlan.find({ student: req.student._id, dateKey: { $gte: dateKey(new Date(Date.now() - 29 * 86400000)), $lte: today } }).lean();
    const completedDays = recent.filter(day => day.tasks?.length && day.tasks.every(task => task.completed)).map(day => day.dateKey);
    res.json({ date: today, tasks, summary: summarizeTasks(tasks), streak: streakFromDateKeys(completedDays, today) });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/planner/today', async (req, res) => {
  try {
    if (!Array.isArray(req.body.tasks) || req.body.tasks.length > 20) return res.status(400).json({ message: 'Tasks must be an array with at most 20 items' });
    const tasks = req.body.tasks.map(task => ({
      title: String(task.title || '').trim(),
      subject: String(task.subject || '').trim(),
      targetMinutes: Math.min(Math.max(Number(task.targetMinutes) || 30, 5), 600),
      completed: Boolean(task.completed),
      completedAt: task.completed ? (task.completedAt ? new Date(task.completedAt) : new Date()) : null
    }));
    if (tasks.some(task => !task.title || task.title.length > 120)) return res.status(400).json({ message: 'Every task needs a title up to 120 characters' });
    const plan = await StudyPlan.findOneAndUpdate(
      { student: req.student._id, dateKey: dateKey() },
      { $set: { tasks, updatedAt: new Date() } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ date: plan.dateKey, tasks: plan.tasks, summary: summarizeTasks(plan.tasks) });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/planner/weekly-report', async (req, res) => {
  try {
    const today = dateKey();
    const from = dateKey(new Date(Date.now() - 6 * 86400000));
    const plans = await StudyPlan.find({ student: req.student._id, dateKey: { $gte: from, $lte: today } }).sort({ dateKey: 1 }).lean();
    const days = plans.map(plan => ({ date: plan.dateKey, ...summarizeTasks(plan.tasks) }));
    const totals = days.reduce((sum, day) => ({ plannedMinutes: sum.plannedMinutes + day.targetMinutes, completedMinutes: sum.completedMinutes + day.completedMinutes, completedTasks: sum.completedTasks + day.completed, totalTasks: sum.totalTasks + day.total }), { plannedMinutes: 0, completedMinutes: 0, completedTasks: 0, totalTasks: 0 });
    res.json({ from, to: today, days, totals });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/dashboard', async (req, res) => {
  try {
    const [affairs, jobs, plans] = await Promise.all([
      CurrentAffair.countDocuments({ status: 'published', sourceDate: { $gte: new Date(Date.now() - 7 * 86400000) } }),
      JobAlert.countDocuments({ status: 'published', $or: [{ applicationEnd: null }, { applicationEnd: { $gte: new Date() } }] }),
      StudyPlan.find({ student: req.student._id }).sort({ dateKey: -1 }).limit(7).lean()
    ]);
    res.json({ currentAffairsLast7Days: affairs, activeJobAlerts: jobs, recentStudyDays: plans.map(p => ({ date: p.dateKey, ...summarizeTasks(p.tasks) })) });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/assistant/explain', async (req, res) => {
  try {
    const question = String(req.body.question || '').trim();
    const context = String(req.body.context || '').trim();
    const language = req.body.language === 'hi' ? 'Hindi' : 'English';
    if (!question || question.length > 3000 || context.length > 3000) return res.status(400).json({ message: 'Question and context are required (maximum 3000 characters each)' });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'AI Study Assistant is not configured yet. Set OPENAI_API_KEY on the backend.' });
    const endpoint = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0.3, max_tokens: 900,
        messages: [
          { role: 'system', content: 'You are a careful Indian government-exam tutor. Explain concepts simply, identify why a wrong option is wrong, provide a short memory trick or formula when useful, and never invent official exam facts. Reply in ' + language + '.' },
          { role: 'user', content: 'Question: ' + question + (context ? '\nContext/options: ' + context : '') }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 429 ? 503 : 502).json({ message: payload.error?.message || 'AI provider request failed' });
    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ message: 'AI provider returned an empty explanation' });
    res.json({ answer, model });
  } catch (error) { res.status(502).json({ message: error.name === 'TimeoutError' ? 'AI tutor timed out. Please retry.' : error.message }); }
});

module.exports = router;
