import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aircraftApi } from '../../api/aircraft';
import { VertiportEventBus } from '../../controllers/VertiportEventBus';
import { Aircraft } from '../../types/aircraft';
import ErrorDisplay from '../common/ErrorDisplay';
import normalizeArray from '../../utils/normalizeArray';
import { getAircraftList, setAircraftList } from '../../state/aircraftStore';

const AircraftList = () => {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const refreshList = () => {
      const storedAircraft = getAircraftList();
      setAircraft(normalizeArray<Aircraft>(storedAircraft));
    };

    void loadAircraft();

    VertiportEventBus.on('aircraft_added', refreshList);
    VertiportEventBus.on('aircraft_updated', refreshList);
    VertiportEventBus.on('aircraft_removed', refreshList);
    VertiportEventBus.on('aircraft_state_changed', refreshList);

    return () => {
      VertiportEventBus.off('aircraft_added', refreshList);
      VertiportEventBus.off('aircraft_updated', refreshList);
      VertiportEventBus.off('aircraft_removed', refreshList);
      VertiportEventBus.off('aircraft_state_changed', refreshList);
    };
  }, []);

  const loadAircraft = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aircraftApi.getAll();
      const normalized = normalizeArray<Aircraft>(data);
      setAircraftList(normalized);
      setAircraft(normalizeArray<Aircraft>(getAircraftList()));
    } catch (err: unknown) {
      let message = 'Failed to load aircraft';
      if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800';
      case 'CHARGING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PARKED':
        return 'bg-green-100 text-green-800';
      case 'DEPARTED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getBatteryColor = (level: number | undefined) => {
    if (level == null) return 'text-gray-400';
    if (level < 20) return 'text-red-600';
    if (level < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading aircraft...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Aircraft Operations</h1>
        <button
          onClick={() => navigate('/aircraft/register')}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          + Register Aircraft
        </button>
      </div>

      <ErrorDisplay message={error} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tail Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Operator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                State
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Battery
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {aircraft.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No aircraft registered
                </td>
              </tr>
            ) : (
              aircraft.map((ac) => (
                <tr
                  key={ac.id}
                  onClick={() => navigate(`/aircraft/${encodeURIComponent(ac.id)}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{ac.tail_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{ac.aircraft_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{ac.operator}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStateColor(ac.state)}`}>
                      {ac.state}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-semibold ${getBatteryColor(ac.battery_level)}`}>
                        {ac.battery_level ?? 'N/A'}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ac.is_emergency ? (
                      <span className="text-red-600 font-bold text-sm">🚨 EMERGENCY</span>
                    ) : (
                      <span className="text-green-600 text-sm">✓ Normal</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AircraftList;
