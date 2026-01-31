import apiClient from './client';
import { Event } from '../types/event';

export const eventsApi = {
  /**
   * Get all events/emergencies from dashboard status
   * Backend: GET /dashboard/status returns emergency_status with aircraft_emergencies count
   * Since there's no dedicated events endpoint, we derive events from dashboard
   */
  getAll: async (): Promise<Event[]> => {
    try {
      const response = await apiClient.get<unknown>('/dashboard/status');
      
      // Flatten nested backend response: { emergency_status: { ... } }
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        const emergencyStatus = data.emergency_status as Record<string, unknown> | undefined;
        
        // Return empty array if no emergency status
        // (Backend doesn't have dedicated events endpoint, so we can't retrieve them)
        if (emergencyStatus && typeof emergencyStatus.aircraft_emergencies === 'number') {
          // Return placeholder events if there are emergencies (real data would come from dedicated API)
          const count = emergencyStatus.aircraft_emergencies as number;
          if (count > 0) {
            return Array.from({ length: count }, (_, i) => ({
              id: `emergency-${i}`,
              event_type: 'AIRCRAFT_EMERGENCY',
              severity: 'CRITICAL',
              timestamp: new Date().toISOString(),
              entity_type: 'aircraft',
              entity_id: `aircraft-${i}`,
              details: { count },
            })) as Event[];
          }
        }
      }
      
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Get events for a specific aircraft
   * Backend doesn't have dedicated endpoint, return empty
   */
  getByAircraft: async (): Promise<Event[]> => {
    try {
      // Would need dedicated backend endpoint like /aircraft/{id}/events
      // For now return empty array
      return [];
    } catch {
      return [];
    }
  },
};
