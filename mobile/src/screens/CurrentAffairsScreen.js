import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import API from '../services/api';
import { useLanguage } from '../context/LanguageContext';
const monthLabel = date => date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
export default function CurrentAffairsScreen() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [language, setLanguage] = useState('en');
  const [period, setPeriod] = useState('daily');
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selectedMonth = new Date(new Date().getFullYear(), new Date().getMonth() - monthOffset, 1);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const params = { language, limit: 100 };
      if (period === 'daily') {
        const from = new Date(); from.setDate(from.getDate() - 7);
        params.from = from.toISOString();
      } else {
        const from = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const to = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
        params.from = from.toISOString(); params.to = to.toISOString();
      }
      const r = await API.get('/current-affairs', { params });
      setItems(r.data || []);
    } catch (e) { setError(e.response?.data?.message || 'Current affairs could not be loaded'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [language, period, monthOffset]);
  return <View style={s.page}>
    <Text style={s.title}>{t('currentAffairs')}</Text>
    <View style={s.row}>
      {['daily','monthly'].map(v => <TouchableOpacity key={v} onPress={() => setPeriod(v)} style={[s.lang, period===v && s.active]}><Text style={s.langText}>{v==='daily'?t('daily'):t('monthly')}</Text></TouchableOpacity>)}
      {['en','hi'].map(v => <TouchableOpacity key={v} onPress={() => setLanguage(v)} style={[s.lang, language===v && s.active]}><Text style={s.langText}>{v==='en'?'English':'हिन्दी'}</Text></TouchableOpacity>)}
    </View>
    {period === 'monthly' && <View style={s.monthRow}>
      <TouchableOpacity disabled={monthOffset>=11} onPress={() => setMonthOffset(v=>v+1)}><Text style={s.monthBtn}>{t('older')}</Text></TouchableOpacity>
      <Text style={s.monthText}>{monthLabel(selectedMonth)}</Text>
      <TouchableOpacity disabled={monthOffset===0} onPress={() => setMonthOffset(v=>Math.max(0,v-1))}><Text style={s.monthBtn}>{t('newer')}</Text></TouchableOpacity>
    </View>}
    {loading ? <ActivityIndicator color="#00E5FF" /> : <ScrollView>
      {!!error && <Text style={s.muted}>{error}</Text>}
      {!error && !items.length && <Text style={s.muted}>{t('noCurrentAffairs')}</Text>}
      {items.map(item => <View key={item._id} style={s.card}>
        <Text style={s.topic}>{item.topic} · {new Date(item.sourceDate).toLocaleDateString()}</Text>
        <Text style={s.heading}>{item.title}</Text>
        {!!item.summary && <Text style={s.body}>{item.summary}</Text>}
        <Text style={s.question}>{item.question}</Text>
        {item.options.map((o,i)=><Text key={i} style={s.option}>{String.fromCharCode(65+i)}. {o}</Text>)}
        {!!item.sourceUrl && <Text style={s.source}>{t('source')}: {item.sourceName || 'Reference'} · {item.sourceUrl}</Text>}
      </View>)}
    </ScrollView>}
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#060B18',padding:18,paddingTop:48},title:{color:'#F0F7FF',fontSize:24,fontWeight:'800',marginBottom:16},row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12},lang:{padding:10,borderRadius:10,borderWidth:1,borderColor:'#345',minWidth:70,alignItems:'center'},active:{borderColor:'#00E5FF',backgroundColor:'#103044'},langText:{color:'#F0F7FF'},monthRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12},monthBtn:{color:'#00E5FF',fontWeight:'700'},monthText:{color:'#F0F7FF',fontWeight:'700'},card:{backgroundColor:'#121C37',borderColor:'#23445A',borderWidth:1,borderRadius:14,padding:16,marginBottom:12},topic:{color:'#00E5FF',fontSize:11,marginBottom:8},heading:{color:'#F0F7FF',fontSize:17,fontWeight:'700',marginBottom:8},body:{color:'#AFC1DA',lineHeight:20,marginBottom:10},question:{color:'#F0F7FF',fontWeight:'700',marginBottom:8},option:{color:'#CFD9E8',paddingVertical:3},muted:{color:'#8BA3C7',marginVertical:12},source:{color:'#7F9BB8',fontSize:10,marginTop:10}});
