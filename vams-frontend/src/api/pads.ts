import apiClient from './client';
import { Pad, PadQueueItem, QueuePriority } from '../types/pads';
import { Aircraft } from '../types/aircraft';

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

function normalizePad(pad: any): Pad {
  const rawStatus = String(pad.status ?? pad.state ?? 'AVAILABLE').toUpperCase();
  const normalizedStatus =
    rawStatus === 'CHARGING_ACTIVE'
      ? 'CHARGING'
      : rawStatus === 'EMERGENCY_LOCKED'
        ? 'MAINTENANCE'
        : rawStatus;

  const normalizedQueue: PadQueueItem[] = Array.isArray(pad.queue)
    ? pad.queue
        .filter((item: any) => item && typeof item === 'object' && typeof item.aircraft_id === 'string')
        .map((item: any) => ({
          aircraft_id: item.aircraft_id,
          priority: (item.priority ?? 'NORMAL') as QueuePriority,
          timestamp: Number(item.timestamp ?? 0),
        }))
    : [];

  return {
    ...pad,
    pad_number: pad.pad_number ?? pad.id,
    status: normalizedStatus,
    aircraft_id: pad.aircraft_id ?? pad.current_aircraft_id ?? undefined,
    queue: normalizedQueue,
  } as Pad;
}

export const padsApi = {
  /**
   * Fetch all pads (SAFE)
   */
  getAll: async (): Promise<Pad[]> => {
    const response = await apiClient.get<unknown>('/pad/'); // ✅ changed
    const pads = ensureArray<Pad>(response.data).map((pad) => normalizePad(pad));
    console.log('PADS API RESPONSE:', pads);
    return pads;
  },

  /**
   * Fetch pad by ID
   */
  getById: async (id: string): Promise<Pad> => {
    const response = await apiClient.get<Pad>(`/pad/${id}`); // ✅ changed
    return normalizePad(response.data);
  },

  /**
   * Update pad status
   */
  updateStatus: async (
    id: string,
    status: string
  ): Promise<Pad> => {
    const response = await apiClient.post<Pad>(
      `/pad/${id}/transition`,
      { target_state: status }
    );
    return normalizePad(response.data);
  },

  /**
   * Assign aircraft to pad
   */
  assignAircraft: async (
    id: string,
    aircraft_id: string,
    priority?: QueuePriority
  ): Promise<Pad> => {
    const response = await apiClient.post<Pad>(
      `/pad/${id}/occupy`, // ✅ changed
      {
        aircraft_id,
        priority: priority ?? 'NORMAL',
      }
    );
    return normalizePad(response.data);
  },

  /**
   * Release aircraft from pad
   */
  releaseAircraft: async (id: string): Promise<Pad> => {
    const response = await apiClient.post<Pad>(
      `/pad/${id}/release`, // ✅ changed
      {}
    );
    return normalizePad(response.data);
  },

  /**
   * Fetch aircraft currently associated with a specific pad.
   */
  getAircraftByPad: async (padId: string): Promise<Aircraft[]> => {
    const response = await apiClient.get<Aircraft[]>(`/pad/${padId}/aircraft`);
    return Array.isArray(response.data) ? response.data : [];
  },
};
