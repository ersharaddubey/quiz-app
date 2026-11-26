import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import API from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useLanguage } from '../context/LanguageContext';

export default function JobAlertsScreen() {
  const { t, language } = useLanguage();
  const { t, language } = useLanguage();
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  useEffect(()=>{ API.get('/job-alerts').then(r=>setItems(r.data||[])).catch(e=>setError(e.response?.data?.message||'Job alerts could not be loaded')).finally(()=>setLoading(false)); },[]);
  return <View style={s.page}><Text style={s.title}>{t('governmentJobAlerts')}</Text>
    {loading?<ActivityIndicator color="#00E5FF"/>:<ScrollView>
      {!!error&&<Text style={s.muted}>{error}</Text>}
      {!error&&!items.length&&<Text style={s.muted}>{t('noJobAlerts')}</Text>}
      {items.map(item=><View key={item._id} style={s.card}>
        <Text style={s.heading}>{item.title}</Text><Text style={s.org}>{item.organization}</Text>
        {!!item.description&&<Text style={s.body}>{item.description}</Text>}
        {item.vacancies!=null&&<Text style={s.meta}>{language === 'hi' ? 'रिक्तियाँ' : 'Vacancies'}: {item.vacancies}</Text>}
        {!!item.applicationEnd&&<Text style={s.meta}>{language === 'hi' ? 'अंतिम तिथि' : 'Last date'}: {new Date(item.applicationEnd).toLocaleDateString()}</Text>}
        {!!item.examDate&&<Text style={s.meta}>{language === 'hi' ? 'परीक्षा तिथि' : 'Exam date'}: {new Date(item.examDate).toLocaleDateString()}</Text>}
        <TouchableOpacity style={s.button} onPress={()=>Linking.openURL(item.officialUrl)}><Text style={s.buttonText}>{t('officialNotification')}</Text></TouchableOpacity>
        {!!item.admitCardUrl&&<TouchableOpacity onPress={()=>Linking.openURL(item.admitCardUrl)}><Text style={s.link}>{t('admitCard')}</Text></TouchableOpacity>}
        {!!item.resultUrl&&<TouchableOpacity onPress={()=>Linking.openURL(item.resultUrl)}><Text style={s.link}>{t('result')}</Text></TouchableOpacity>}
      </View>)}
    </ScrollView>}
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#060B18',padding:18,paddingTop:48},title:{color:'#F0F7FF',fontSize:24,fontWeight:'800',marginBottom:16},card:{backgroundColor:'#121C37',borderColor:'#23445A',borderWidth:1,borderRadius:14,padding:16,marginBottom:12},heading:{color:'#F0F7FF',fontSize:17,fontWeight:'700'},org:{color:'#00E5FF',marginTop:4,marginBottom:8},body:{color:'#AFC1DA',lineHeight:20},meta:{color:'#8BA3C7',marginTop:6,fontSize:12},button:{marginTop:14,backgroundColor:'#00D8F0',padding:12,borderRadius:10,alignItems:'center'},buttonText:{color:'#06101E',fontWeight:'800'},link:{color:'#00E5FF',marginTop:10},muted:{color:'#8BA3C7',marginVertical:12}});
