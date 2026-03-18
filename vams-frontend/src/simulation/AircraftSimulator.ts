import { VertiportEventBus } from '../controllers/VertiportEventBus';
import type { AircraftState } from '../types/aircraftState';
import { getNextAircraftState } from './AircraftStateMachine';

export interface SimulatedAircraft {
  id: string;
  state: AircraftState;
  callsign?: string;
  eta?: number;
  priority?: number;
}

export interface AircraftStateChangedPayload {
  aircraftId: string;
  newState: AircraftState;
}

class AircraftSimulator {
  private aircraftRegistry = new Map<string, SimulatedAircraft>();

  constructor() {
    VertiportEventBus.on(
      'aircraft_state_changed',
      (payload: AircraftStateChangedPayload) => {
        const trackedAircraft = this.aircraftRegistry.get(payload.aircraftId);
        if (trackedAircraft) {
          trackedAircraft.state = payload.newState;
        }
      },
    );
  }

  advanceAircraft(aircraft: SimulatedAircraft): AircraftState | null {
    this.aircraftRegistry.set(aircraft.id, aircraft);

    if (aircraft.state === 'APPROACH') {
      VertiportEventBus.emit('landing_requested', {
        id: aircraft.id,
        callsign: aircraft.callsign ?? aircraft.id,
        eta: aircraft.eta ?? Date.now(),
        priority: aircraft.priority ?? 50,
        state: aircraft.state,
      });
    }

    if (aircraft.state === 'LANDING_QUEUE') {
      // LANDING_QUEUE exits only through landing_slot_assigned approval.
      return null;
    }

    const nextState = getNextAircraftState(aircraft.state);
    if (!nextState) {
      return null;
    }

    aircraft.state = nextState;
    VertiportEventBus.emit('aircraft_state_changed', {
      aircraftId: aircraft.id,
      newState: nextState,
    } satisfies AircraftStateChangedPayload);

    return nextState;
  }
}

export const aircraftSimulator = new AircraftSimulator();