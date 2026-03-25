import apiClient from './client';
import { Workflow } from '../types/groundOps';

export const groundOpsApi = {
  getActiveForAircraft: async (aircraftId: string): Promise<Workflow | null> => {
    const response = await apiClient.get<Workflow | null>(`/groundops/workflows/active/${aircraftId}`);
    return response.data;
  },

  create: async (data: {
    workflow_type: 'ARRIVAL' | 'DEPARTURE' | 'TURNAROUND';
    aircraft_id: string;
    vertipad_id: string;
    slot_id?: string;
  }): Promise<Workflow> => {
    const response = await apiClient.post<Workflow>('/groundops/workflows', data);
    return response.data;
  },

  getById: async (workflowId: string): Promise<Workflow> => {
    const response = await apiClient.get<Workflow>(`/groundops/workflows/${workflowId}`);
    return response.data;
  },

  transition: async (workflowId: string, targetState: string): Promise<Workflow> => {
    const response = await apiClient.post<Workflow>(`/groundops/workflows/${workflowId}/transition`, {
      target_state: targetState,
    });
    return response.data;
  },

  complete: async (workflowId: string, completionNotes?: string): Promise<Workflow> => {
    const response = await apiClient.post<Workflow>(`/groundops/workflows/${workflowId}/complete`, {
      completion_notes: completionNotes,
    });
    return response.data;
  },
};