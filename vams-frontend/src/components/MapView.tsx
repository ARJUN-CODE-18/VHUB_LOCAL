import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AircraftStoreItem } from '../state/aircraftStore';
import { MAP_CONFIG, PAD_COORDINATES } from '../config/mapConfig';
import droneMarker from '../assets/drone-marker.svg';

type PadStatusLike = {
  id: string;
  state: string;
  current_aircraft_id: string | null;
};

type MapViewProps = {
  aircraft: AircraftStoreItem[];
  pads: PadStatusLike[];
};

const NEAR_PAD_THRESHOLD_M = 120;

const droneIcon = new Icon({
  iconUrl: droneMarker,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  className: 'drone-marker-icon',
});

function haversineMeters(a: LatLngTuple, b: LatLngTuple): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusM = 6371000;

  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);

  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

function roundMeters(value: number): number {
  return Math.round(value);
}

function normalizePadId(padId?: string | null): string | null {
  if (!padId) {
    return null;
  }

  const normalized = padId.toUpperCase().trim();
  if (normalized.startsWith('PAD_') || normalized === 'CHARGING' || normalized === 'TAXI_A') {
    return normalized;
  }
  if (normalized.startsWith('PAD-')) {
    return normalized.replace('PAD-', 'PAD_');
  }

  const vpMatch = normalized.match(/^VP-(\d+)$/);
  if (vpMatch?.[1]) {
    return `PAD_${vpMatch[1]}`;
  }

  return normalized;
}

function getPadCoordinate(padId?: string | null): LatLngTuple | null {
  const normalized = normalizePadId(padId);
  if (!normalized) {
    return null;
  }
  return PAD_COORDINATES[normalized] ?? null;
}

function getAircraftCoordinate(aircraftItem: AircraftStoreItem): LatLngTuple | null {
  const position = aircraftItem.position;
  if (position && typeof position.latitude === 'number' && typeof position.longitude === 'number') {
    return [position.latitude, position.longitude];
  }

  const padCoordinate = getPadCoordinate(aircraftItem.pad_id ?? aircraftItem.assigned_pad ?? null);
  return padCoordinate;
}

function getStatusColor(state?: string): string {
  const normalizedState = String(state ?? '').toUpperCase();
  if (normalizedState === 'CHARGING') {
    return '#2563eb';
  }
  if (normalizedState === 'IN_AIR' || normalizedState === 'APPROACH' || normalizedState === 'FINAL_APPROACH') {
    return '#dc2626';
  }
  if (normalizedState === 'AT_PAD' || normalizedState === 'PARKED' || normalizedState === 'LANDED') {
    return '#16a34a';
  }
  return '#374151';
}

