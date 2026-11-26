function scoreMockTest({ questionIds, questions, answers, sections = [], marksPerQuestion = 1, negativeMarksPerWrong = 0 }) {
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
  const sectionResults = sections.map(section => {
    const ids = (section.questionIds || []).map(String).filter(id => questionIds.map(String).includes(id));
    let sectionCorrect = 0, sectionWrong = 0, sectionUnanswered = 0;
    for (const id of ids) {
      const question = byId.get(id);
      const selected = normalizedAnswers[id];
      if (!question || selected === undefined) sectionUnanswered++;
      else if (selected === question.correctAnswer) sectionCorrect++;
      else sectionWrong++;
    }
    return {
      title: section.title,
      correct: sectionCorrect,
      wrong: sectionWrong,
      unanswered: sectionUnanswered,
      score: Math.round((sectionCorrect * marksPerQuestion - sectionWrong * negativeMarksPerWrong) * 100) / 100,
      maxMarks: ids.length * marksPerQuestion
    };
  });
  return { correct, wrong, unanswered, score, maxMarks, accuracy, wrongQuestionIds, normalizedAnswers, sections: sectionResults, total: questionIds.length };
}

module.exports = { scoreMockTest };
