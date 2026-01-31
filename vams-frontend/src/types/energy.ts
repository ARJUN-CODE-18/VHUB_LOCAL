export interface EnergyStatus {
  total_capacity_kwh: number;
  available_capacity_kwh: number;
  active_charging_stations: number;
  total_stations: number;
  grid_load_percent: number;
}