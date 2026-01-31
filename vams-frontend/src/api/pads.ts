import apiClient from './client';
import { Pad } from '../types/pads';

/**
 * Normalizes backend responses into arrays.
 * Prevents: pads.map is not a function
 */
function ensureArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.pads)) return obj.pads as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }

  return [];
}

export const padsApi = {
  /**
   * Fetch all pads (SAFE)
   */
  getAll: async (): Promise<Pad[]> => {
    const response = await apiClient.get<unknown>('/pad/'); // ✅ changed
    return ensureArray<Pad>(response.data);
  },

  /**
   * Fetch pad by ID
   */
  getById: async (id: string): Promise<Pad> => {
    const response = await apiClient.get<Pad>(`/pad/${id}`); // ✅ changed
    return response.data;
  },

  /**
   * Update pad status
   */
  updateStatus: async (
    id: string,
    status: string
  ): Promise<Pad> => {
    const response = await apiClient.patch<Pad>(
      `/pad/${id}/status`, // ✅ changed
      { status }
    );
    return response.data;
  },

  /**
   * Assign aircraft to pad
   */
  assignAircraft: async (
    id: string,
    aircraft_id: string
  ): Promise<Pad> => {
    const response = await apiClient.post<Pad>(
      `/pad/${id}/occupy`, // ✅ changed
      { aircraft_id }
    );
    return response.data;
  },

  /**
   * Release aircraft from pad
   */
  releaseAircraft: async (id: string): Promise<Pad> => {
    const response = await apiClient.post<Pad>(
      `/pad/${id}/release`, // ✅ changed
      {}
    );
    return response.data;
  },
};
