const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTopic, summarizeTasks, dateKey, streakFromDateKeys } = require('../services/studentTools');

test('normalizes syllabus topic names', () => assert.equal(normalizeTopic('  Indian   Polity  '), 'Indian Polity'));
test('summarizes daily targets and completed study time', () => {
  assert.deepEqual(summarizeTasks([{ completed: true, targetMinutes: 45 }, { completed: false, targetMinutes: 30 }]), {
    total: 2, completed: 1, pending: 1, targetMinutes: 75, completedMinutes: 45, completionPercent: 50
  });
});
test('formats local date keys', () => assert.match(dateKey(new Date('2026-11-26T12:00:00')), /^2026-11-26$/));
test('calculates consecutive fully-completed day streaks', () => {
  assert.equal(streakFromDateKeys(['2026-11-24','2026-11-25','2026-11-26'], '2026-11-26'), 3);
  assert.equal(streakFromDateKeys(['2026-11-24','2026-11-26'], '2026-11-26'), 1);
});
