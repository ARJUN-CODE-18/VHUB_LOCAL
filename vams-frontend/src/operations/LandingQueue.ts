export type QueuedAircraftState = 'APPROACH' | 'LANDING_QUEUE';

export interface QueuedAircraft {
  id: string;
  callsign: string;
  eta: number;
  priority: number;
  state: QueuedAircraftState;
}

class LandingQueue {
  private queue: QueuedAircraft[] = [];

  enqueue(aircraft: QueuedAircraft): void {
    const existingIndex = this.queue.findIndex((item) => item.id === aircraft.id);
    if (existingIndex >= 0) {
      this.queue.splice(existingIndex, 1);
    }

    this.queue.push(aircraft);
    this.sortQueue();
  }

  dequeue(): QueuedAircraft | null {
    return this.queue.shift() ?? null;
  }

  peek(): QueuedAircraft | null {
    return this.queue[0] ?? null;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  removeById(aircraftId: string): void {
    this.queue = this.queue.filter((item) => item.id !== aircraftId);
  }

  getSnapshot(): QueuedAircraft[] {
    return [...this.queue];
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      return a.eta - b.eta;
    });
  }
}

export const landingQueue = new LandingQueue();