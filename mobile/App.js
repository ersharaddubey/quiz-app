import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';
import CurrentAffairsScreen from './src/screens/CurrentAffairsScreen';
import JobAlertsScreen from './src/screens/JobAlertsScreen';
import MockTestsScreen from './src/screens/MockTestsScreen';
import MockTestAttemptScreen from './src/screens/MockTestAttemptScreen';
import PYQBankScreen from './src/screens/PYQBankScreen';
import StudentHubScreen from './src/screens/StudentHubScreen';
import GovernmentStudyScreen from './src/screens/GovernmentStudyScreen';
import { restoreStudentSession } from './src/services/api';
import { LanguageProvider } from './src/context/LanguageContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    restoreStudentSession().finally(() => {
      if (mounted) setSessionReady(true);
    });
    return () => { mounted = false; };
  }, []);

  if (!sessionReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#060B18', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#00E5FF" size="large" />
          <Text style={{ color: '#8BA3C7', marginTop: 12 }}>Restoring your secure session…</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <LanguageProvider>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#060B18' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen name="CurrentAffairs" component={CurrentAffairsScreen} />
          <Stack.Screen name="JobAlerts" component={JobAlertsScreen} />
          <Stack.Screen name="PYQBank" component={PYQBankScreen} />
          <Stack.Screen name="MockTests" component={MockTestsScreen} />
          <Stack.Screen name="MockTestAttempt" component={MockTestAttemptScreen} />
          <Stack.Screen name="StudentHub" component={StudentHubScreen} />
          <Stack.Screen name="GovernmentStudy" component={GovernmentStudyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </LanguageProvider>
  );
}
