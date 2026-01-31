export interface DashboardStatus {
  timestamp: string;

  aircraft: {
    total: number;
    by_state: Record<string, number>;
    emergency_count: number;
  };

  vertipads: {
    total: number;
    status: Array<{
      id: string;
      name: string;
      state: string;
      is_operational: boolean;
      current_aircraft_id: string | null;
    }>;
    locked_count: number;
    // convenience fields returned by frontend normalization
    available?: number;
    occupied?: number;
  };

  workflows: {
    active_count: number;
  };

  slots: {
    upcoming_count: number;
    upcoming: Array<{
      id: string;
      type: string;
      start_time: string;
      aircraft_id: string;
      status: string;
    }>;
  };

  weather: {
    latest_observation: string | null;
    is_operational: boolean | null;
    wind_speed_mps: number | null;
    visibility_m: number | null;
  } | null;

  emergency_status: {
    system_nominal: boolean;
    aircraft_emergencies: number;
    locked_pads: number;
  };

  // alias used by components
  emergency?: {
    system_nominal: boolean;
    aircraft_emergencies: number;
    locked_pads: number;
  };
}
