import http from './client';
import { Aircraft, CreateAircraftRequest } from '../types/aircraft';
import normalizeArray from '../utils/normalizeArray';

type AircraftResponse = Omit<Aircraft, 'current_state' | 'position' | 'battery' | 'weight' | 'maxRange'> & {
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_altitude_m?: number | null;
};

type AircraftPositionUpdateRequest = {
  latitude?: number;
  longitude?: number;
  altitude_m?: number;
  pad_id?: string | null;
};

function normalizeAircraft(data: AircraftResponse): Aircraft {
  const normalizedPosition =
    data.last_latitude != null && data.last_longitude != null
      ? {
          latitude: data.last_latitude,
          longitude: data.last_longitude,
          altitude: data.last_altitude_m ?? 0,
        }
      : undefined;

  return {
    ...data,
    current_state: data.state,
    battery: data.battery_level,
    weight: data.weight_kg,
    maxRange: data.max_range_km,
    ...(normalizedPosition ? { position: normalizedPosition } : {}),
  };
}

export const aircraftApi = {
  async getAll(): Promise<Aircraft[]> {
    const res = await http.get<AircraftResponse[]>('/aircraft/');
    return normalizeArray<AircraftResponse>(res.data).map(normalizeAircraft);
  },

  async getById(id: string): Promise<Aircraft> {
    const res = await http.get<AircraftResponse>(`/aircraft/${id}`);
    return normalizeAircraft(res.data);
  },

async create(data: CreateAircraftRequest): Promise<Aircraft> {
  const payload = {
    tail_number: data.tail_number,
    aircraft_type: data.aircraft_type,
    operator: data.operator,
    weight_kg: Number(data.weight_kg),
    max_range_km: Number(data.max_range_km),
    battery_level:
      data.battery_level !== undefined
        ? Number(data.battery_level)
        : null,
  };

  const res = await http.post<AircraftResponse>('/aircraft/', payload);
  return normalizeAircraft(res.data);
},

async transition(
    id: string,
    payload: { target_state: string }
  ): Promise<Aircraft> {
    const response = await http.post<AircraftResponse>(`/aircraft/${id}/transition`, payload);
    return normalizeAircraft(response.data);
  },

  async updateBattery(id: string, level: number): Promise<Aircraft> {
    const response = await http.patch<AircraftResponse>(`/aircraft/${id}/battery`, {
      battery_level: level,
    });
    return normalizeAircraft(response.data);
  },

  async updatePosition(id: string, payload: AircraftPositionUpdateRequest): Promise<Aircraft> {
    const response = await http.patch<AircraftResponse>(`/aircraft/${id}/position`, payload);
    return normalizeAircraft(response.data);
  },
};
