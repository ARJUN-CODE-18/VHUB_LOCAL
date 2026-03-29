import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { aircraftApi } from './api/aircraft';
import Navigation from './components/layout/Navigation';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './components/dashboard/Dashboard';
import AircraftList from './components/aircraft/AircraftList';
import RegisterAircraft from './components/aircraft/RegisterAircraft';
import Pads from './components/pads/Pads';
import Slots from './components/slots/Slots';
import Weather from './pages/Weather';
import Login from './pages/Login';
import Energy from './components/energy/Energy';
import GroundOps from './components/groundops/GroundOps';
import Emergency from './components/emergency/Emergency';
import AircraftDetail from "./components/aircraft/AircraftDetail";
import { VertiportEventBus } from './controllers/VertiportEventBus';
import { setAircraftList, getAircraftList } from './state/aircraftStore';
import { WS_UPDATES_URL } from './config/runtime';
import { useAuthStore } from './store/authStore';

function startRealtimeAircraftSync() {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | undefined;
  let shouldStop = false;

  const connect = () => {
    if (shouldStop) {
      return;
    }

    socket = new WebSocket(WS_UPDATES_URL);

    socket.onopen = () => {
      console.log('WS CONNECTED:', WS_UPDATES_URL);
    };

    socket.onmessage = (event) => {
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
      if (shouldStop) {
        return;
      }
      reconnectTimer = window.setTimeout(connect, 2000);
    };
  };

  connect();

  return () => {
    shouldStop = true;

    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer);
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close();
    }
  };
}

function AppShell() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const isLoginRoute = location.pathname === '/login' || location.pathname === '/login/';

  useEffect(() => {
    if (!isAuthenticated) {
      setAircraftList([]);
      return;
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

    const stopRealtimeSync = startRealtimeAircraftSync();

    return () => {
      stopRealtimeSync();
    };
  }, [isAuthenticated]);

  return (
    <div className={isLoginRoute ? '' : 'min-h-screen bg-gray-100'}>
      {!isLoginRoute && <Navigation />}
      <div className={isLoginRoute ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {!isLoginRoute && <h1 className="text-sm font-semibold text-blue-700 mb-4">VAMS VERSION V3</h1>}
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            }
          />

          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            }
          />

          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/aircraft" element={<AircraftList />} />
            <Route path="/aircraft/register" element={<RegisterAircraft />} />
            <Route path="/pads" element={<Pads />} />
            <Route path="/slots" element={<Slots />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/energy" element={<Energy />} />
            <Route path="/ground-ops" element={<GroundOps />} />
            <Route path="/groundOps" element={<GroundOps />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/aircraft/:id" element={<AircraftDetail />} />

            <Route
              path="*"
              element={
                <div className="text-center py-20 text-gray-500">
                  Page not found
                </div>
              }
            />
          </Route>
        </Routes>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    console.log('VAMS BUILD VERSION: V3-LATEST');
  }, []);

  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
