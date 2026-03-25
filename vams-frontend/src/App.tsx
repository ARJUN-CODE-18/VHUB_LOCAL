import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/layout/Navigation';
import Dashboard from './components/dashboard/Dashboard';
import AircraftList from './components/aircraft/AircraftList';
import RegisterAircraft from './components/aircraft/RegisterAircraft';
import Pads from './components/pads/Pads';
import Slots from './components/slots/Slots';
import Weather from './pages/Weather';
import Energy from './components/energy/Energy';
import GroundOps from './components/groundops/GroundOps';
import Emergency from './components/emergency/Emergency';
import AircraftDetail from "./components/aircraft/AircraftDetail";

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const Router = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

function App() {
  useEffect(() => {
    console.log('VAMS BUILD VERSION: V3-LATEST');
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-sm font-semibold text-blue-700 mb-4">VAMS VERSION V3</h1>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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

            {/* Fallback */}
            <Route
              path="*"
              element={
                <div className="text-center py-20 text-gray-500">
                  Page not found
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
