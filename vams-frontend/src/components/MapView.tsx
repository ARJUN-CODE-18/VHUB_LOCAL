import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AircraftStoreItem } from '../state/aircraftStore';
import { MAP_CONFIG, PAD_COORDINATES } from '../config/mapConfig';

type PadStatusLike = {
  id: string;
  state: string;
  current_aircraft_id: string | null;
};

type MapViewProps = {
  aircraft: AircraftStoreItem[];
  pads: PadStatusLike[];
};

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

          return {
            id: aircraftItem.id,
            coordinate,
            state: currentState,
            color: getStatusColor(currentState),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [aircraft],
  );

  const hiddenAircraftCount = Math.max(aircraft.length - aircraftMarkers.length, 0);

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
              radius={9}
              color={item.color}
              fillColor={item.color}
              fillOpacity={0.95}
              weight={2}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <div className="font-semibold">Aircraft ID: {item.id}</div>
                  <div>Status: {item.state}</div>
                </div>
              </Tooltip>
            </CircleMarker>
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
        <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">Aircraft rendered: {aircraftMarkers.length}</span>
        <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">Pads rendered: {padMarkers.length}</span>
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
