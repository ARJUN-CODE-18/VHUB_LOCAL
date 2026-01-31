export interface WeatherData {
  id?: number;
  timestamp: string;
  temperature_c: number;
  wind_speed_kmh: number;
  wind_direction: string;
  visibility_km: number;
  precipitation_mm: number;
  conditions: string;
  is_safe_for_operations: boolean;
}
