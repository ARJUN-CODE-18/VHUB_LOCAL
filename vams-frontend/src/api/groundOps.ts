import apiClient from './client';
import { GroundOperation } from '../types/groundOps';

/**
 * Always returns a safe array
 */
function ensureArray<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input;

  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;

    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.events)) return obj.events as T[];
    if (Array.isArray(obj.operations)) return obj.operations as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }

  return [];
}

export const groundOpsApi = {
  getAll: async (): Promise<GroundOperation[]> => {
    const response = await apiClient.get<unknown>('/ground-ops/');
    return ensureArray<GroundOperation>(response.data);
  },

  create: async (data: Partial<GroundOperation>): Promise<GroundOperation> => {
    const response = await apiClient.post<GroundOperation>('/ground-ops/', data);
    return response.data;
  },
};