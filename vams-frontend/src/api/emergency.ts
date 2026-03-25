import apiClient from './client';
import { Aircraft } from '../types/aircraft';
import { Pad } from '../types/pads';

export const emergencyApi = {
  getStatus: async (): Promise<{
    emergency_aircraft_count: number;
    emergency_aircraft: Array<{ id: string; tail_number: string; state: string }>;
    locked_pads_count: number;
    locked_pads: Array<{ id: string; name: string; state: string }>;
    aborted_workflows_today: number;
  }> => {
    const response = await apiClient.get('/emergency/status');
    return response.data;
  },

  declareAircraft: async (data: {
    aircraft_id: string;
    emergency_type: string;
    description: string;
  }): Promise<Aircraft> => {
    const response = await apiClient.post<Aircraft>('/emergency/aircraft/declare', data);
    return response.data;
  },

  clearAircraft: async (data: {
    aircraft_id: string;
    resolution: string;
  }): Promise<Aircraft> => {
    const response = await apiClient.post<Aircraft>('/emergency/aircraft/clear', data);
    return response.data;
  },

  lockPad: async (data: { pad_id: string; reason: string }): Promise<Pad> => {
    const response = await apiClient.post<Pad>('/emergency/pad/lock', data);
    return response.data;
  },

  unlockPad: async (data: { pad_id: string }): Promise<Pad> => {
    const response = await apiClient.post<Pad>('/emergency/pad/unlock', data);
    return response.data;
  },
};