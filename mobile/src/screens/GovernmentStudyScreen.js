import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import API from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const C = { bg: '#060B18', card: '#111D36', border: 'rgba(0,220,255,0.22)', cyan: '#00E5FF', text: '#F0F7FF', muted: '#8BA3C7', green: '#34D399' };

export default function GovernmentStudyScreen() {
  const { language } = useLanguage();
  const [tab, setTab] = useState('planner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syllabus, setSyllabus] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskMinutes, setTaskMinutes] = useState('30');
  const [summary, setSummary] = useState({});
  const [streak, setStreak] = useState(0);
  const [weekly, setWeekly] = useState(null);
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [answer, setAnswer] = useState('');
  const [practiceSet, setPracticeSet] = useState([]);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [asking, setAsking] = useState(false);

  const loadPlanner = useCallback(async () => {
    const [today, report] = await Promise.all([
      API.get('/student-tools/planner/today'),
      API.get('/student-tools/planner/weekly-report')
    ]);
    setTasks(today.data.tasks || []);
    setSummary(today.data.summary || {});
    setStreak(today.data.streak || 0);
    setWeekly(report.data);
  }, []);

  const loadSyllabus = useCallback(async () => {
    const response = await API.get('/student-tools/syllabus');
    setSyllabus(response.data || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { await Promise.all([loadPlanner(), loadSyllabus()]); }
    catch (e) { setError(e.response?.data?.message || 'Student login required. Please sign in and try again.'); }
    finally { setLoading(false); }
  }, [loadPlanner, loadSyllabus]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveTasks = async (next) => {
    setTasks(next);
    try {
      const response = await API.put('/student-tools/planner/today', { tasks: next });
      setTasks(response.data.tasks || next);
      setSummary(response.data.summary || {});
      const report = await API.get('/student-tools/planner/weekly-report');
      setWeekly(report.data);
    } catch (e) { Alert.alert('Could not save plan', e.response?.data?.message || 'Please try again'); }
  };

  const addTask = () => {
    const title = taskTitle.trim();
    if (!title) return;
    if (tasks.length >= 20) return Alert.alert('Daily limit', 'You can add up to 20 tasks per day.');
    const next = [...tasks, { title, subject: taskSubject.trim(), targetMinutes: Math.max(5, Math.min(600, Number(taskMinutes) || 30)), completed: false }];
    setTaskTitle(''); setTaskSubject('');
    saveTasks(next);
  };

  const toggleTask = (index) => saveTasks(tasks.map((task, i) => i === index ? { ...task, completed: !task.completed } : task));

  const toggleTopic = async (item, topic) => {
    const nextValue = !topic.completed;
    setSyllabus(current => current.map(row => row._id === item._id ? {
      ...row, topics: row.topics.map(t => t.title === topic.title ? { ...t, completed: nextValue } : t),
      completedTopics: row.completedTopics + (nextValue ? 1 : -1),
      completionPercent: row.totalTopics ? Math.round((row.completedTopics + (nextValue ? 1 : -1)) / row.totalTopics * 100) : 0
    } : row));
    try { await API.put('/student-tools/syllabus/' + item._id + '/topic', { topic: topic.title, completed: nextValue }); }
    catch (e) { Alert.alert('Progress not saved', e.response?.data?.message || 'Please refresh and retry'); refresh(); }
  };

  const askTutor = async () => {
    if (!question.trim()) return;
    setAsking(true); setAnswer('');
    try {
      const response = await API.post('/student-tools/assistant/explain', { question: question.trim(), context: context.trim(), language: language === 'hi' ? 'hi' : 'en' });
      setAnswer(response.data.answer || '');
    } catch (e) { setAnswer(e.response?.data?.message || 'AI Study Assistant is not available right now.'); }
    finally { setAsking(false); }
  };

  const generatePractice = async () => {
    const topic = question.trim();
    if (!topic) return Alert.alert('Enter a topic', 'Type a topic such as Indian Constitution or Percentage first.');
    setGeneratingPractice(true); setPracticeSet([]); setPracticeAnswers({});
    try {
      const response = await API.post('/student-tools/assistant/practice', { topic, language: language === 'hi' ? 'hi' : 'en' });
      setPracticeSet(response.data.questions || []);
    } catch (e) { Alert.alert('Practice generation failed', e.response?.data?.message || 'Please try again'); }
    finally { setGeneratingPractice(false); }
  };

  const Tab = ({ id, label }) => <TouchableOpacity onPress={() => setTab(id)} style={[styles.tab, tab === id && styles.tabActive]}><Text style={[styles.tabText, tab === id && { color: C.cyan }]}>{label}</Text></TouchableOpacity>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>GOVERNMENT EXAM PREP</Text>
        <Text style={styles.title}>Study Tools</Text>
        <Text style={styles.sub}>Plan your day, track syllabus and learn with an AI tutor</Text>
      </View>
      <View style={styles.tabs}>
        <Tab id="planner" label="Planner" />
        <Tab id="syllabus" label="Syllabus" />
        <Tab id="assistant" label="AI Tutor" />
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={C.cyan} size="large" /></View> : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!!error && <Text style={styles.error}>{error}</Text>}
          {tab === 'planner' && <>
            <View style={styles.stats}>
              <View style={styles.stat}><Text style={styles.statNum}>{summary.completionPercent || 0}%</Text><Text style={styles.statLabel}>Today's progress</Text></View>
              <View style={styles.stat}><Text style={styles.statNum}>{streak} 🔥</Text><Text style={styles.statLabel}>Study streak</Text></View>
              <View style={styles.stat}><Text style={styles.statNum}>{summary.completedMinutes || 0}m</Text><Text style={styles.statLabel}>Study time</Text></View>
            </View>
            <Text style={styles.section}>Today's targets</Text>
            <TextInput value={taskTitle} onChangeText={setTaskTitle} placeholder="e.g. Revise Indian Polity" placeholderTextColor={C.muted} style={styles.input} />
            <View style={styles.inline}>
              <TextInput value={taskSubject} onChangeText={setTaskSubject} placeholder="Subject (optional)" placeholderTextColor={C.muted} style={[styles.input, { flex: 1 }]} />
              <TextInput value={taskMinutes} onChangeText={setTaskMinutes} keyboardType="number-pad" placeholder="Minutes" placeholderTextColor={C.muted} style={[styles.input, { width: 90 }]} />
            </View>
            <TouchableOpacity onPress={addTask} style={styles.primary}><Text style={styles.primaryText}>+ Add daily target</Text></TouchableOpacity>
            {tasks.map((task, i) => <TouchableOpacity key={i} onPress={() => toggleTask(i)} style={styles.task}>
              <Text style={[styles.check, task.completed && { color: C.green }]}>{task.completed ? '✓' : '○'}</Text>
              <View style={{ flex: 1 }}><Text style={[styles.taskTitle, task.completed && styles.done]}>{task.title}</Text><Text style={styles.meta}>{task.subject || 'General'} · {task.targetMinutes} min</Text></View>
            </TouchableOpacity>)}
            {!tasks.length && <Text style={styles.empty}>Add your first study target for today.</Text>}
            {weekly && <View style={styles.panel}><Text style={styles.section}>Weekly report</Text><Text style={styles.meta}>{weekly.totals?.completedTasks || 0} tasks completed · {weekly.totals?.completedMinutes || 0} of {weekly.totals?.plannedMinutes || 0} planned minutes</Text></View>}
          </>}
          {tab === 'syllabus' && <>
            <Text style={styles.section}>Exam-wise syllabus progress</Text>
            {!syllabus.length && <Text style={styles.empty}>No active syllabus topics found. Add exam syllabus from the admin panel.</Text>}
            {syllabus.map(item => <View key={item._id} style={styles.panel}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.meta}>{item.category?.name || 'Exam'} · {item.subject?.name || 'Subject'} · {item.completionPercent || 0}% complete</Text>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: (item.completionPercent || 0) + '%' }]} /></View>
              {(item.topics || []).map((topic, i) => <TouchableOpacity key={i} onPress={() => toggleTopic(item, topic)} style={styles.topic}>
                <Text style={[styles.check, topic.completed && { color: C.green }]}>{topic.completed ? '✓' : '○'}</Text>
                <Text style={[styles.taskTitle, topic.completed && styles.done]}>{topic.title}</Text>
              </TouchableOpacity>)}
            </View>)}
          </>}
          {tab === 'assistant' && <>
            <View style={styles.panel}><Text style={styles.cardTitle}>AI Study Assistant</Text><Text style={styles.meta}>Ask for a simple explanation, why an answer is wrong, formulas or memory tricks.</Text></View>
            <TextInput value={question} onChangeText={setQuestion} multiline placeholder="Ask a question or paste a concept..." placeholderTextColor={C.muted} style={[styles.input, styles.multiline]} />
            <TextInput value={context} onChangeText={setContext} multiline placeholder="Options / your selected answer (optional)" placeholderTextColor={C.muted} style={[styles.input, styles.multiline]} />
            <TouchableOpacity onPress={askTutor} disabled={asking} style={styles.primary}><Text style={styles.primaryText}>{asking ? 'Thinking…' : 'Explain this'}</Text></TouchableOpacity>
            <TouchableOpacity onPress={generatePractice} disabled={generatingPractice} style={styles.secondary}><Text style={styles.secondaryText}>{generatingPractice ? 'Generating…' : 'Generate 5 practice questions'}</Text></TouchableOpacity>
            {practiceSet.map((item, i) => <View key={i} style={styles.panel}>
              <Text style={styles.cardTitle}>Q{i + 1}. {item.question}</Text>
              {item.options.map((option, j) => <TouchableOpacity key={j} onPress={() => setPracticeAnswers(prev => ({ ...prev, [i]: j }))} style={[styles.topic, practiceAnswers[i] === j && { backgroundColor: '#17364A' }]}>
                <Text style={styles.taskTitle}>{String.fromCharCode(65 + j)}. {option}</Text>
              </TouchableOpacity>)}
              {practiceAnswers[i] !== undefined && <Text style={styles.meta}>{practiceAnswers[i] === item.correctAnswer ? 'Correct!' : 'Correct answer: ' + item.options[item.correctAnswer]} · {item.explanation}</Text>}
              <Text style={styles.meta}>AI-generated practice · Not a previous-year question</Text>
            </View>)}
            {asking && <ActivityIndicator color={C.cyan} style={{ margin: 18 }} />}
            {!!answer && <View style={styles.answer}><Text style={styles.answerTitle}>Explanation</Text><Text style={styles.answerText}>{answer}</Text></View>}
            <Text style={styles.meta}>AI answers can make mistakes. Verify important exam facts with official sources.</Text>
          </>}
          <TouchableOpacity onPress={refresh} style={styles.refresh}><Text style={styles.refreshText}>↻ Refresh data</Text></TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 54, paddingHorizontal: 22, paddingBottom: 18 },
  kicker: { color: C.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: C.text, fontSize: 28, fontWeight: '800', marginTop: 7 },
  sub: { color: C.muted, fontSize: 12, marginTop: 5 },
  tabs: { flexDirection: 'row', marginHorizontal: 18, borderBottomWidth: 1, borderColor: C.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: C.cyan },
  tabText: { color: C.muted, fontWeight: '700', fontSize: 12 },
  content: { padding: 18, paddingBottom: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#FCA5A5', marginBottom: 12, fontSize: 12 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 12 },
  statNum: { color: C.cyan, fontSize: 20, fontWeight: '800' },
  statLabel: { color: C.muted, fontSize: 10, marginTop: 4 },
  section: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 12, marginTop: 8 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 9, fontSize: 13 },
  inline: { flexDirection: 'row', gap: 8 },
  primary: { backgroundColor: '#073C52', borderColor: C.cyan, borderWidth: 1, borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 14 },
  primaryText: { color: C.cyan, fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 14 },
  secondaryText: { color: C.text, fontWeight: '700' },
  task: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.card, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  check: { color: C.muted, fontSize: 20, width: 22, fontWeight: '800' },
  taskTitle: { color: C.text, fontWeight: '700', fontSize: 13 },
  done: { textDecorationLine: 'line-through', color: C.muted },
  meta: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  empty: { color: C.muted, padding: 16, textAlign: 'center', backgroundColor: C.card, borderRadius: 12 },
  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: '#253550', borderRadius: 6, overflow: 'hidden', marginVertical: 12 },
  progressFill: { height: 6, backgroundColor: C.green },
  topic: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  answer: { backgroundColor: '#102A3B', borderRadius: 14, borderWidth: 1, borderColor: C.cyan, padding: 15, marginTop: 12, marginBottom: 12 },
  answerTitle: { color: C.cyan, fontWeight: '800', marginBottom: 8 },
  answerText: { color: C.text, lineHeight: 21, fontSize: 13 },
  refresh: { padding: 14, alignItems: 'center', marginTop: 10 },
  refreshText: { color: C.cyan, fontWeight: '700' }
});
