import { aircraftSimulator, type SimulatedAircraft } from './AircraftSimulator';

class SimulationClock {
  private timerId: ReturnType<typeof setInterval> | null = null;

  startSimulation(aircraftList: SimulatedAircraft[]): void {
    if (this.timerId) {
      return;
    }

    this.timerId = setInterval(() => {
      aircraftList.forEach((aircraft) => {
        aircraftSimulator.advanceAircraft(aircraft);
      });
    }, 5000);
  }

  stopSimulation(): void {
    if (!this.timerId) {
      return;
    }

    clearInterval(this.timerId);
    this.timerId = null;
  }
}

export const simulationClock = new SimulationClock();