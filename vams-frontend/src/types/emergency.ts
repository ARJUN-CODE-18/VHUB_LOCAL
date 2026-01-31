export interface EmergencyEvent {
  id: string;
  event_type: 'AIRCRAFT' | 'PAD' | 'WEATHER' | 'SYSTEM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  aircraft_id?: string;
  pad_id?: string;
  status: 'ACTIVE' | 'RESOLVED';
  declared_at: string;
  resolved_at?: string;
}