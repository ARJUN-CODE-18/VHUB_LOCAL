import { getSegmentId, taxiReservationSystem } from './TaxiReservationSystem';

class TaxiConflictDetector {
  hasConflict(route: string[]): boolean {
    if (route.length < 2) {
      return false;
    }

    for (let index = 0; index < route.length - 1; index += 1) {
      const fromNode = route[index];
      const toNode = route[index + 1];

      if (!fromNode || !toNode) {
        continue;
      }

      const segmentId = getSegmentId(fromNode, toNode);
      if (!taxiReservationSystem.isSegmentFree(segmentId)) {
        return true;
      }
    }

    return false;
  }
}

export const taxiConflictDetector = new TaxiConflictDetector();