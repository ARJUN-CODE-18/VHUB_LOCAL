export interface WeatherData {
  id: string;
  vertipad_id: string;
  observation_time: string;
  wind_speed_mps: number;
  wind_direction_deg: number;
  wind_gust_mps?: number | null;
  crosswind_component_mps?: number | null;
  visibility_m: number;
  precipitation_rate_mmh: number;
  precipitation_type?: string | null;
  temperature_c: number;
  pressure_hpa: number;
  humidity_percent: number;
  cloud_ceiling_m?: number | null;
  cloud_coverage_percent?: number | null;
  is_vfr: boolean;
  is_operational: boolean;
  constraint_reasons?: string | null;
  source: string;
  created_at: string;
}
