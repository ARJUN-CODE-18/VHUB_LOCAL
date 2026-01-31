import { useEffect, useState } from 'react';
import { padsApi } from '../../api/pads';
import { Pad, PadStatus } from '../../types/pads';
import ErrorDisplay from '../common/ErrorDisplay';

interface EnergySession {
  id: string;
  pad_id: string;
  aircraft_id: string | undefined;
  started_at: string;
  power_kw: number;
  status: 'CHARGING' | 'IDLE';
}

const Energy = () => {
  const [sessions, setSessions] = useState<EnergySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEnergy();
  }, []);

  const loadEnergy = async () => {
    try {
      setLoading(true);
      setError(null);

      const pads = await padsApi.getAll();

      // Defensive check: ensure pads is array before filtering/mapping
      const safePads = Array.isArray(pads) ? pads : [];
      const derivedSessions: EnergySession[] = safePads
        .filter((pad: Pad) => pad.has_charging)
        .map((pad: Pad) => ({
          id: `energy-${pad.id}`,
          pad_id: pad.id,
          aircraft_id: pad.aircraft_id,
          started_at: pad.updated_at,
          power_kw: 150, // assumed fixed charger rating
          status: pad.status === PadStatus.CHARGING ? 'CHARGING' : 'IDLE'
        }));

      setSessions(derivedSessions);
    } catch (err) {
      setError('Failed to load energy data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'CHARGING'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading energy systems...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Energy & Charging</h1>
        <button
          onClick={loadEnergy}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          🔄 Refresh
        </button>
      </div>

      <ErrorDisplay message={error} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Pad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Aircraft
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Power
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Update
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No charging infrastructure available
                </td>
              </tr>
            ) : (
              sessions.map(session => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{session.pad_id}</td>
                  <td className="px-6 py-4 text-sm">
                    {session.aircraft_id || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {session.power_kw} kW
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(session.started_at).toLocaleString()}
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

export default Energy;
