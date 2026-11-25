import React from 'react';
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

const Stack = createNativeStackNavigator();

export default function App() {
  return (
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
          <Stack.Screen name="MockTests" component={MockTestsScreen} />
          <Stack.Screen name="MockTestAttempt" component={MockTestAttemptScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
