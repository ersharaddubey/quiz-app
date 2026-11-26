const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const auth = require('../middleware/auth');
const QuestionImportRun = require('../models/QuestionImportRun');
const { importQuestions } = require('../services/questionImporter');

// Public deployment probe: reports route availability without exposing secret values.
router.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'quiz-automation',
    imports: {
      questions: Boolean(process.env.QUESTION_IMPORT_SECRET),
      currentAffairs: Boolean(process.env.CURRENT_AFFAIRS_IMPORT_SECRET),
      jobAlerts: Boolean(process.env.JOB_ALERT_IMPORT_SECRET)
    }
  });
});

function secretMatches(received, expected) {
  if (!received || !expected) return false;
  const a = Buffer.from(String(received));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// GitHub Actions calls this endpoint every six hours. The secret is never shipped to the app.
router.post('/import', async (req, res) => {
  if (!secretMatches(req.header('x-question-import-secret'), process.env.QUESTION_IMPORT_SECRET)) {
    return res.status(401).json({ message: 'Unauthorized automation request' });
  }
  try {
    const result = await importQuestions({ trigger: 'github-actions' });
    res.status(result.status === 'failed' ? 502 : 200).json({
      status: result.status, fetched: result.fetched, inserted: result.inserted,
      duplicates: result.duplicates, skipped: result.skipped, errors: result.errors
    });
  } catch (error) {
    console.error('Question automation failed:', error);
    res.status(500).json({ message: 'Question import failed' });
  }
});

// Admin-only visibility and manual run for diagnostics.
router.get('/history', auth, async (req, res) => {
  try {
    const runs = await QuestionImportRun.find().sort({ startedAt: -1 }).limit(30).lean();
    res.json(runs);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/run-now', auth, async (req, res) => {
  try {
    const result = await importQuestions({ trigger: 'manual' });
    res.json({ status: result.status, fetched: result.fetched, inserted: result.inserted,
      duplicates: result.duplicates, skipped: result.skipped, errors: result.errors });
  } catch (error) { res.status(500).json({ message: error.message }); }
});


router.post('/current-affairs/import', async (req, res) => {
  if (!secretMatches(req.header('x-current-affairs-secret'), process.env.CURRENT_AFFAIRS_IMPORT_SECRET)) {
    return res.status(401).json({ message: 'Unauthorized current affairs import request' });
  }
  try {
    const { importCurrentAffairs } = require('../services/currentAffairsImporter');
    const result = await importCurrentAffairs();
    res.status(result.errors.length && !result.drafts ? 502 : 200).json(result);
  } catch (error) {
    res.status(503).json({ message: error.message });
  }
});


router.post('/job-alerts/import', async (req, res) => {
  if (!secretMatches(req.header('x-job-alert-import-secret'), process.env.JOB_ALERT_IMPORT_SECRET)) {
    return res.status(401).json({ message: 'Unauthorized job-alert import request' });
  }
  try {
    const { importJobAlertDrafts } = require('../services/jobAlertImporter');
    const result = await importJobAlertDrafts();
    res.status(result.errors.length && !result.drafts ? 502 : 200).json(result);
  } catch (error) {
    res.status(503).json({ message: error.message });
  }
});

module.exports = router;