const MapView = ({ aircraft, pads }: MapViewProps) => {
  const [tileLoadFailed, setTileLoadFailed] = useState(false);
  const [anyTileLoaded, setAnyTileLoaded] = useState(false);

  const tileUrl = MAP_CONFIG.apiKey
    ? MAP_CONFIG.tileUrlTemplate.replace('{apiKey}', encodeURIComponent(MAP_CONFIG.apiKey))
    : MAP_CONFIG.fallbackTileUrlTemplate;
  const tileAttribution = MAP_CONFIG.apiKey
    ? MAP_CONFIG.tileAttribution
    : MAP_CONFIG.fallbackTileAttribution;

  const padMarkers = useMemo(
    () =>
      pads
        .map((pad) => {
          const coordinate = getPadCoordinate(pad.id);
          if (!coordinate) {
            return null;
          }

          return {
            id: pad.id,
            coordinate,
            occupied: Boolean(pad.current_aircraft_id),
            state: pad.state,
            currentAircraftId: pad.current_aircraft_id,
          };
        })
        .filter((pad): pad is NonNullable<typeof pad> => pad !== null),
    [pads],
  );

  const aircraftMarkers = useMemo(
    () =>
      aircraft
        .map((aircraftItem) => {
          const coordinate = getAircraftCoordinate(aircraftItem);
          if (!coordinate) {
            return null;
          }

          const currentState = aircraftItem.state ?? aircraftItem.current_state ?? 'UNKNOWN';

          const assignedPadId = aircraftItem.pad_id ?? aircraftItem.assigned_pad ?? null;
          const assignedPadCoordinate = getPadCoordinate(assignedPadId);

          const nearestPad = padMarkers.reduce<{ id: string; coordinate: LatLngTuple; distance: number } | null>(
            (nearest, pad) => {
              const distance = haversineMeters(coordinate, pad.coordinate);
              if (!nearest || distance < nearest.distance) {
                return { id: pad.id, coordinate: pad.coordinate, distance };
              }
              return nearest;
            },
            null,
          );

          const targetPadId = assignedPadId ?? nearestPad?.id ?? null;
          const targetCoordinate = assignedPadCoordinate ?? nearestPad?.coordinate ?? null;
          const distanceMeters = targetCoordinate ? haversineMeters(coordinate, targetCoordinate) : null;
          const isNearPad = distanceMeters !== null && distanceMeters <= NEAR_PAD_THRESHOLD_M;

          return {
            id: aircraftItem.id,
            coordinate,
            state: currentState,
            color: getStatusColor(currentState),
            targetPadId,
            targetCoordinate,
            distanceMeters,
            isNearPad,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [aircraft, padMarkers],
  );

  const hiddenAircraftCount = Math.max(aircraft.length - aircraftMarkers.length, 0);
  const nearPadCount = aircraftMarkers.filter((item) => item.isNearPad).length;
  const averageDistanceMeters =
    aircraftMarkers.filter((item) => item.distanceMeters !== null).reduce((sum, item) => sum + (item.distanceMeters ?? 0), 0) /
      Math.max(aircraftMarkers.filter((item) => item.distanceMeters !== null).length, 1);

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
        <MapContainer
          center={MAP_CONFIG.defaultCenter}
          zoom={MAP_CONFIG.defaultZoom}
          scrollWheelZoom
          className="h-[360px] w-full"
        >
          <TileLayer
            url={tileUrl}
            attribution={tileAttribution}
            eventHandlers={{
              tileerror: () => setTileLoadFailed(true),
              tileload: () => setAnyTileLoaded(true),
            }}
          />

          {aircraftMarkers
            .filter((item) => item.targetCoordinate)
            .map((item) => (
              <Polyline
                key={`path-${item.id}`}
                positions={[item.coordinate, item.targetCoordinate!]}
                pathOptions={{
                  color: item.isNearPad ? '#16a34a' : '#f59e0b',
                  weight: item.isNearPad ? 3 : 2,
                  dashArray: item.isNearPad ? '4 6' : '8 8',
                  opacity: 0.9,
                }}
              />
            ))}

          {padMarkers.map((pad) => (
            <CircleMarker
              key={`pad-${pad.id}`}
              center={pad.coordinate}
              radius={7}
              color={pad.occupied ? '#b91c1c' : '#15803d'}
              fillColor={pad.occupied ? '#ef4444' : '#22c55e'}
              fillOpacity={0.9}
              weight={2}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div className="text-xs">
                  <div className="font-semibold">Pad: {pad.id}</div>
                  <div>Status: {pad.state}</div>
                  <div>Occupancy: {pad.occupied ? 'Occupied' : 'Available'}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

          {aircraftMarkers.map((item) => (
            <CircleMarker
              key={`aircraft-${item.id}`}
              center={item.coordinate}
              radius={12}
              color={item.color}
              fillColor={item.color}
              fillOpacity={0.15}
              weight={1}
            />
          ))}

          {aircraftMarkers.map((item) => (
            <Marker
              key={`drone-${item.id}`}
              position={item.coordinate}
              icon={droneIcon}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <div className="font-semibold">Drone ID: {item.id}</div>
                  <div>Status: {item.state}</div>
                  {item.targetPadId && <div>Target Pad: {item.targetPadId}</div>}
                  {item.distanceMeters !== null && (
                    <div>
                      Distance to pad: {roundMeters(item.distanceMeters)} m {item.isNearPad ? '(near)' : ''}
                    </div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {!anyTileLoaded && tileLoadFailed && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-4 text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-600">Map tiles failed to load.</p>
              <p className="text-xs text-gray-700">Check internet access, API key, or tile provider availability.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">Drone pathway layout active</span>
        <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">Aircraft rendered: {aircraftMarkers.length}</span>
        <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">Pads rendered: {padMarkers.length}</span>
        <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">Drones near pad: {nearPadCount}</span>
        <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">Avg distance: {roundMeters(averageDistanceMeters)} m</span>
        {hiddenAircraftCount > 0 && (
          <span className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700">
            {hiddenAircraftCount} aircraft missing coordinates
          </span>
        )}
        {!MAP_CONFIG.apiKey && (
          <span className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700">
            Using OpenStreetMap fallback (no API key configured)
          </span>
        )}
      </div>
    </div>
  );
};

export default MapView;
