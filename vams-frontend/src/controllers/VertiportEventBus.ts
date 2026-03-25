export type VertiportEvent =
  | 'SLOT_CONFIRMED'
  | 'AIRCRAFT_LANDED'
  | 'PAD_ALLOCATED'
  | 'PAD_RELEASED'
  | 'CHARGING_STARTED'
  | 'CHARGING_COMPLETED'
  | 'aircraft_added'
  | 'aircraft_updated'
  | 'aircraft_removed'
  | 'aircraft_state_changed'
  | 'emergency_declared'
  | 'emergency_resolved'
  | 'landing_requested'
  | 'landing_slot_assigned'
  | 'pad_reserved'
  | 'taxi_route_assigned'
  | 'taxi_segment_reserved'
  | 'taxi_segment_released';

class VertiportEventBusService {
  private listeners: Record<string, Function[]> = {};

  subscribe(event: VertiportEvent, handler: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(handler);
  }

  on(event: VertiportEvent, handler: Function): void {
    this.subscribe(event, handler);
  }

  unsubscribe(event: VertiportEvent, handler: Function): void {
    const eventListeners = this.listeners[event];
    if (!eventListeners?.length) {
      return;
    }

    this.listeners[event] = eventListeners.filter((fn) => fn !== handler);
  }

  off(event: VertiportEvent, handler: Function): void {
    this.unsubscribe(event, handler);
  }

  emit(event: VertiportEvent, payload?: any): void {
    this.listeners[event]?.forEach((fn) => fn(payload));
  }
}

export const VertiportEventBus = new VertiportEventBusService();
export const vertiportEventBus = VertiportEventBus;
