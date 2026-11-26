import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const LANGUAGE_KEY = 'quiz_app_language';
const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, t: key => key });

const dictionaries = {
  en: {
    home: 'Sarkari Exam Quiz', currentAffairs: 'Current Affairs', mockTests: 'Mock Tests',
    pyq: 'PYQ Bank', jobs: 'Job Alerts', progress: 'My Progress', language: 'हिन्दी',
    loading: 'Loading exams...', daily: 'Daily', monthly: 'Monthly', older: '‹ Older',
    newer: 'Newer ›', noCurrentAffairs: 'No published current-affairs entries found for this period and language.',
    source: 'Source', question: 'QUESTION', checkAnswer: 'Check Answer', nextQuestion: 'Next Question →',
    finishQuiz: 'Finish Quiz', reviewAnswers: 'Review Answers', yourAnswer: 'Your answer',
    correct: 'Correct', wrong: 'Wrong', backHome: '← Back to Home', fullMockTests: 'Full Mock Tests',
    noMockTests: 'No mock tests published yet.', startMockTest: 'Start Mock Test',
    previousYearQuestions: 'Previous Year Questions', examName: 'Exam name e.g. SSC CGL',
    year: 'Year', searchPYQ: 'Search PYQs', noPYQ: 'No provenance-verified PYQs found. Admin must verify the original exam and year.',
    governmentJobAlerts: 'Government Job Alerts', noJobAlerts: 'No verified job alerts published yet.',
    officialNotification: 'Official Notification ↗', admitCard: 'Admit Card', result: 'Result',
    studentAccount: 'Student Account', signIn: 'Sign in', createAccount: 'Create account',
    signOut: 'Sign out', refresh: 'Refresh', myLearning: 'My Learning',
    mockAttempts: 'Mock attempts', averageAccuracy: 'Average accuracy', correctAnswers: 'Correct answers',
    bestScore: 'Best score', weakTopics: 'Weak topics / repeated mistakes', weeklyLeaderboard: 'Weekly leaderboard',
    pleaseWait: 'Please wait…', password: 'Password (min 8 characters)', email: 'Email address',
    fullName: 'Full name', noQuestions: 'No questions available.'
  },
  hi: {
    home: 'सरकारी परीक्षा क्विज़', currentAffairs: 'करंट अफेयर्स', mockTests: 'मॉक टेस्ट',
    pyq: 'पिछले वर्ष के प्रश्न', jobs: 'सरकारी नौकरी अलर्ट', progress: 'मेरी प्रगति', language: 'English',
    loading: 'परीक्षाएँ लोड हो रही हैं...', daily: 'दैनिक', monthly: 'मासिक', older: '‹ पुराने',
    newer: 'नए ›', noCurrentAffairs: 'इस अवधि और भाषा के लिए कोई प्रकाशित करंट अफेयर्स उपलब्ध नहीं है।',
    source: 'स्रोत', question: 'प्रश्न', checkAnswer: 'उत्तर जाँचें', nextQuestion: 'अगला प्रश्न →',
    finishQuiz: 'क्विज़ समाप्त करें', reviewAnswers: 'उत्तर समीक्षा', yourAnswer: 'आपका उत्तर',
    correct: 'सही', wrong: 'गलत', backHome: '← होम पर जाएँ', fullMockTests: 'पूर्ण मॉक टेस्ट',
    noMockTests: 'अभी कोई मॉक टेस्ट प्रकाशित नहीं है।', startMockTest: 'मॉक टेस्ट शुरू करें',
    previousYearQuestions: 'पिछले वर्षों के प्रश्न', examName: 'परीक्षा का नाम जैसे SSC CGL',
    year: 'वर्ष', searchPYQ: 'PYQ खोजें', noPYQ: 'सत्यापित पुराने प्रश्न नहीं मिले। एडमिन को मूल परीक्षा और वर्ष सत्यापित करना होगा।',
    governmentJobAlerts: 'सरकारी नौकरी अलर्ट', noJobAlerts: 'अभी कोई सत्यापित नौकरी अलर्ट प्रकाशित नहीं है।',
    officialNotification: 'आधिकारिक अधिसूचना ↗', admitCard: 'प्रवेश पत्र', result: 'परिणाम',
    studentAccount: 'छात्र खाता', signIn: 'लॉग इन', createAccount: 'खाता बनाएँ',
    signOut: 'लॉग आउट', refresh: 'रीफ्रेश', myLearning: 'मेरी पढ़ाई',
    mockAttempts: 'मॉक टेस्ट प्रयास', averageAccuracy: 'औसत सटीकता', correctAnswers: 'सही उत्तर',
    bestScore: 'सर्वश्रेष्ठ स्कोर', weakTopics: 'कमज़ोर विषय / बार-बार हुई गलतियाँ', weeklyLeaderboard: 'साप्ताहिक लीडरबोर्ड',
    pleaseWait: 'कृपया प्रतीक्षा करें…', password: 'पासवर्ड (कम से कम 8 अक्षर)', email: 'ईमेल पता',
    fullName: 'पूरा नाम', noQuestions: 'कोई प्रश्न उपलब्ध नहीं है।'
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  useEffect(() => {
    SecureStore.getItemAsync(LANGUAGE_KEY)
      .then(value => { if (value === 'en' || value === 'hi') setLanguageState(value); })
      .catch(error => console.warn('Could not restore language preference:', error?.message || error));
  }, []);
  const setLanguage = async value => {
    if (value !== 'en' && value !== 'hi') return;
    setLanguageState(value);
    try { await SecureStore.setItemAsync(LANGUAGE_KEY, value); }
    catch (error) { console.warn('Could not save language preference:', error?.message || error); }
  };
  const value = useMemo(() => ({
    language,
    setLanguage,
    t: key => dictionaries[language]?.[key] || dictionaries.en[key] || key
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
