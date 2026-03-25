import axios from 'axios';
import { API_BASE_URL } from '../config/runtime';

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Interceptor to attach API key to all requests
http.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY || 'dev-operator-key';
  const apiKeyHeader = import.meta.env.VITE_API_KEY_HEADER || 'X-API-Key';

  // Add API key header expected by backend auth dependency.
  config.headers[apiKeyHeader] = apiKey;

  if (import.meta.env.DEV) {
    console.log('[api-client] Outgoing request:', config.method, config.url);
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[api-client] Request failed:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default http;
