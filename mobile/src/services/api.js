import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const STUDENT_TOKEN_KEY = 'quiz_app_student_token';
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!configuredApiUrl && !__DEV__) {
  console.warn('EXPO_PUBLIC_API_URL missing. Set live HTTPS API URL and rebuild.');
}

const API_URL = configuredApiUrl || (__DEV__ ? 'http://10.0.2.2:5001/api' : '');

const API = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response && error.code === 'ERR_NETWORK') {
      error.message = 'Cannot reach quiz server. Check internet & EXPO_PUBLIC_API_URL.';
    }
    return Promise.reject(error);
  }
);

export const setStudentToken = (token) => {
  if (token) API.defaults.headers.common.Authorization = 'Bearer ' + token;
  else delete API.defaults.headers.common.Authorization;
};

export const persistStudentToken = async (token) => {
  if (!token || typeof token !== 'string') throw new Error('A valid student token is required');
  await SecureStore.setItemAsync(STUDENT_TOKEN_KEY, token);
  setStudentToken(token);
};

export const restoreStudentSession = async () => {
  try {
    const token = await SecureStore.getItemAsync(STUDENT_TOKEN_KEY);
    setStudentToken(token);
    return token;
  } catch (error) {
    setStudentToken(null);
    console.warn('Could not restore the saved student session:', error?.message || error);
    return null;
  }
};

export const clearStudentToken = async () => {
  try {
    await SecureStore.deleteItemAsync(STUDENT_TOKEN_KEY);
  } finally {
    setStudentToken(null);
  }
};

export default API;
