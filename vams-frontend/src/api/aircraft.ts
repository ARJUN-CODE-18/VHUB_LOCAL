import http from './client';
import { Aircraft, CreateAircraftRequest } from '../types/aircraft';
import normalizeArray from '../utils/normalizeArray';

export const aircraftApi = {
  async getAll(): Promise<Aircraft[]> {
    const res = await http.get('/aircraft');
    return normalizeArray<Aircraft>(res.data);
  },

  async getById(id: string): Promise<Aircraft> {
    const res = await http.get(`/aircraft/${id}`);
    return res.data;
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

  const res = await http.post('/aircraft', payload);
  return res.data;
},

async transition(
    id: string,
    payload: { target_state: string }
  ): Promise<void> {
    await http.post(`/aircraft/${id}/transition`, payload);
  },

  async updateBattery(id: string, level: number): Promise<void> {
    await http.post(`/aircraft/${id}/battery`, {
      battery_level: level,
    });
  },
};
