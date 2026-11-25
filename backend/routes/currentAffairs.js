const express = require('express');
const router = express.Router();
const CurrentAffair = require('../models/CurrentAffair');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (req.query.language && ['hi', 'en'].includes(req.query.language)) filter.language = req.query.language;
    if (req.query.topic) filter.topic = req.query.topic;
    if (req.query.from || req.query.to) {
      filter.sourceDate = {};
      if (req.query.from) filter.sourceDate.$gte = new Date(req.query.from);
      if (req.query.to) filter.sourceDate.$lte = new Date(req.query.to);
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const items = await CurrentAffair.find(filter).select('-correctAnswer -explanation').sort({ sourceDate: -1 }).limit(limit).lean();
    res.json(items);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/admin/all', auth, async (req, res) => {
  try { res.json(await CurrentAffair.find().sort({ sourceDate: -1 }).limit(300).lean()); }
  catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const item = new CurrentAffair(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await CurrentAffair.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Current affair not found' });
    Object.assign(item, req.body, { updatedAt: new Date() });
    await item.save();
    res.json(item);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await CurrentAffair.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Current affair not found' });
    res.json({ message: 'Current affair deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
module.exports = router;
