import apiClient from './client';
import { EnergyStatus } from '../types/energy';

export const energyApi = {
  getStatus: async (): Promise<EnergyStatus> => {
    const response = await apiClient.get<EnergyStatus>('/energy/status');
    return response.data;
  },

  getChargingStations: async (): Promise<any[]> => {
    const response = await apiClient.get('/energy/stations');
    return response.data;
  },
};