export interface EnergyStatus {
  total_capacity_kwh: number;
  available_capacity_kwh: number;
  active_charging_stations: number;
  total_stations: number;
  grid_load_percent: number;
}

export interface EnergySessionResponse {
  id: string;
  vertipad_id: string;
  aircraft_id: string;
  start_time: string;
  end_time: string | null;
  initial_battery_percent: number;
  final_battery_percent: number | null;
  energy_delivered_kwh: number;
  average_power_kw: number | null;
  peak_power_kw: number | null;
  is_active: boolean;
  completed_successfully: boolean | null;
  termination_reason: string | null;
  created_at: string;
}