const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreMockTest } = require('../services/mockTestScoring');

const questionIds = ['q1', 'q2', 'q3'];
const questions = [
  { _id: 'q1', correctAnswer: 1, options: ['A', 'B', 'C', 'D'] },
  { _id: 'q2', correctAnswer: 0, options: ['A', 'B', 'C', 'D'] },
  { _id: 'q3', correctAnswer: 2, options: ['A', 'B', 'C', 'D'] }
];

test('scores correct, wrong and unanswered questions with negative marking', () => {
  const result = scoreMockTest({
    questionIds, questions, answers: { q1: 1, q2: 3 },
    marksPerQuestion: 2, negativeMarksPerWrong: 0.5
  });
  assert.equal(result.correct, 1);
  assert.equal(result.wrong, 1);
  assert.equal(result.unanswered, 1);
  assert.equal(result.score, 1.5);
  assert.equal(result.maxMarks, 6);
  assert.equal(result.accuracy, 50);
  assert.deepEqual(result.wrongQuestionIds, ['q2']);
  assert.deepEqual(result.normalizedAnswers, { q1: 1, q2: 3 });
});

test('treats invalid option indexes as unanswered and never records them', () => {
  const result = scoreMockTest({ questionIds, questions, answers: { q1: 99, q2: -1, q3: 'x' } });
  assert.equal(result.correct, 0);
  assert.equal(result.wrong, 0);
  assert.equal(result.unanswered, 3);
  assert.deepEqual(result.normalizedAnswers, {});
});

test('rejects empty tests and malformed answer payloads', () => {
  assert.throws(() => scoreMockTest({ questionIds: [], questions, answers: {} }), /at least one question/i);
  assert.throws(() => scoreMockTest({ questionIds, questions, answers: [] }), /answers must be an object/i);
});

test('counts a deleted/missing question as unanswered rather than leaking or crashing', () => {
  const result = scoreMockTest({ questionIds, questions: questions.slice(0, 2), answers: { q1: 1 } });
  assert.equal(result.correct, 1);
  assert.equal(result.unanswered, 2);
});

test('returns section-wise scores using the same negative-marking rules', () => {
  const result = scoreMockTest({
    questionIds, questions, answers: { q1: 1, q2: 3 },
    sections: [
      { title: 'General Studies', questionIds: ['q1', 'q2'] },
      { title: 'Reasoning', questionIds: ['q3'] }
    ],
    marksPerQuestion: 2, negativeMarksPerWrong: 0.5
  });
  assert.deepEqual(result.sections, [
    { title: 'General Studies', correct: 1, wrong: 1, unanswered: 0, score: 1.5, maxMarks: 4 },
    { title: 'Reasoning', correct: 0, wrong: 0, unanswered: 1, score: 0, maxMarks: 2 }
  ]);
});
