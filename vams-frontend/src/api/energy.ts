import apiClient from './client';
import { EnergySessionResponse } from '../types/energy';

export const energyApi = {
  startSession: async (payload: {
    vertipad_id: string;
    aircraft_id: string;
    initial_battery_percent: number;
  }): Promise<EnergySessionResponse> => {
    const response = await apiClient.post<EnergySessionResponse>('/energy/sessions/start', payload);
    return response.data;
  },

  stopSession: async (
    sessionId: string,
    payload: { final_battery_percent: number; termination_reason?: string }
  ): Promise<EnergySessionResponse> => {
    const response = await apiClient.post<EnergySessionResponse>(`/energy/sessions/${sessionId}/stop`, payload);
    return response.data;
  },

  getActiveSession: async (aircraftId: string): Promise<EnergySessionResponse | null> => {
    const response = await apiClient.get<EnergySessionResponse | null>(`/energy/sessions/active/${aircraftId}`);
    return response.data;
  },

  checkBatteryForDeparture: async (aircraftId: string): Promise<{
    aircraft_id: string;
    is_sufficient: boolean;
    battery_level: number;
    minimum_required: number;
  }> => {
    const response = await apiClient.get(`/energy/battery-check/${aircraftId}`);
    return response.data;
  },
};