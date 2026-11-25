const express = require('express');
const router = express.Router();
const JobAlert = require('../models/JobAlert');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (req.query.category) filter.examCategory = req.query.category;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const items = await JobAlert.find(filter).populate('examCategory', 'name').sort({ applicationEnd: 1, createdAt: -1 }).limit(limit).lean();
    res.json(items);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/admin/all', auth, async (req, res) => {
  try { res.json(await JobAlert.find().populate('examCategory', 'name').sort({ createdAt: -1 }).limit(300).lean()); }
  catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const item = new JobAlert(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await JobAlert.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Job alert not found' });
    Object.assign(item, req.body, { updatedAt: new Date() });
    await item.save();
    res.json(item);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await JobAlert.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Job alert not found' });
    res.json({ message: 'Job alert deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
module.exports = router;
