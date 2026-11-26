const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAdaptiveRecommendations } = require('../services/adaptiveLearning');

test('recommends easier questions for weak subjects and harder questions for strong subjects', () => {
  const questions = [
    { _id: 'a', subject: { _id: 'math', name: 'Math' }, correctAnswer: 1, difficulty: 'Hard' },
    { _id: 'b', subject: { _id: 'math', name: 'Math' }, correctAnswer: 0, difficulty: 'Easy' },
    { _id: 'c', subject: { _id: 'science', name: 'Science' }, correctAnswer: 2, difficulty: 'Medium' },
    { _id: 'd', subject: { _id: 'math', name: 'Math' }, correctAnswer: 1, difficulty: 'Easy' },
    { _id: 'e', subject: { _id: 'math', name: 'Math' }, correctAnswer: 1, difficulty: 'Medium' },
    { _id: 'f', subject: { _id: 'math', name: 'Math' }, correctAnswer: 1, difficulty: 'Hard' }
  ];
  const attempts = [
    { test: { questions: ['a', 'b', 'c', 'd', 'e', 'f'] }, answers: { a: 0, b: 1, c: 2, d: 0, e: 0, f: 0 }, submittedAt: new Date('2026-11-20T00:00:00Z') },
    { test: { questions: ['c'] }, answers: { c: 2 }, submittedAt: new Date('2026-11-25T00:00:00Z') }
  ];
  const result = buildAdaptiveRecommendations({ attempts, questions, now: new Date('2026-11-26T00:00:00Z') });
  assert.equal(result.subjects.find(x => x.subject === 'Math').recommendedDifficulty, 'Easy');
  assert.equal(result.subjects.find(x => x.subject === 'Science').recommendedDifficulty, 'Medium');
  assert.equal(result.dueRevisions.length, 5);
});

test('keeps new subjects at medium until five answers are recorded', () => {
  const result = buildAdaptiveRecommendations({
    attempts: [{ test: { questions: ['x'] }, answers: { x: 0 } }],
    questions: [{ _id: 'x', subjectName: 'Polity', correctAnswer: 0 }],
    now: new Date('2026-11-26T00:00:00Z')
  });
  assert.equal(result.subjects[0].recommendedDifficulty, 'Medium');
  assert.equal(result.subjects[0].attempted, 1);
});
