import { useEffect, useState } from 'react';
import { aircraftApi } from '../../api/aircraft';
import { VertiportEventBus } from '../../controllers/VertiportEventBus';
import {
  getEmergencies,
  syncEmergenciesFromAircraft,
  type EmergencyAircraft,
} from '../../state/emergencyStore';
import ErrorDisplay from '../common/ErrorDisplay';

const Emergency = () => {
  const [emergencies, setEmergencies] = useState<EmergencyAircraft[]>(
    getEmergencies(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshEmergencyList = () => {
    setEmergencies(getEmergencies());
  };

  const loadEmergencyAircraft = async () => {
    try {
      setLoading(true);
      setError(null);
      const aircraft = await aircraftApi.getAll();
      syncEmergenciesFromAircraft(aircraft);
      refreshEmergencyList();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load emergency aircraft');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmergencyAircraft();

    const update = () => {
      refreshEmergencyList();
    };

    VertiportEventBus.on('aircraft_state_changed', update);
    VertiportEventBus.on('emergency_declared', update);
    VertiportEventBus.on('emergency_resolved', update);

    return () => {
      VertiportEventBus.off('aircraft_state_changed', update);
      VertiportEventBus.off('emergency_declared', update);
      VertiportEventBus.off('emergency_resolved', update);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading emergency aircraft...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Management</h1>
        <button
          onClick={loadEmergencyAircraft}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          🔄 Refresh
        </button>
      </div>

      <ErrorDisplay message={error} />

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Active Emergencies</h2>
          <span className={`px-4 py-2 rounded-lg font-bold ${
            emergencies.length > 0
              ? 'bg-red-100 text-red-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {emergencies.length} Active Emergencies
          </span>
        </div>

        {emergencies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            ✓ No active emergencies
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aircraft ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Callsign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Battery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Pad
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emergencies.map((emergency) => (
                  <tr key={emergency.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{emergency.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{emergency.callsign}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        {emergency.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {emergency.batteryLevel == null ? 'N/A' : `${emergency.batteryLevel}%`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {emergency.assignedPad ?? 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Emergency;