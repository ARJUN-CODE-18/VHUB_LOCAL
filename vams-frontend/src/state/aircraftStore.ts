export interface AircraftStoreItem {
  id: string;
  state: string;
  route?: string[];
  routeIndex?: number;
  position?: {
    currentNode?: string;
    nextNode?: string;
    progress?: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  current_state?: string;
  tail_number?: string;
  callsign?: string;
  battery_level?: number | null;
  battery?: number | null;
  weight_kg?: number | null;
  max_range_km?: number | null;
  weight?: number | null;
  maxRange?: number | null;
  is_emergency?: boolean;
  assigned_pad?: string | null;
  pad_id?: string | null;
  aircraft_type?: string;
  operator?: string;
  created_at?: string;
  updated_at?: string;
}

export type AircraftStoreInput = {
  id: string;
  state?: string;
  route?: string[];
  routeIndex?: number;
  position?: unknown;
  current_state?: string;
  tail_number?: string;
  callsign?: string;
  battery_level?: number | null;
  battery?: number | null;
  weight_kg?: number | null;
  max_range_km?: number | null;
  weight?: number | null;
  maxRange?: number | null;
  is_emergency?: boolean;
  assigned_pad?: string | null;
  pad_id?: string | null;
  aircraft_type?: string;
  operator?: string;
  created_at?: string;
  updated_at?: string;
};

let aircraftList: AircraftStoreItem[] = [];

function normalizeAircraft(aircraft: AircraftStoreInput): AircraftStoreItem {
  const nextState = String(
    aircraft.state ?? aircraft.current_state ?? 'APPROACH',
  ).toUpperCase();

  const normalized: AircraftStoreItem = {
    id: aircraft.id,
    state: nextState,
    current_state: nextState,
  };

  if (aircraft.tail_number !== undefined) normalized.tail_number = aircraft.tail_number;
  if (aircraft.callsign !== undefined) normalized.callsign = aircraft.callsign;
  if (aircraft.route !== undefined) normalized.route = [...aircraft.route];
  if (aircraft.routeIndex !== undefined) normalized.routeIndex = aircraft.routeIndex;
  if (typeof aircraft.position === 'object' && aircraft.position !== null) {
    const position = aircraft.position as {
      currentNode?: string;
      nextNode?: string;
      progress?: number;
      latitude?: number;
      longitude?: number;
      altitude?: number;
    };

    const hasMovementPosition =
      typeof position.currentNode === 'string' || typeof position.progress === 'number';
    const hasGeoPosition =
      typeof position.latitude === 'number' && typeof position.longitude === 'number';

    if (hasMovementPosition || hasGeoPosition) {
      normalized.position = {
        ...(typeof position.currentNode === 'string' ? { currentNode: position.currentNode } : {}),
        ...(typeof position.progress === 'number' ? { progress: position.progress } : {}),
        ...(typeof position.nextNode === 'string' ? { nextNode: position.nextNode } : {}),
        ...(typeof position.latitude === 'number' ? { latitude: position.latitude } : {}),
        ...(typeof position.longitude === 'number' ? { longitude: position.longitude } : {}),
        ...(typeof position.altitude === 'number' ? { altitude: position.altitude } : {}),
      };
    }
  }

  const batteryValue = aircraft.battery_level ?? aircraft.battery;
  if (batteryValue !== undefined) {
    normalized.battery_level = batteryValue;
    normalized.battery = batteryValue;
  }

  const weightValue = aircraft.weight_kg ?? aircraft.weight;
  if (weightValue !== undefined) {
    normalized.weight_kg = weightValue;
    normalized.weight = weightValue;
  }

  const maxRangeValue = aircraft.max_range_km ?? aircraft.maxRange;
  if (maxRangeValue !== undefined) {
    normalized.max_range_km = maxRangeValue;
    normalized.maxRange = maxRangeValue;
  }

  if (aircraft.is_emergency !== undefined) normalized.is_emergency = aircraft.is_emergency;
  if (aircraft.assigned_pad !== undefined) normalized.assigned_pad = aircraft.assigned_pad;
  if (aircraft.pad_id !== undefined) normalized.pad_id = aircraft.pad_id;
  if (aircraft.aircraft_type !== undefined) normalized.aircraft_type = aircraft.aircraft_type;
  if (aircraft.operator !== undefined) normalized.operator = aircraft.operator;
  if (aircraft.created_at !== undefined) normalized.created_at = aircraft.created_at;
  if (aircraft.updated_at !== undefined) normalized.updated_at = aircraft.updated_at;

  return normalized;
}

export function setAircraftList(nextAircraft: AircraftStoreInput[]): void {
  const deduped = new Map<string, AircraftStoreItem>();

  nextAircraft.forEach((aircraft) => {
    if (!aircraft.id) {
      return;
    }
    deduped.set(aircraft.id, normalizeAircraft(aircraft));
  });

  aircraftList = [...deduped.values()];
  console.log('Aircraft Store:', getAircraftList());
}

export function addAircraft(aircraft: AircraftStoreInput): AircraftStoreItem | null {
  if (!aircraft.id) {
    return null;
  }

  const normalized = normalizeAircraft(aircraft);
  const existingIndex = aircraftList.findIndex((item) => item.id === normalized.id);

  if (existingIndex >= 0) {
    const previous = aircraftList[existingIndex];
    if (!previous) {
      return null;
    }

    aircraftList = aircraftList.map((item, index) =>
      index === existingIndex ? { ...previous, ...normalized } : item,
    );

    console.log('Aircraft Store:', getAircraftList());
    return aircraftList[existingIndex] ?? null;
  }

  aircraftList = [...aircraftList, normalized];
  console.log('Aircraft Store:', getAircraftList());
  return normalized;
}

export function getAircraftList(): AircraftStoreItem[] {
  return aircraftList.map((aircraft) => ({ ...aircraft }));
}

export function updateAircraft(
  id: string,
  updates: Partial<AircraftStoreItem>,
): AircraftStoreItem | null {
  let updatedAircraft: AircraftStoreItem | null = null;

  aircraftList = aircraftList.map((aircraft) => {
    if (aircraft.id !== id) {
      return aircraft;
    }

    const nextState = updates.state ?? updates.current_state;
    const normalizedState =
      nextState != null ? String(nextState).toUpperCase() : aircraft.state;

    updatedAircraft = {
      ...aircraft,
      ...updates,
      state: normalizedState,
      current_state: normalizedState,
    };

    return updatedAircraft;
  });

  console.log('Aircraft Store:', getAircraftList());
  return updatedAircraft;
}

export function removeAircraft(id: string): void {
  aircraftList = aircraftList.filter((aircraft) => aircraft.id !== id);
  console.log('Aircraft Store:', getAircraftList());
}
