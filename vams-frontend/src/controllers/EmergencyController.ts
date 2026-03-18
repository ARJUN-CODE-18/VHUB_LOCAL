import { VertiportEventBus } from './VertiportEventBus';
import {
  getEmergencies,
  syncEmergencyFromStateChange,
  type AircraftStateChangeEvent,
} from '../state/emergencyStore';

class EmergencyController {
  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }

    VertiportEventBus.on(
      'aircraft_state_changed',
      (payload: AircraftStateChangeEvent) => {
        const result = syncEmergencyFromStateChange(payload);

        if (result.action === 'added' && result.aircraftId) {
          const emergency = getEmergencies().find(
            (item) => item.id === result.aircraftId,
          );
          if (emergency) {
            console.log('Emergency added:', emergency);
            VertiportEventBus.emit('emergency_declared', emergency);
          }
          console.log('Emergency list:', getEmergencies());
          return;
        }

        if (result.action === 'removed' && result.aircraftId) {
          VertiportEventBus.emit('emergency_resolved', result.aircraftId);
          console.log('Emergency list:', getEmergencies());
        }
      },
    );

    this.initialized = true;
  }
}

export const emergencyController = new EmergencyController();
