import apiClient from './client';
import { Flight } from '../types/flight';

export const flightsApi = {
  /**
   * Past / completed flights
   * Backend: GET /dashboard/operations-today returns { workflows: { completed: [...] } }
   * This flattens the nested structure to return Flight[] directly
   */
  getHistory: async (): Promise<Flight[]> => {
    try {
      const response = await apiClient.get<unknown>('/dashboard/operations-today');
      
      // Flatten nested backend response: { workflows: { completed: [...] } }
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        const workflows = data.workflows as Record<string, unknown> | undefined;
        
        if (workflows && Array.isArray(workflows.completed)) {
          return workflows.completed as Flight[];
        }
      }
      
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Flights for a specific aircraft
   * Currently uses completed workflows from dashboard
   */
  getByAircraft: async (aircraftId: string): Promise<Flight[]> => {
    try {
      const response = await apiClient.get<unknown>(
        `/dashboard/operations-today`
      );
      
      // Flatten and filter by aircraft_id
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        const workflows = data.workflows as Record<string, unknown> | undefined;
        
        if (workflows && Array.isArray(workflows.completed)) {
          return (workflows.completed as any[]).filter(
            (flight: any) => flight.aircraft_id === aircraftId
          ) as Flight[];
        }
      }
      
      return [];
    } catch {
      return [];
    }
  },
};
