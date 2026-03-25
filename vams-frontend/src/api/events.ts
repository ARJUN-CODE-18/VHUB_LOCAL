import apiClient from './client';
import { Event } from '../types/event';

export const eventsApi = {
  getAll: async (): Promise<Event[]> => {
    try {
      const response = await apiClient.get<{
        emergency_aircraft: Array<{ id: string; tail_number: string; state: string }>;
        locked_pads: Array<{ id: string; name: string; state: string }>;
      }>('/emergency/status');

      const aircraftEvents: Event[] = (response.data.emergency_aircraft || []).map((aircraft) => ({
        id: `emergency-aircraft-${aircraft.id}`,
        event_type: 'EMERGENCY_DECLARED',
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
        entity_type: 'aircraft',
        entity_id: aircraft.id,
        details: {
          tail_number: aircraft.tail_number,
          state: aircraft.state,
        },
      }));

      const padEvents: Event[] = (response.data.locked_pads || []).map((pad) => ({
        id: `emergency-pad-${pad.id}`,
        event_type: 'EMERGENCY_DECLARED',
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
        entity_type: 'vertipad',
        entity_id: pad.id,
        details: {
          name: pad.name,
          state: pad.state,
        },
      }));

      return [...aircraftEvents, ...padEvents];
    } catch {
      return [];
    }
  },

  getByAircraft: async (aircraftId: string): Promise<Event[]> => {
    try {
      const all = await eventsApi.getAll();
      return all.filter((event) => event.entity_type === 'aircraft' && event.entity_id === aircraftId);
    } catch {
      return [];
    }
  },
};
