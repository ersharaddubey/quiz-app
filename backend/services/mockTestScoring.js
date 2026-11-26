function scoreMockTest({ questionIds, questions, answers, marksPerQuestion = 1, negativeMarksPerWrong = 0 }) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) throw new Error('A mock test must contain at least one question');
  if (!Array.isArray(questions)) throw new Error('Questions must be an array');
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Answers must be an object');

  const byId = new Map(questions.map(question => [String(question._id), question]));
  let correct = 0, wrong = 0, unanswered = 0;
  const wrongQuestionIds = [];
  const normalizedAnswers = {};

  for (const id of questionIds.map(String)) {
    const question = byId.get(id);
    const value = answers[id];
    if (!question || value === undefined || value === null || value === '') {
      unanswered++;
      continue;
    }
    const selected = Number(value);
    if (!Number.isInteger(selected) || selected < 0 || selected >= question.options.length) {
      unanswered++;
      continue;
    }
    normalizedAnswers[id] = selected;
    if (selected === question.correctAnswer) correct++;
    else {
      wrong++;
      wrongQuestionIds.push(id);
    }
  }

  const score = Math.round((correct * marksPerQuestion - wrong * negativeMarksPerWrong) * 100) / 100;
  const maxMarks = questionIds.length * marksPerQuestion;
  const attempted = correct + wrong;
  const accuracy = attempted ? Math.round(correct / attempted * 10000) / 100 : 0;
  return { correct, wrong, unanswered, score, maxMarks, accuracy, wrongQuestionIds, normalizedAnswers, total: questionIds.length };
}

module.exports = { scoreMockTest };
