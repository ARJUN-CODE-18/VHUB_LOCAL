import axios, { AxiosError } from 'axios';
import { ApiError } from '../types/api';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

/**
 * Attach API key to every request
 */
http.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;

  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }

  if (import.meta.env.DEV) {
    console.log(
      '[api-client]',
      config.method?.toUpperCase(),
      config.url,
      'X-API-Key:',
      config.headers['X-API-Key']
    );
  }

  return config;
});

/**
 * Unified request wrapper
 * Converts Axios errors into clean Error messages
 */
export async function request<T>(
  fn: () => Promise<any>
): Promise<T> {
  try {
    const res = await fn();
    return res?.data ?? res;
  } catch (err) {
    const error = err as AxiosError<ApiError>;

    const message =
      error.response?.data?.detail ||
      error.message ||
      'Unexpected API error';

    throw new Error(message);
  }
}
