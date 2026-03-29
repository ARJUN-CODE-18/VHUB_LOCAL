import type { LatLngTuple } from 'leaflet';

export const MAP_CONFIG = {
  apiKey: 'Q6NYQ8GMY4tnpzEAhhc8',
  defaultCenter: [12.9716, 77.5946] as LatLngTuple,
  defaultZoom: 16,
  tileUrlTemplate:
    'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key={apiKey}',
  fallbackTileUrlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://stadiamaps.com">Stadia Maps</a>',
  fallbackTileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export const PAD_COORDINATES: Record<string, LatLngTuple> = {
  PAD_1: [12.97183, 77.5942],
  PAD_2: [12.97183, 77.595],
  CHARGING: [12.97135, 77.5946],
  TAXI_A: [12.97157, 77.5946],
};
