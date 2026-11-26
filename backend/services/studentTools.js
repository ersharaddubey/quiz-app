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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return values.year + '-' + values.month + '-' + values.day;
}
function streakFromDateKeys(keys, today = dateKey()) {
  const set = new Set(keys);
  let streak = 0;
  const cursor = new Date(today + 'T12:00:00Z');
  while (set.has(dateKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
module.exports = { normalizeTopic, summarizeTasks, dateKey, streakFromDateKeys };
