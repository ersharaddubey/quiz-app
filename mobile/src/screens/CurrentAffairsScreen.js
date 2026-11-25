import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import API from '../services/api';

export default function CurrentAffairsScreen() {
  const [items, setItems] = useState([]);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async (lang) => {
    setLoading(true); setError('');
    try { const r = await API.get('/current-affairs', { params: { language: lang, limit: 50 } }); setItems(r.data || []); }
    catch (e) { setError(e.response?.data?.message || 'Current affairs could not be loaded'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(language); }, [language]);
  return <View style={s.page}>
    <Text style={s.title}>Daily Current Affairs</Text>
    <View style={s.row}>
      {['en','hi'].map(v => <TouchableOpacity key={v} onPress={() => setLanguage(v)} style={[s.lang, language===v && s.active]}><Text style={s.langText}>{v==='en'?'English':'हिन्दी'}</Text></TouchableOpacity>)}
    </View>
    {loading ? <ActivityIndicator color="#00E5FF" /> : <ScrollView>
      {!!error && <Text style={s.muted}>{error}</Text>}
      {!error && !items.length && <Text style={s.muted}>No verified current-affairs entries published yet.</Text>}
      {items.map(item => <View key={item._id} style={s.card}>
        <Text style={s.topic}>{item.topic} · {new Date(item.sourceDate).toLocaleDateString()}</Text>
        <Text style={s.heading}>{item.title}</Text>
        {!!item.summary && <Text style={s.body}>{item.summary}</Text>}
        <Text style={s.question}>{item.question}</Text>
        {item.options.map((o,i)=><Text key={i} style={s.option}>{String.fromCharCode(65+i)}. {o}</Text>)}
        {!!item.explanation && <Text style={s.muted}>Explanation is available after editorial review.</Text>}
        {!!item.sourceUrl && <Text style={s.source}>Source: {item.sourceName || 'Reference'} · {item.sourceUrl}</Text>}
      </View>)}
    </ScrollView>}
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#060B18',padding:18,paddingTop:48},title:{color:'#F0F7FF',fontSize:24,fontWeight:'800',marginBottom:16},row:{flexDirection:'row',gap:10,marginBottom:16},lang:{padding:10,borderRadius:10,borderWidth:1,borderColor:'#345',minWidth:90,alignItems:'center'},active:{borderColor:'#00E5FF',backgroundColor:'#103044'},langText:{color:'#F0F7FF'},card:{backgroundColor:'#121C37',borderColor:'#23445A',borderWidth:1,borderRadius:14,padding:16,marginBottom:12},topic:{color:'#00E5FF',fontSize:11,marginBottom:8},heading:{color:'#F0F7FF',fontSize:17,fontWeight:'700',marginBottom:8},body:{color:'#AFC1DA',lineHeight:20,marginBottom:10},question:{color:'#F0F7FF',fontWeight:'700',marginBottom:8},option:{color:'#CFD9E8',paddingVertical:3},muted:{color:'#8BA3C7',marginVertical:12},source:{color:'#7F9BB8',fontSize:10,marginTop:10}});
