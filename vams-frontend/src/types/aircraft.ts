export enum AircraftState {
  REGISTERED = 'REGISTERED',
  EN_ROUTE_INBOUND = 'EN_ROUTE_INBOUND',
  APPROACH = 'APPROACH',
  FINAL_APPROACH = 'FINAL_APPROACH',
  LANDING = 'LANDING',
  LANDED = 'LANDED',
  TAXIING = 'TAXIING',
  PARKED = 'PARKED',
  CHARGING = 'CHARGING',
  MAINTENANCE = 'MAINTENANCE',
  PRE_DEPARTURE = 'PRE_DEPARTURE',
  TAKEOFF_READY = 'TAKEOFF_READY',
  DEPARTING = 'DEPARTING',
  DEPARTED = 'DEPARTED',
  EMERGENCY = 'EMERGENCY',
  DEREGISTERED = 'DEREGISTERED'
}

export interface Aircraft {
  id: string;
  pad_id?: string | null;
  callsign?: string;
  tail_number: string;
  aircraft_type: string;
  operator: string;
  battery?: number;
  weight_kg: number;
  weight?: number;
  max_range_km: number;
  maxRange?: number;
  battery_level: number;
  current_state: AircraftState;
  state: AircraftState; // alias for current_state
  is_emergency: boolean;
  position?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateAircraftRequest {
  weight_kg: any;
  tail_number: string;
  aircraft_type: string;
  operator: string;
  max_weight_kg: number;
  max_range_km: number;
  battery_level: number;
}

export interface TransitionRequest {
  target_state: AircraftState;
}

export interface UpdateBatteryRequest {
  battery_level: number;
}