import axios from 'axios';

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

export default API;
