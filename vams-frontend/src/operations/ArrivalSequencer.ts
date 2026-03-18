import { VertiportEventBus } from '../controllers/VertiportEventBus';
import { landingQueue, type QueuedAircraft } from './LandingQueue';
import { padAllocator } from './PadAllocator';

export interface LandingRequestPayload {
  id: string;
  callsign: string;
  eta: number;
  priority: number;
  state: 'APPROACH' | 'LANDING_QUEUE';
}

export interface LandingSlotAssignedPayload {
  aircraftId: string;
  padId: string;
  landingTime: number;
}

class ArrivalSequencer {
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    VertiportEventBus.on('landing_requested', (payload: LandingRequestPayload) => {
      this.handleLandingRequest(payload);
    });

    VertiportEventBus.on('PAD_RELEASED', (padId: string) => {
      padAllocator.releasePad(padId);
    });
  }

  start(padIds: string[]): void {
    padAllocator.setAvailablePads(padIds);

    if (this.timerId) {
      return;
    }

    this.timerId = setInterval(() => {
      this.tryAssignLandingSlots();
    }, 1000);
  }

  stop(): void {
    if (!this.timerId) {
      return;
    }

    clearInterval(this.timerId);
    this.timerId = null;
  }

  private handleLandingRequest(payload: LandingRequestPayload): void {
    const queueItem: QueuedAircraft = {
      id: payload.id,
      callsign: payload.callsign,
      eta: payload.eta,
      priority: payload.priority,
      state: 'LANDING_QUEUE',
    };

    landingQueue.enqueue(queueItem);
  }

  private tryAssignLandingSlots(): void {
    while (!landingQueue.isEmpty() && padAllocator.getAvailablePads().length > 0) {
      const nextAircraft = landingQueue.peek();
      if (!nextAircraft) {
        return;
      }

      const assignedPadId = padAllocator.reservePad({ aircraftId: nextAircraft.id });
      if (!assignedPadId) {
        return;
      }

      landingQueue.dequeue();
      VertiportEventBus.emit('pad_reserved', {
        aircraftId: nextAircraft.id,
        padId: assignedPadId,
      });

      const landingSlotPayload: LandingSlotAssignedPayload = {
        aircraftId: nextAircraft.id,
        padId: assignedPadId,
        landingTime: Date.now(),
      };

      VertiportEventBus.emit('landing_slot_assigned', landingSlotPayload);
      VertiportEventBus.emit('aircraft_state_changed', {
        aircraftId: nextAircraft.id,
        newState: 'LANDING',
      });
    }
  }
}

export const arrivalSequencer = new ArrivalSequencer();