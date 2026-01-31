import apiClient from './client';
import { EmergencyEvent } from '../types/emergency';

export const emergencyApi = {
  getAll: async (): Promise<EmergencyEvent[]> => {
    const response = await apiClient.get<EmergencyEvent[]>('/emergency/');
    return response.data;
  },

  declare: async (data: any): Promise<EmergencyEvent> => {
    const response = await apiClient.post<EmergencyEvent>('/emergency/', data);
    return response.data;
  },

  resolve: async (id: string): Promise<EmergencyEvent> => {
    const response = await apiClient.patch<EmergencyEvent>(`/emergency/${id}/resolve`);
    return response.data;
  },
};