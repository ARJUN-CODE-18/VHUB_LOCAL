import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import { DashboardStatus } from '../../types/dashboard';
import ErrorDisplay from '../common/ErrorDisplay';

const Dashboard = () => {
  const [data, setData] = useState<DashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardApi.getStatus();
      setData(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <ErrorDisplay message={error || 'Dashboard data unavailable'} />
      </div>
    );
  }

  /* ================= SAFE NORMALIZATION ================= */

  const aircraft = data.aircraft ?? {
    total: 0,
    by_state: {},
  };

  const vertipads = data.vertipads ?? {
    total: 0,
    available: 0,
    occupied: 0,
  };

  const slots = data.slots ?? {
    upcoming_count: 0,
    upcoming: [],
  } as typeof data.slots;

  const emergency = data.emergency ?? {
    system_nominal: true,
    aircraft_emergencies: 0,
    locked_pads: 0,
  };

  const activeEmergencies =
    emergency.aircraft_emergencies + emergency.locked_pads;

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Aircraft */}
        <Link
          to="/aircraft"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Aircraft</p>
              <p className="text-3xl font-bold text-gray-900">
                {aircraft.total}
              </p>
            </div>
            <div className="text-4xl">✈️</div>
          </div>

          <div className="mt-2 text-sm text-gray-500 space-y-1">
            {Object.entries(aircraft.by_state ?? {}).length === 0 && (
              <p>No aircraft states</p>
            )}
            {Object.entries(aircraft.by_state ?? {}).map(
              ([state, count]) => (
                <div key={state}>
                  {state}: {count}
                </div>
              )
            )}
          </div>
        </Link>

        {/* Pads */}
        <Link
          to="/pads"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Available Pads
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {vertipads.available}
              </p>
            </div>
            <div className="text-4xl">🅿️</div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {vertipads.occupied} occupied / {vertipads.total} total
          </p>
        </Link>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                System Status
              </p>
              <p
                className={`text-3xl font-bold ${
                  emergency.system_nominal
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {emergency.system_nominal ? 'NOMINAL' : 'ALERT'}
              </p>
            </div>
            <div className="text-4xl">🚨</div>
          </div>

          <div
            className={`mt-2 inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
              emergency.system_nominal
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {emergency.system_nominal
              ? '✓ All Clear'
              : `${activeEmergencies} Active`}
          </div>
        </div>

        {/* Slots */}
        <Link
          to="/slots"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Upcoming Slots
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {slots.upcoming_count}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Next window</p>
        </Link>
      </div>

      {/* Footer */}
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-500 text-center">
          Last updated: {new Date(data.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
