export interface EmergencyAircraft {
  id: string;
  callsign: string;
  status: string;
  batteryLevel: number | null;
  assignedPad: string | null;
}

export interface EmergencyAircraftInput {
  id: string;
  callsign?: string | null;
  status?: string | null;
  batteryLevel?: number | null;
  assignedPad?: string | null;
}

export interface AircraftStateChangeEvent {
  aircraftId?: string;
  id?: string;
  newState?: string;
  state?: string;
  status?: string;
  callsign?: string;
  tail_number?: string;
  battery_level?: number;
  batteryLevel?: number;
  assigned_pad?: string;
  assignedPad?: string;
}

export interface AircraftSnapshot {
  id: string;
  tail_number?: string;
  state?: string;
  current_state?: string;
  is_emergency?: boolean;
  battery_level?: number;
  assigned_pad?: string;
}

const emergencyMap = new Map<string, EmergencyAircraft>();

function toEmergencyAircraft(input: EmergencyAircraftInput): EmergencyAircraft {
  return {
    id: input.id,
    callsign: input.callsign ?? input.id,
    status: input.status ?? 'EMERGENCY',
    batteryLevel: input.batteryLevel ?? null,
    assignedPad: input.assignedPad ?? null,
  };
}

export function addEmergency(aircraft: EmergencyAircraftInput): void {
  const normalized = toEmergencyAircraft(aircraft);
  const existing = emergencyMap.get(normalized.id);

  if (!existing) {
    emergencyMap.set(normalized.id, normalized);
    return;
  }

  emergencyMap.set(normalized.id, {
    ...existing,
    ...normalized,
    callsign: normalized.callsign || existing.callsign,
    status: normalized.status || existing.status,
    batteryLevel: normalized.batteryLevel ?? existing.batteryLevel,
    assignedPad: normalized.assignedPad ?? existing.assignedPad,
  });
}

export function removeEmergency(aircraftId: string): void {
  emergencyMap.delete(aircraftId);
}

export function getEmergencies(): EmergencyAircraft[] {
  return [...emergencyMap.values()];
}

export function syncEmergenciesFromAircraft(
  aircraftList: AircraftSnapshot[],
): void {
  aircraftList.forEach((aircraft) => {
    const state = aircraft.state ?? aircraft.current_state;
    const isEmergency = aircraft.is_emergency || state === 'EMERGENCY';

    if (isEmergency) {
      addEmergency({
        id: aircraft.id,
        callsign: aircraft.tail_number ?? aircraft.id,
        status: state ?? 'EMERGENCY',
        batteryLevel: aircraft.battery_level ?? null,
        assignedPad: aircraft.assigned_pad ?? null,
      });
      return;
    }

    removeEmergency(aircraft.id);
  });
}

export function syncEmergencyFromStateChange(payload: AircraftStateChangeEvent): {
  action: 'added' | 'removed' | 'ignored';
  aircraftId?: string;
} {
  const aircraftId = payload.aircraftId ?? payload.id;
  const state = payload.newState ?? payload.state ?? payload.status;

  if (!aircraftId || !state) {
    return { action: 'ignored' };
  }

  if (state === 'EMERGENCY') {
    addEmergency({
      id: aircraftId,
      callsign: payload.callsign ?? payload.tail_number ?? aircraftId,
      status: state,
      batteryLevel: payload.batteryLevel ?? payload.battery_level ?? null,
      assignedPad: payload.assignedPad ?? payload.assigned_pad ?? null,
    });
    return { action: 'added', aircraftId };
  }

  removeEmergency(aircraftId);
  return { action: 'removed', aircraftId };
}
