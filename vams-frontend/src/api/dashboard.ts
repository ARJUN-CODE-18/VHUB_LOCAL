import apiClient from './client';
import { DashboardStatus } from '../types/dashboard';

export const dashboardApi = {
  getStatus: async (): Promise<DashboardStatus> => {
    const response = await apiClient.get<DashboardStatus>('/dashboard/status');
    return response.data;
  },
};
