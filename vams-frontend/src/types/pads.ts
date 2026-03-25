export enum PadStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  CHARGING = 'CHARGING',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE'
}

export type QueuePriority = 'NORMAL' | 'EMERGENCY' | 'CRITICAL';

export interface PadQueueItem {
  aircraft_id: string;
  priority: QueuePriority;
  timestamp: number;
}

export interface Pad {
  id: string;
  pad_number: string;
  status: PadStatus;
  aircraft_id?: string;
  queue: PadQueueItem[];
  max_weight_kg: number;
  has_charging: boolean;
  created_at: string;
  updated_at: string;
}
