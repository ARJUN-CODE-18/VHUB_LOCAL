import React from 'react';
import ReactDOM from 'react-dom/client';
import { aircraftApi } from './api/aircraft';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import { emergencyController } from './controllers/EmergencyController';
import { VertiportEventBus } from './controllers/VertiportEventBus';
import { setAircraftList, getAircraftList } from './state/aircraftStore';
import { API_BASE_URL, WS_UPDATES_URL } from './config/runtime';
import './index.css';

console.log('RUNTIME URLS:', {
  api: API_BASE_URL,
  ws: WS_UPDATES_URL,
  href: window.location.href,
});

emergencyController.init();

function startRealtimeAircraftSync() {
  const connect = () => {
    const socket = new WebSocket(WS_UPDATES_URL);

    socket.onopen = () => {
      console.log('WS CONNECTED:', WS_UPDATES_URL);
    };

    socket.onmessage = (event) => {
      console.log('WS EVENT:', event.data);
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          aircraft?: unknown[];
          data?: unknown;
        };

        if (payload.type === 'UPDATE') {
          const nested = payload.data && typeof payload.data === 'object'
            ? (payload.data as { aircraft?: unknown[] })
            : undefined;

          const nextAircraft = Array.isArray(payload.aircraft)
            ? payload.aircraft
            : nested?.aircraft;

          if (Array.isArray(nextAircraft)) {
            setAircraftList(nextAircraft as Parameters<typeof setAircraftList>[0]);
            VertiportEventBus.emit('aircraft_updated', getAircraftList());
          }
          return;
        }

        if (payload.type === 'AIRCRAFT_UPDATED' && payload.data && typeof payload.data === 'object') {
          const current = getAircraftList();
          const next = payload.data as Record<string, unknown>;
          const id = typeof next.id === 'string' ? next.id : null;

          if (id) {
            const exists = current.some((item) => item.id === id);
            const merged = exists
              ? current.map((item) => (item.id === id ? { ...item, ...next } : item))
              : [...current, next];

            setAircraftList(merged as Parameters<typeof setAircraftList>[0]);
          }

          VertiportEventBus.emit('aircraft_updated', getAircraftList());
        }
      } catch {
        // Ignore malformed realtime payloads.
      }
    };

    socket.onclose = () => {
      setTimeout(connect, 2000);
    };
  };

  connect();
}

void aircraftApi
  .getAll()
  .then((aircraft) => {
    setAircraftList(aircraft);
    VertiportEventBus.emit('aircraft_updated', getAircraftList());
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize aircraft store', error);
  });

startRealtimeAircraftSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
