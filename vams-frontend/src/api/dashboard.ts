import apiClient from './client';
import { DashboardStatus } from '../types/dashboard';

export const dashboardApi = {
  getStatus: async (): Promise<DashboardStatus> => {
    const response = await apiClient.get<DashboardStatus>('/dashboard/status');
    const data = response.data;
    const available = data.vertipads.status.filter((pad) => pad.state === 'AVAILABLE').length;
    const occupied = data.vertipads.status.filter((pad) => pad.current_aircraft_id != null).length;

    return {
      ...data,
      vertipads: {
        ...data.vertipads,
        available,
        occupied,
      },
      emergency: data.emergency_status,
    };
  },
};
