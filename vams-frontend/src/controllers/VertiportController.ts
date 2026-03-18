import { vertiportEventBus } from './VertiportEventBus';
import { simulationClock } from '../simulation/SimulationClock';
import type { SimulatedAircraft } from '../simulation/AircraftSimulator';
import type { AircraftState } from '../types/aircraftState';
import { arrivalSequencer } from '../operations/ArrivalSequencer';
import { taxiwayManager } from '../ground/TaxiwayManager';

export interface Aircraft {
  id: string;
  callsign?: string;
  eta?: number;
  priority?: number;
  status: 'WAITING' | 'LANDING' | 'TAXIING' | 'CHARGING';
  route: string[];
  currentStep: number;
  state?: AircraftState;
}

export interface Vertipad {
  id: string;
  occupiedBy?: string;
}

class VertiportController {
  pads: Vertipad[] = [{ id: 'PAD-1' }, { id: 'PAD-2' }];

  taxiwayBusy = false;

  aircraftQueue: Aircraft[] = [];

  activeAircraft: Aircraft[] = [];

  constructor() {
    vertiportEventBus.subscribe('AIRCRAFT_LANDED', (aircraft: Aircraft) => {
      this.allocatePad(aircraft);
    });

    vertiportEventBus.subscribe('PAD_ALLOCATED', (aircraft: Aircraft) => {
      this.startTaxi(aircraft);
    });

    vertiportEventBus.subscribe('PAD_RELEASED', (padId: string) => {
      this.handlePadRelease(padId);
    });
  }

  allocatePad(aircraft?: Aircraft): Vertipad | undefined {
    const availablePad = this.pads.find((pad) => !pad.occupiedBy);

    if (!availablePad || !aircraft) {
      return availablePad;
    }

    availablePad.occupiedBy = aircraft.id;
    aircraft.status = 'LANDING';
    vertiportEventBus.emit('PAD_ALLOCATED', aircraft);
    return availablePad;
  }

  queueAircraft(aircraft: Aircraft): void {
    const queuedAircraft = { ...aircraft, status: 'WAITING' as const };
    this.aircraftQueue.push(queuedAircraft);
    vertiportEventBus.emit('SLOT_CONFIRMED', queuedAircraft);
  }

  startTaxi(aircraftOrId: Aircraft | string): boolean {
    if (this.taxiwayBusy) {
      return false;
    }

    const aircraftId =
      typeof aircraftOrId === 'string' ? aircraftOrId : aircraftOrId.id;

    let aircraft = this.activeAircraft.find((item) => item.id === aircraftId);

    if (!aircraft) {
      const queueIndex = this.aircraftQueue.findIndex((item) => item.id === aircraftId);
      if (queueIndex === -1) {
        return false;
      }

      const dequeuedAircraft = this.aircraftQueue.splice(queueIndex, 1)[0];
      if (!dequeuedAircraft) {
        return false;
      }

      aircraft = dequeuedAircraft;
      this.activeAircraft.push(dequeuedAircraft);
    }

    if (aircraft.currentStep >= aircraft.route.length - 1) {
      return false;
    }

    aircraft.status = 'TAXIING';
    this.taxiwayBusy = true;
    return true;
  }

  updateMovement(aircraftId: string): Aircraft | undefined {
    const aircraft = this.activeAircraft.find((item) => item.id === aircraftId);
    if (!aircraft) {
      return undefined;
    }

    if (aircraft.currentStep >= aircraft.route.length - 1) {
      if (aircraft.route[aircraft.currentStep] === 'CHARGING') {
        aircraft.status = 'CHARGING';
      }
      this.taxiwayBusy = false;
      return aircraft;
    }

    const currentNode = aircraft.route[aircraft.currentStep];
    if (currentNode?.startsWith('PAD-')) {
      this.releasePad(currentNode);
    }

    aircraft.currentStep += 1;
    const nextNode = aircraft.route[aircraft.currentStep];

    if (nextNode?.startsWith('PAD-')) {
      const pad = this.pads.find((item) => item.id === nextNode);
      if (pad) {
        pad.occupiedBy = aircraft.id;
      }
      aircraft.status = 'LANDING';
      this.taxiwayBusy = false;
      vertiportEventBus.emit('AIRCRAFT_LANDED', aircraft);
      return aircraft;
    }

    if (nextNode === 'CHARGING') {
      aircraft.status = 'CHARGING';
      this.taxiwayBusy = false;
      vertiportEventBus.emit('CHARGING_STARTED', aircraft);
      return aircraft;
    }

    aircraft.status = 'TAXIING';
    return aircraft;
  }

  releasePad(padId: string): void {
    const pad = this.pads.find((item) => item.id === padId);
    if (pad) {
      delete pad.occupiedBy;
      vertiportEventBus.emit('PAD_RELEASED', padId);
    }
  }

  handlePadRelease(_padId: string): void {
    this.taxiwayBusy = false;
  }

  startSimulation(): void {
    const simulationAircraft = this.getSimulationAircraft();
    const padIds = this.pads.map((pad) => pad.id);

    arrivalSequencer.start(padIds);
    taxiwayManager.start(padIds);
    simulationClock.startSimulation(simulationAircraft);
  }

  stopSimulation(): void {
    arrivalSequencer.stop();
    taxiwayManager.stop();
    simulationClock.stopSimulation();
  }

  private getSimulationAircraft(): SimulatedAircraft[] {
    const aircraftById = new Map<string, Aircraft>();

    this.activeAircraft.forEach((aircraft) => {
      aircraftById.set(aircraft.id, aircraft);
    });

    this.aircraftQueue.forEach((aircraft) => {
      if (!aircraftById.has(aircraft.id)) {
        aircraftById.set(aircraft.id, aircraft);
      }
    });

    return [...aircraftById.values()].map((aircraft) => {
      if (!aircraft.state) {
        aircraft.state = 'APPROACH';
      }

      if (!aircraft.callsign) {
        aircraft.callsign = aircraft.id;
      }

      if (!aircraft.eta) {
        aircraft.eta = Date.now();
      }

      if (!aircraft.priority) {
        aircraft.priority = 50;
      }

      return aircraft as SimulatedAircraft;
    });
  }
}

export const vertiportController = new VertiportController();
