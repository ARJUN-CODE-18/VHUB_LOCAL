import type { AircraftState } from '../types/aircraftState';
import { VertiportEventBus } from '../controllers/VertiportEventBus';
import { taxiRouteGraph } from './TaxiRouteGraph';
import { getSegmentId, taxiReservationSystem } from './TaxiReservationSystem';
import { taxiConflictDetector } from './TaxiConflictDetector';

interface AircraftStateChangedPayload {
  aircraftId: string;
  newState: AircraftState;
}

interface LandingSlotAssignedPayload {
  aircraftId: string;
  padId: string;
  landingTime: number;
}

interface ActiveTaxiMovement {
  route: string[];
  segmentIndex: number;
}

class TaxiwayManager {
  private movementTimerId: ReturnType<typeof setInterval> | null = null;

  private assignedPadByAircraft = new Map<string, string>();

  private activeMovements = new Map<string, ActiveTaxiMovement>();

  private defaultPadId = 'PAD1';

  constructor() {
    VertiportEventBus.on(
      'landing_slot_assigned',
      (payload: LandingSlotAssignedPayload) => {
        this.assignedPadByAircraft.set(payload.aircraftId, payload.padId);
      },
    );

    VertiportEventBus.on(
      'aircraft_state_changed',
      (payload: AircraftStateChangedPayload) => {
        if (
          payload.newState === 'TAXI_TO_CHARGING'
          || payload.newState === 'TAXI_TO_PAD'
        ) {
          this.assignTaxiRoute(payload.aircraftId, payload.newState);
        }
      },
    );
  }

  start(padIds: string[]): void {
    const normalizedPads = padIds.map((padId) => padId.replace('-', ''));
    if (normalizedPads.length > 0) {
      const firstPad = normalizedPads[0];
      if (firstPad) {
        this.defaultPadId = firstPad;
      }
    }

    taxiRouteGraph.configurePads(padIds);

    if (this.movementTimerId) {
      return;
    }

    this.movementTimerId = setInterval(() => {
      this.processMovements();
    }, 2000);
  }

  stop(): void {
    if (this.movementTimerId) {
      clearInterval(this.movementTimerId);
      this.movementTimerId = null;
    }

    this.activeMovements.forEach((movement, aircraftId) => {
      const fromNode = movement.route[movement.segmentIndex];
      const toNode = movement.route[movement.segmentIndex + 1];
      if (fromNode && toNode) {
        const segmentId = getSegmentId(fromNode, toNode);
        taxiReservationSystem.releaseSegment(segmentId);
        VertiportEventBus.emit('taxi_segment_released', { aircraftId, segmentId });
      }
    });

    this.activeMovements.clear();
  }

  private assignTaxiRoute(aircraftId: string, state: 'TAXI_TO_CHARGING' | 'TAXI_TO_PAD'): void {
    if (this.activeMovements.has(aircraftId)) {
      return;
    }

    const assignedPad = this.assignedPadByAircraft.get(aircraftId) ?? this.defaultPadId;
    const startNode = state === 'TAXI_TO_CHARGING' ? assignedPad : 'CHARGE1';
    const endNode = state === 'TAXI_TO_CHARGING' ? 'CHARGE1' : assignedPad;
    const route = taxiRouteGraph.getRoute(startNode, endNode);

    if (route.length < 2 || taxiConflictDetector.hasConflict(route)) {
      return;
    }

    const firstFromNode = route[0];
    const firstToNode = route[1];
    if (!firstFromNode || !firstToNode) {
      return;
    }

    const firstSegmentId = getSegmentId(firstFromNode, firstToNode);
    const isReserved = taxiReservationSystem.reserveSegment(firstSegmentId, aircraftId);
    if (!isReserved) {
      return;
    }

    this.activeMovements.set(aircraftId, {
      route,
      segmentIndex: 0,
    });

    VertiportEventBus.emit('taxi_segment_reserved', {
      aircraftId,
      segmentId: firstSegmentId,
    });

    VertiportEventBus.emit('taxi_route_assigned', {
      aircraftId,
      route,
    });
  }

  private processMovements(): void {
    this.activeMovements.forEach((movement, aircraftId) => {
      this.advanceMovement(aircraftId, movement);
    });
  }

  private advanceMovement(aircraftId: string, movement: ActiveTaxiMovement): void {
    const currentFromNode = movement.route[movement.segmentIndex];
    const currentToNode = movement.route[movement.segmentIndex + 1];
    if (!currentFromNode || !currentToNode) {
      this.activeMovements.delete(aircraftId);
      return;
    }

    const currentSegmentId = getSegmentId(currentFromNode, currentToNode);
    const nextFromNode = movement.route[movement.segmentIndex + 1];
    const nextToNode = movement.route[movement.segmentIndex + 2];

    if (!nextFromNode || !nextToNode) {
      taxiReservationSystem.releaseSegment(currentSegmentId);
      VertiportEventBus.emit('taxi_segment_released', {
        aircraftId,
        segmentId: currentSegmentId,
      });
      this.activeMovements.delete(aircraftId);
      return;
    }

    const nextSegmentId = getSegmentId(nextFromNode, nextToNode);
    const hasNextReservation = taxiReservationSystem.reserveSegment(nextSegmentId, aircraftId);
    if (!hasNextReservation) {
      return;
    }

    VertiportEventBus.emit('taxi_segment_reserved', {
      aircraftId,
      segmentId: nextSegmentId,
    });

    taxiReservationSystem.releaseSegment(currentSegmentId);
    VertiportEventBus.emit('taxi_segment_released', {
      aircraftId,
      segmentId: currentSegmentId,
    });

    movement.segmentIndex += 1;
  }
}

export const taxiwayManager = new TaxiwayManager();