import apiClient from './client';
import { WeatherData } from '../types/weather';

export const weatherApi = {
  getLatestForPad: async (vertipadId: string): Promise<WeatherData | null> => {
    try {
      const response = await apiClient.get<WeatherData | null>(`/weather/latest/${vertipadId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  createReport: async (payload: {
    vertipad_id: string;
    observation_time: string;
    wind_speed_mps: number;
    wind_direction_deg: number;
    visibility_m: number;
    temperature_c: number;
    pressure_hpa: number;
    humidity_percent: number;
    precipitation_rate_mmh?: number;
    precipitation_type?: string;
    wind_gust_mps?: number;
    cloud_ceiling_m?: number;
    cloud_coverage_percent?: number;
    source?: string;
  }): Promise<WeatherData> => {
    const response = await apiClient.post<WeatherData>('/weather/', payload);
    return response.data;
  },
};
