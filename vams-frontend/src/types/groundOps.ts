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