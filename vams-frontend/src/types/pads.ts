export enum PadStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  CHARGING = 'CHARGING',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE'
}

export interface Pad {
  id: string;
  pad_number: string;
  status: PadStatus;
  aircraft_id?: string;
  max_weight_kg: number;
  has_charging: boolean;
  created_at: string;
  updated_at: string;
}
