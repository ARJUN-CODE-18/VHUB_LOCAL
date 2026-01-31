import { useEffect, useState } from 'react';
import { emergencyApi } from '../../api/emergency';
import { EmergencyEvent } from '../../types/emergency';
import ErrorDisplay from '../common/ErrorDisplay';

const Emergency = () => {
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await emergencyApi.getAll();
      setEvents(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load emergency events');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'CRITICAL':
        return 'bg-red-600 text-white border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AIRCRAFT':
        return '✈️';
      case 'PAD':
        return '🅿️';
      case 'WEATHER':
        return '🌤️';
      case 'SYSTEM':
        return '⚙️';
      default:
        return '🚨';
    }
  };

  // Defensive checks: ensure events is array before filtering
  const safeEvents = Array.isArray(events) ? events : [];
  const activeEvents = safeEvents.filter(e => e.status === 'ACTIVE');
  const resolvedEvents = safeEvents.filter(e => e.status === 'RESOLVED');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading emergency events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Management</h1>
        <button
          onClick={loadEvents}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          🔄 Refresh
        </button>
      </div>

      <ErrorDisplay message={error} />

      {/* Active Emergencies */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Active Emergencies</h2>
          <span className={`px-4 py-2 rounded-lg font-bold ${
            activeEvents.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {activeEvents.length} Active
          </span>
        </div>

        {activeEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            ✓ No active emergencies
          </div>
        ) : (
          <div className="space-y-4">
            {activeEvents.map((event) => (
              <div
                key={event.id}
                className={`border-2 rounded-lg p-4 ${getSeverityColor(event.severity)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(event.event_type)}</span>
                    <div>
                      <h3 className="font-bold text-lg">{event.event_type}</h3>
                      <p className="text-sm opacity-90">{new Date(event.declared_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white bg-opacity-50">
                    {event.severity}
                  </span>
                </div>
                <p className="mt-2">{event.description}</p>
                {event.aircraft_id && (
                  <p className="mt-2 text-sm font-medium">Aircraft: {event.aircraft_id}</p>
                )}
                {event.pad_id && (
                  <p className="mt-1 text-sm font-medium">Pad: {event.pad_id}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Emergencies */}
      {resolvedEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Resolved Emergencies</h2>
          <div className="space-y-3">
            {resolvedEvents.map((event) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xl opacity-50">{getTypeIcon(event.event_type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-700">{event.event_type}</h3>
                      <p className="text-xs text-gray-500">
                        Declared: {new Date(event.declared_at).toLocaleString()}
                      </p>
                      {event.resolved_at && (
                        <p className="text-xs text-gray-500">
                          Resolved: {new Date(event.resolved_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                    {event.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{event.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Emergency;