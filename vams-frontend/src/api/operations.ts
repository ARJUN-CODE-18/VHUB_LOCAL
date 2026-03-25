import apiClient from './client';
import { QueuePriority } from '../types/pads';

export type OperationType = 'TAXI' | 'LANDING';

export interface ScheduleOperationRequest {
  aircraft_id: string;
  operation_type: OperationType;
  priority?: QueuePriority;
  pad_id?: string;
  scheduled_time?: string;
}

export interface ScheduleOperationResponse {
  message: string;
  operation_type: OperationType;
  status: 'SCHEDULED' | 'QUEUED' | 'OVERRIDDEN';
  queued_pad_id?: string | null;
  queue_position?: number | null;
  slot?: {
    id: string;
    vertipad_id: string;
    aircraft_id: string;
    slot_type: string;
    status: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
  } | null;
  aircraft: {
    id: string;
    tail_number: string;
    state: string;
    is_emergency: boolean;
    battery_level: number | null;
  };
}

export const operationsApi = {
  schedule: async (payload: ScheduleOperationRequest): Promise<ScheduleOperationResponse> => {
    const response = await apiClient.post<ScheduleOperationResponse>('/operations/schedule', payload);
    return response.data;
  },
};
