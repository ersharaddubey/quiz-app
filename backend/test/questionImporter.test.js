const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeQuestion } = require('../services/questionImporter');

test('normalizes bilingual and PYQ provenance fields from canonical JSON records', () => {
  const q = normalizeQuestion({
    question: 'Who founded the Maurya Empire?',
    options: ['Chandragupta Maurya', 'Ashoka', 'Bindusara', 'Bimbisara'],
    correctAnswer: 0,
    categoryName: 'UPSC',
    subjectName: 'History',
    questionHi: 'मौर्य साम्राज्य की स्थापना किसने की?',
    optionsHi: ['चंद्रगुप्त मौर्य', 'अशोक', 'बिंदुसार', 'बिंबिसार'],
    explanationHi: 'चंद्रगुप्त मौर्य ने स्थापना की।',
    questionLanguage: 'BOTH',
    examName: 'UPSC Prelims',
    examYear: 2020,
    paperName: 'GS Paper I',
    pyqSourceUrl: 'https://example.org/paper.pdf',
    isPreviousYearQuestion: true
  }, 'licensed-dataset');

  assert.equal(q.questionHi, 'मौर्य साम्राज्य की स्थापना किसने की?');
  assert.deepEqual(q.optionsHi, ['चंद्रगुप्त मौर्य', 'अशोक', 'बिंदुसार', 'बिंबिसार']);
  assert.equal(q.explanationHi, 'चंद्रगुप्त मौर्य ने स्थापना की।');
  assert.equal(q.questionLanguage, 'both');
  assert.equal(q.examName, 'UPSC Prelims');
  assert.equal(q.examYear, 2020);
  assert.equal(q.paperName, 'GS Paper I');
  assert.equal(q.pyqSourceUrl, 'https://example.org/paper.pdf');
  assert.equal(q.isPreviousYearQuestion, true);
});

test('ignores unsupported question language values and safely defaults absent provenance', () => {
  const q = normalizeQuestion({
    question: 'A sufficiently long practice question?',
    options: ['One', 'Two'],
    correctAnswer: 0,
    categoryName: 'SSC',
    subjectName: 'General Knowledge',
    questionLanguage: 'Hindi'
  }, 'practice-source');

  assert.equal(q.questionLanguage, '');
  assert.equal(q.examYear, null);
  assert.equal(q.isPreviousYearQuestion, false);
  assert.equal(q.pyqSourceUrl, '');
});
