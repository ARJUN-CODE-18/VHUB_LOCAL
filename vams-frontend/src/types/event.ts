export interface Event {
  id: string;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  timestamp: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  operator_id?: string;
}
