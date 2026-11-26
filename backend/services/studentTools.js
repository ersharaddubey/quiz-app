function normalizeTopic(topic) {
  return String(topic || '').trim().replace(/\s+/g, ' ');
}
function summarizeTasks(tasks = []) {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const targetMinutes = tasks.reduce((sum, task) => sum + (Number(task.targetMinutes) || 0), 0);
  const completedMinutes = tasks.reduce((sum, task) => sum + (task.completed ? Number(task.targetMinutes) || 0 : 0), 0);
  return { total, completed, pending: total - completed, targetMinutes, completedMinutes, completionPercent: total ? Math.round(completed / total * 100) : 0 };
}
function dateKey(date = new Date()) {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
function streakFromDateKeys(keys, today = dateKey()) {
  const set = new Set(keys);
  let streak = 0;
  const cursor = new Date(today + 'T12:00:00');
  while (set.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
module.exports = { normalizeTopic, summarizeTasks, dateKey, streakFromDateKeys };
