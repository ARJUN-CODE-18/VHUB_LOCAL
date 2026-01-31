// types/slot.ts

export enum SlotStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SlotType {
  ARRIVAL = 'ARRIVAL',
  DEPARTURE = 'DEPARTURE',
}

/** Represents a slot returned from the backend */
export interface Slot {
  id: string;
  slot_type: SlotType;
  status: SlotStatus;
  vertipad_id: string;
  aircraft_id: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  duration_minutes: number;
  priority?: number;
}

/** Represents the payload required to create a slot */
export interface SlotCreate {
  slot_type: SlotType;
  vertipad_id: string;
  aircraft_id: string;
  start_time: string; // ISO string
  duration_minutes: number;
  priority?: number;
}
