export interface PadAllocationRequest {
  aircraftId: string;
}

class PadAllocator {
  private padAssignments = new Map<string, string | null>();

  setAvailablePads(availablePads: string[]): void {
    const nextAssignments = new Map<string, string | null>();

    availablePads.forEach((padId) => {
      nextAssignments.set(padId, this.padAssignments.get(padId) ?? null);
    });

    this.padAssignments = nextAssignments;
  }

  reservePad(aircraftRequest: PadAllocationRequest): string | null {
    for (const [padId, assignedAircraftId] of this.padAssignments.entries()) {
      if (!assignedAircraftId) {
        this.padAssignments.set(padId, aircraftRequest.aircraftId);
        return padId;
      }
    }

    return null;
  }

  releasePad(padId: string): void {
    if (this.padAssignments.has(padId)) {
      this.padAssignments.set(padId, null);
    }
  }

  getAvailablePads(): string[] {
    const availablePads: string[] = [];

    for (const [padId, assignedAircraftId] of this.padAssignments.entries()) {
      if (!assignedAircraftId) {
        availablePads.push(padId);
      }
    }

    return availablePads;
  }
}

export const padAllocator = new PadAllocator();