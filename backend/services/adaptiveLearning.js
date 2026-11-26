function buildAdaptiveRecommendations({ attempts = [], questions = [], now = new Date() }) {
  const questionById = new Map(questions.map(question => [String(question._id), question]));
  const stats = new Map();
  const revisionById = new Map();

  for (const attempt of attempts) {
    const questionIds = (attempt.test?.questions || []).map(String);
    for (const id of questionIds) {
      const question = questionById.get(id);
      if (!question) continue;
      const subject = question.subject?.name || question.subjectName || 'General';
      const key = String(question.subject?._id || question.subject || subject);
      if (!stats.has(key)) stats.set(key, { subject, attempted: 0, correct: 0, wrong: 0, easy: 0, medium: 0, hard: 0 });
      const row = stats.get(key);
      const selected = attempt.answers?.[id];
      if (selected === undefined || selected === null || selected === '') continue;
      row.attempted++;
      if (Number(selected) === Number(question.correctAnswer)) row.correct++;
      else {
        row.wrong++;
        const dueAt = new Date(new Date(attempt.submittedAt || now).getTime() + 24 * 60 * 60 * 1000);
        // Reset the cooling-off window after every new incorrect answer.
        revisionById.set(id, { questionId: id, subject, difficulty: question.difficulty || 'Medium', dueAt });
      }
    }
  }

  const subjects = [...stats.values()].map(row => {
    const accuracy = row.attempted ? Math.round(row.correct / row.attempted * 100) : 0;
    const recommendedDifficulty = row.attempted < 5 ? 'Medium' : accuracy < 50 ? 'Easy' : accuracy >= 85 ? 'Hard' : 'Medium';
    return { ...row, accuracy, recommendedDifficulty, reason: row.attempted < 5 ? 'More practice data is needed' : accuracy < 50 ? 'Build fundamentals with easier questions' : accuracy >= 85 ? 'Increase challenge with harder questions' : 'Continue at the current level' };
  }).sort((a, b) => a.accuracy - b.accuracy);

  const dueRevisions = [...revisionById.values()].filter(item => item.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
  return { subjects, dueRevisions, nextRevisionCount: revisionById.size };
}

module.exports = { buildAdaptiveRecommendations };
