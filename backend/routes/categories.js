const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');

// Get all active categories (public)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    const categories = await Category.find(filter).sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create category (Admin)
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, icon, image, order, isActive } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Category already exists' });

    const category = new Category({
      name,
      description: description || '',
      icon: icon || '📚',
      image: image || '',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    const saved = await category.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update category (Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Category not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete category (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seed comprehensive government exam categories
router.post('/seed', auth, async (req, res) => {
  try {
    const defaults = [
      { name: 'UPSC', description: 'CSE, IFS, IES, CAPF, EPFO, CDS (written)', icon: '🇮🇳', order: 1 },
      { name: 'SSC', description: 'CGL, CHSL, MTS, GD, CPO, JE, Stenographer', icon: '🏛️', order: 2 },
      { name: 'Banking', description: 'IBPS PO/Clerk/SO, SBI PO/Clerk, RBI Grade B, RRB', icon: '🏦', order: 3 },
      { name: 'Railways', description: 'RRB NTPC, Group D, ALP, JE, Technician', icon: '🚂', order: 4 },
      { name: 'Defence', description: 'NDA, CDS, AFCAT, Agniveer, INET', icon: '🛡️', order: 5 },
      { name: 'Teaching', description: 'CTET, State TET, KVS, NVS, UGC NET, REET', icon: '👨‍🏫', order: 6 },
      { name: 'State PSC', description: 'UPPSC, BPSC, MPSC, RPSC, MPPSC, WBCS, GPSC', icon: '📋', order: 7 },
      { name: 'Police', description: 'SI, Constable, CAPF, Delhi Police, State Police', icon: '👮', order: 8 },
      { name: 'Insurance', description: 'LIC AAO/ADO, NIACL, UIIC, OICL, GIC', icon: '📄', order: 9 },
      { name: 'PSU & Others', description: 'FCI, EPFO, ESIC, ISRO, DRDO, BARC, SAIL', icon: '🏭', order: 10 },
      { name: 'Judicial', description: 'State Judicial Services, Law Officer', icon: '⚖️', order: 11 },
      { name: 'Engineering', description: 'GATE, ESE/IES, SSC JE, RRB JE, State AE/JE', icon: '⚙️', order: 12 },
      { name: 'Medical', description: 'NEET PG prep MCQ, AIIMS, ESIC MO related GA', icon: '🩺', order: 13 },
      { name: 'Agriculture', description: 'IBPS AFO, NABARD, State Agri Officer', icon: '🌾', order: 14 },
    ];

    const created = [];
    for (const d of defaults) {
      const exists = await Category.findOne({ name: d.name });
      if (!exists) {
        const cat = await Category.create(d);
        created.push(cat);
      }
    }
    res.json({ message: `Seeded ${created.length} categories`, categories: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
