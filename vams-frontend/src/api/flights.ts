import apiClient from './client';
import { Flight } from '../types/flight';

export const flightsApi = {
  getHistory: async (): Promise<Flight[]> => {
    try {
      await apiClient.get('/dashboard/operations-today');
      // Backend currently exposes aggregated counters, not detailed flight records.
      return [];
    } catch {
      return [];
    }
  },

  getByAircraft: async (aircraftId: string): Promise<Flight[]> => {
    try {
      await apiClient.get('/dashboard/operations-today');
      void aircraftId;
      return [];
    } catch {
      return [];
    }
  },
};
