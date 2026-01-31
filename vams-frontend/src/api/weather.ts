import apiClient from './client';
import { WeatherData } from '../types/weather';

/**
 * Normalize backend responses into arrays
 * Prevents: forecast.map is not a function
 */
function ensureArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.forecast)) return obj.forecast as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }

  return [];
}

export const weatherApi = {
  /**
   * Current weather
   */
  getCurrent: async (): Promise<WeatherData | null> => {
    try {
      const response = await apiClient.get<unknown>('/weather/current');

      // Some backends return { data: {...} }
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return (response.data as { data: WeatherData }).data;
      }

      return response.data as WeatherData;
    } catch {
      return null;
    }
  },

  /**
   * Weather forecast (SAFE)
   */
  getForecast: async (): Promise<WeatherData[]> => {
    try {
      const response = await apiClient.get<unknown>('/weather/forecast');
      return ensureArray<WeatherData>(response.data);
    } catch {
      return [];
    }
  },
};
