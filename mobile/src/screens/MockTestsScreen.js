import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import API from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function MockTestsScreen({navigation}) {
  const { t } = useLanguage();
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  useEffect(()=>{API.get('/mock-tests').then(r=>setItems(r.data||[])).catch(e=>setError(e.response?.data?.message||'Mock tests could not be loaded')).finally(()=>setLoading(false));},[]);
  return <View style={s.page}><Text style={s.title}>{t('fullMockTests')}</Text>
    {loading?<ActivityIndicator color="#00E5FF"/>:<ScrollView>
      {!!error&&<Text style={s.muted}>{error}</Text>}
      {!error&&!items.length&&<Text style={s.muted}>{t('noMockTests')}</Text>}
      {items.map(item=><View key={item._id} style={s.card}>
        <Text style={s.heading}>{item.title}</Text><Text style={s.meta}>{item.category?.name||'Government Exam'} · {item.durationMinutes} min</Text>
        <Text style={s.meta}>+{item.marksPerQuestion} correct · -{item.negativeMarksPerWrong} wrong</Text>
        {!!item.instructions&&<Text style={s.body}>{item.instructions}</Text>}
        <TouchableOpacity style={s.button} onPress={()=>navigation.navigate('MockTestAttempt',{testId:item._id,title:item.title})}><Text style={s.buttonText}>{t('startMockTest')}</Text></TouchableOpacity>
      </View>)}
    </ScrollView>}
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#060B18',padding:18,paddingTop:48},title:{color:'#F0F7FF',fontSize:24,fontWeight:'800',marginBottom:16},card:{backgroundColor:'#121C37',borderColor:'#23445A',borderWidth:1,borderRadius:14,padding:16,marginBottom:12},heading:{color:'#F0F7FF',fontSize:17,fontWeight:'700'},meta:{color:'#00E5FF',fontSize:12,marginTop:7},body:{color:'#AFC1DA',marginTop:8},button:{marginTop:14,backgroundColor:'#00D8F0',padding:12,borderRadius:10,alignItems:'center'},buttonText:{color:'#06101E',fontWeight:'800'},muted:{color:'#8BA3C7',marginVertical:12}});
