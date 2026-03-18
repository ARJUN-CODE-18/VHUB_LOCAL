import type { AircraftState } from '../types/aircraftState';

const STATE_TRANSITIONS: Record<AircraftState, AircraftState | null> = {
  APPROACH: 'LANDING_QUEUE',
  LANDING_QUEUE: 'LANDING',
  LANDING: 'LANDED',
  LANDED: 'TAXI_TO_CHARGING',
  TAXI_TO_CHARGING: 'CHARGING',
  CHARGING: 'READY_FOR_DEPARTURE',
  READY_FOR_DEPARTURE: 'TAXI_TO_PAD',
  TAXI_TO_PAD: 'DEPARTURE',
  DEPARTURE: null,
};

export function getNextAircraftState(
  currentState: AircraftState,
): AircraftState | null {
  return STATE_TRANSITIONS[currentState];
}