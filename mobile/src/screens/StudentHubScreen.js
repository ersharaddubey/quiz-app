import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import API, { persistStudentToken, clearStudentToken } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function StudentHubScreen() {
  const { t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [revision, setRevision] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLearning = async (activeToken) => {
    const headers = { Authorization: 'Bearer ' + activeToken };
    const [a, l, r] = await Promise.all([
      API.get('/student-learning/analytics', { headers }),
      API.get('/student-learning/leaderboard'),
      API.get('/student-learning/revision/wrong', { headers })
    ]);
    setData(a.data);
    setLeaderboard(l.data.rankings || []);
    setRevision(r.data || []);
  };

  // App restores the encrypted token before navigation mounts. Validate it with
  // the API so an expired/revoked session returns to the sign-in screen.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      const saved = API.defaults.headers.common.Authorization;
      const savedToken = typeof saved === 'string' ? saved.replace(/^Bearer\s+/i, '') : '';
      if (!savedToken) return;
      setLoading(true);
      try {
        await API.get('/students/me');
        if (!active) return;
        setToken(savedToken);
        await loadLearning(savedToken);
      } catch (e) {
        await clearStudentToken();
        if (active) setError('Your saved session expired. Please sign in again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    restore();
    return () => { active = false; };
  }, []);

  const auth = async () => {
    setLoading(true); setError('');
    try {
      const path = mode === 'register' ? '/students/register' : '/students/login';
      const payload = mode === 'register' ? { name, email, password } : { email, password };
      const result = await API.post(path, payload);
      const t = result.data.token;
      await persistStudentToken(t);
      setToken(t);
      await loadLearning(t);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not sign in. Check server configuration.');
    } finally { setLoading(false); }
  };

  const refresh = async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { await loadLearning(token); }
    catch (e) { setError(e.response?.data?.message || 'Refresh failed'); }
    finally { setLoading(false); }
  };

  const logout = async () => {
    await clearStudentToken();
    setToken('');
    setData(null);
    setLeaderboard([]);
    setRevision([]);
    setPassword('');
    setError('');
  };

  if (!token) return <View style={s.page}>
    <Text style={s.title}>{t('studentAccount')}</Text>
    <Text style={s.sub}>Sign in to save mock-test attempts, analytics and revision history. Your session is encrypted on this device.</Text>
    {mode === 'register' && <TextInput value={name} onChangeText={setName} placeholder={t('fullName')} placeholderTextColor="#8BA3C7" style={s.input}/>}
    <TextInput value={email} onChangeText={setEmail} placeholder={t('email')} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#8BA3C7" style={s.input}/>
    <TextInput value={password} onChangeText={setPassword} placeholder={t('password')} secureTextEntry placeholderTextColor="#8BA3C7" style={s.input}/>
    {!!error && <Text style={s.error}>{error}</Text>}
    <TouchableOpacity style={s.button} onPress={auth} disabled={loading}><Text style={s.buttonText}>{loading ? 'Please wait…' : mode === 'register' ? t('createAccount') : t('signIn')}</Text></TouchableOpacity>
    <TouchableOpacity onPress={()=>{setMode(mode==='login'?'register':'login');setError('');}}><Text style={s.link}>{mode==='login'?'New student? Create account':'Already registered? Sign in'}</Text></TouchableOpacity>
  </View>;

  const summary = data?.summary || {};
  return <ScrollView style={s.page} contentContainerStyle={{paddingBottom:40}}>
    <View style={s.row}><Text style={s.title}>{t('myLearning')}</Text><View style={s.actions}><TouchableOpacity onPress={refresh}><Text style={s.link}>{t('refresh')}</Text></TouchableOpacity><TouchableOpacity onPress={logout}><Text style={s.logout}>{t('signOut')}</Text></TouchableOpacity></View></View>
    <View style={s.grid}>
      <View style={s.metric}><Text style={s.metricValue}>{summary.attempts || 0}</Text><Text style={s.metricLabel}>{t('mockAttempts')}</Text></View>
      <View style={s.metric}><Text style={s.metricValue}>{Number(summary.averageAccuracy || 0).toFixed(1)}%</Text><Text style={s.metricLabel}>{t('averageAccuracy')}</Text></View>
      <View style={s.metric}><Text style={s.metricValue}>{summary.totalCorrect || 0}</Text><Text style={s.metricLabel}>{t('correctAnswers')}</Text></View>
      <View style={s.metric}><Text style={s.metricValue}>{summary.bestScore || 0}</Text><Text style={s.metricLabel}>{t('bestScore')}</Text></View>
    </View>
    <Text style={s.heading}>{t('weakTopics')}</Text>
    {revision.length ? revision.map(q=><View key={q._id} style={s.card}><Text style={s.question}>{q.question}</Text><Text style={s.meta}>{q.subjectName || q.categoryName || 'General'}</Text><Text style={s.answer}>Correct: {q.options?.[q.correctAnswer] || 'See explanation'}</Text>{!!q.explanation&&<Text style={s.meta}>{q.explanation}</Text>}</View>) : <Text style={s.meta}>Wrong questions from submitted mock tests will appear here.</Text>}
    <Text style={s.heading}>{t('weeklyLeaderboard')}</Text>
    {leaderboard.map((p,i)=><View key={p.studentId} style={s.rank}><Text style={s.rankText}>#{i+1}  {p.name}</Text><Text style={s.rankText}>{p.points} pts</Text></View>)}
    {!leaderboard.length&&<Text style={s.meta}>No ranked attempts yet.</Text>}
    {!!error&&<Text style={s.error}>{error}</Text>}
  </ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#060B18',padding:20,paddingTop:48},title:{color:'#F0F7FF',fontSize:24,fontWeight:'800'},sub:{color:'#8BA3C7',marginVertical:14,lineHeight:21},input:{borderWidth:1,borderColor:'#345',borderRadius:10,padding:13,color:'#F0F7FF',marginTop:12},button:{backgroundColor:'#00D8F0',padding:14,borderRadius:10,alignItems:'center',marginTop:16},buttonText:{color:'#06101E',fontWeight:'800'},link:{color:'#00E5FF',marginTop:18},logout:{color:'#F87171',marginTop:18,marginLeft:16},error:{color:'#F87171',marginTop:12},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},actions:{flexDirection:'row',alignItems:'center'},grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:18},metric:{width:'48%',backgroundColor:'#121C37',borderRadius:12,padding:14},metricValue:{color:'#00E5FF',fontSize:25,fontWeight:'900'},metricLabel:{color:'#8BA3C7',marginTop:4},heading:{color:'#F0F7FF',fontSize:18,fontWeight:'800',marginTop:26,marginBottom:10},card:{backgroundColor:'#121C37',padding:14,borderRadius:12,marginBottom:9},question:{color:'#F0F7FF',fontWeight:'700'},meta:{color:'#8BA3C7',fontSize:12,marginTop:5},answer:{color:'#34D399',marginTop:8},rank:{flexDirection:'row',justifyContent:'space-between',padding:12,borderBottomWidth:1,borderBottomColor:'#234'},rankText:{color:'#F0F7FF'}
});
