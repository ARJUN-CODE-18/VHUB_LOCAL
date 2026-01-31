import apiClient from './client';
import { Slot, SlotCreate } from '../types/slot'; // <-- added SlotCreate

/**
 * Normalizes backend responses into arrays
 */
function ensureArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.slots)) return obj.slots as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }

  return [];
}

export const slotsApi = {
  /**
   * Fetch all slots
   */
  getAll: async (): Promise<Slot[]> => {
    const response = await apiClient.get<unknown>('/slots/');
    return ensureArray<Slot>(response.data);
  },

  /**
   * Fetch slot by ID
   */
  getById: async (id: string): Promise<Slot> => {
    const response = await apiClient.get<Slot>(`/slots/${id}`);
    return response.data;
  },

  /**
   * Create a new slot
   */
  create: async (data: SlotCreate): Promise<Slot> => {
    const response = await apiClient.post<Slot>('/slots/', data);
    return response.data;
  },

  /**
   * Confirm a requested slot
   */
  confirm: async (id: string): Promise<Slot> => {
    const response = await apiClient.post<Slot>(`/slots/${id}/confirm`);
    return response.data;
  },

  /**
   * Activate a confirmed slot
   */
  activate: async (id: string): Promise<Slot> => {
    const response = await apiClient.post<Slot>(`/slots/${id}/activate`);
    return response.data;
  },

  /**
   * Complete an active slot
   */
  complete: async (id: string): Promise<Slot> => {
    const response = await apiClient.post<Slot>(`/slots/${id}/complete`);
    return response.data;
  },

  /**
   * Cancel a slot
   */
  cancel: async (id: string): Promise<Slot> => {
    const response = await apiClient.delete<Slot>(`/slots/${id}`);
    return response.data;
  },
};
