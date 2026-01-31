export interface Flight {
  id: string;
  aircraft_id: string;
  workflow_id: string;
  flight_type: 'ARRIVAL' | 'DEPARTURE';
  start_time: string;
  end_time?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  remarks?: string;
}
