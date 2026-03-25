export interface GroundOperation {
  id: string;
  operation_type: 'REFUEL' | 'MAINTENANCE' | 'CLEANING' | 'INSPECTION';
  aircraft_id: string;
  pad_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  assigned_crew?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface Workflow {
  id: string;
  workflow_type: 'ARRIVAL' | 'DEPARTURE' | 'TURNAROUND';
  state: string;
  aircraft_id: string;
  vertipad_id: string;
  slot_id?: string | null;
  initiated_at: string;
  completed_at?: string | null;
  approach_cleared_at?: string | null;
  landing_cleared_at?: string | null;
  landed_at?: string | null;
  departure_cleared_at?: string | null;
  is_emergency: boolean;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
}