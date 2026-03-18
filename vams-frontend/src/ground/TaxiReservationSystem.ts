export function getSegmentId(fromNode: string, toNode: string): string {
  const [a, b] = [fromNode, toNode].map((node) => node.replace('-', '')).sort();
  return `${a}<->${b}`;
}

class TaxiReservationSystem {
  private reservations = new Map<string, string>();

  reserveSegment(segmentId: string, aircraftId: string): boolean {
    if (!this.isSegmentFree(segmentId)) {
      return false;
    }

    this.reservations.set(segmentId, aircraftId);
    return true;
  }

  releaseSegment(segmentId: string): void {
    this.reservations.delete(segmentId);
  }

  isSegmentFree(segmentId: string): boolean {
    return !this.reservations.has(segmentId);
  }

  getReservedAircraft(segmentId: string): string | null {
    return this.reservations.get(segmentId) ?? null;
  }
}

export const taxiReservationSystem = new TaxiReservationSystem();