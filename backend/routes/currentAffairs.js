const express = require('express');
const router = express.Router();
const CurrentAffair = require('../models/CurrentAffair');
const auth = require('../middleware/auth');


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

// Print-ready study sheet. On Android/iOS browsers users can choose "Save as PDF".
router.get('/export/print', async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (['hi', 'en'].includes(req.query.language)) filter.language = req.query.language;
    if (req.query.topic) filter.topic = String(req.query.topic).slice(0, 100);
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to || to - from > 366 * 86400000) {
      return res.status(400).send('Invalid export date range');
    }
    filter.sourceDate = { $gte: from, $lte: to };
    const items = await CurrentAffair.find(filter)
      .select('title summary question options topic language sourceName sourceUrl sourceDate')
      .sort({ sourceDate: -1 }).limit(300).lean();
    const cards = items.map((item, index) => `
      <article class="question">
        <div class="meta">${escapeHtml(item.topic)} · ${escapeHtml(new Date(item.sourceDate).toLocaleDateString('en-IN'))}</div>
        <h2>${index + 1}. ${escapeHtml(item.title)}</h2>
        ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}
        <p class="prompt">${escapeHtml(item.question)}</p>
        <ol type="A">${(item.options || []).map(option => `<li>${escapeHtml(option)}</li>`).join('')}</ol>
        ${item.sourceUrl ? `<p class="source">Source: <a href="${escapeHtml(item.sourceUrl)}">${escapeHtml(item.sourceName || item.sourceUrl)}</a></p>` : ''}
      </article>`).join('');
    const title = `Current Affairs Study Sheet · ${from.toLocaleDateString('en-IN')} – ${to.toLocaleDateString('en-IN')}`;
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
      body{font-family:Arial,"Noto Sans Devanagari",sans-serif;color:#172033;max-width:850px;margin:32px auto;padding:0 20px;line-height:1.55}
      h1{font-size:24px;margin-bottom:4px}.sub{color:#64748b;margin-bottom:24px}
      .toolbar{position:sticky;top:0;background:#fff;padding:12px 0;border-bottom:1px solid #ddd}
      button{background:#075985;color:#fff;border:0;border-radius:8px;padding:11px 18px;font-size:15px}
      .question{break-inside:avoid;border:1px solid #dbe3ee;border-radius:10px;padding:16px;margin:14px 0}
      .meta,.source{font-size:12px;color:#64748b}.prompt{font-weight:700}li{margin:4px 0}
      @media print{body{margin:0;max-width:none}.toolbar{display:none}.question{border:0;border-bottom:1px solid #ddd;border-radius:0;padding:10px 0;margin:8px 0}a{color:inherit;text-decoration:none}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button> <span>Choose “Save as PDF” in the print dialog.</span></div>
    <h1>${escapeHtml(title)}</h1><div class="sub">${items.length} published questions · Answers are intentionally hidden for practice.</div>
    ${cards || '<p>No published current-affairs questions found for this date range.</p>'}</body></html>`);
  } catch (error) { res.status(500).send('Could not prepare current-affairs export'); }
});

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
