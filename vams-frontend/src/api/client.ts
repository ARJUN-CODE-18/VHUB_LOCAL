import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Interceptor to attach API key to all requests
http.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!apiKey) {
    console.warn('[api-client] VITE_API_KEY is missing in .env');
  } else {
    // Add API key header
    config.headers['X-API-Key'] = apiKey;
  }

  console.log('[api-client] Outgoing request:', config.method, config.url, 'X-API-Key:', config.headers['X-API-Key']);
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
