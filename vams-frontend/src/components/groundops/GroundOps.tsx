import { useEffect, useState } from 'react';
import { padsApi } from '../../api/pads';
import { VertiportEventBus } from '../../controllers/VertiportEventBus';
import { getAircraftList } from '../../state/aircraftStore';
import { Pad, PadStatus } from '../../types/pads';
import ErrorDisplay from '../common/ErrorDisplay';

interface GroundOperation {
  id: string;
  operation_type: 'REFUEL' | 'CHARGING' | 'MAINTENANCE' | 'PARKED';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  aircraft_id?: string;
  pad_id?: string;
  started_at?: string;
}

const GroundOps = () => {
  const [operations, setOperations] = useState<GroundOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadGroundOps();

    const refresh = () => {
      void loadGroundOps();
    };

    VertiportEventBus.on('aircraft_added', refresh);
    VertiportEventBus.on('aircraft_updated', refresh);
    VertiportEventBus.on('aircraft_removed', refresh);
    VertiportEventBus.on('aircraft_state_changed', refresh);

    return () => {
      VertiportEventBus.off('aircraft_added', refresh);
      VertiportEventBus.off('aircraft_updated', refresh);
      VertiportEventBus.off('aircraft_removed', refresh);
      VertiportEventBus.off('aircraft_state_changed', refresh);
    };
  }, []);

  const loadGroundOps = async () => {
    try {
      setLoading(true);
      setError(null);

      const pads = await padsApi.getAll();
      const aircraftIds = new Set(getAircraftList().map((aircraft) => aircraft.id));

      const derivedOps: GroundOperation[] = [];

      // Defensive check: ensure pads is array before iterating
      const safePads = Array.isArray(pads) ? pads : [];
      safePads.forEach((pad: Pad) => {
        if (pad.status === PadStatus.CHARGING && pad.aircraft_id) {
          if (!aircraftIds.has(pad.aircraft_id)) {
            return;
          }

          derivedOps.push({
            id: `charge-${pad.id}`,
            operation_type: 'CHARGING',
            status: 'IN_PROGRESS',
            aircraft_id: pad.aircraft_id,
            pad_id: pad.id,
            started_at: pad.updated_at
          });
        }

        if (pad.status === PadStatus.MAINTENANCE) {
          derivedOps.push({
            id: `maint-${pad.id}`,
            operation_type: 'MAINTENANCE',
            status: 'IN_PROGRESS',
            pad_id: pad.id,
            started_at: pad.updated_at
          });
        }

        if (pad.status === PadStatus.OCCUPIED && pad.aircraft_id) {
          if (!aircraftIds.has(pad.aircraft_id)) {
            return;
          }

          derivedOps.push({
            id: `park-${pad.id}`,
            operation_type: 'PARKED',
            status: 'COMPLETED',
            aircraft_id: pad.aircraft_id,
            pad_id: pad.id,
            started_at: pad.updated_at
          });
        }
      });

      setOperations(derivedOps);
    } catch (err: any) {
      console.error('API error loading ground operations:', err);
      setError('Failed to load ground operations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CHARGING':
        return '⚡';
      case 'MAINTENANCE':
        return '🔧';
      case 'PARKED':
        return '🅿️';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading ground operations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Ground Operations</h1>
        <button
          onClick={loadGroundOps}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aircraft</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {operations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No active ground operations
                </td>
              </tr>
            ) : (
              operations.map(op => (
                <tr key={op.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="mr-2">{getTypeIcon(op.operation_type)}</span>
                    {op.operation_type}
                  </td>
                  <td className="px-6 py-4">{op.aircraft_id || '-'}</td>
                  <td className="px-6 py-4">{op.pad_id || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(op.status)}`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {op.started_at ? new Date(op.started_at).toLocaleString() : '-'}
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

export default GroundOps;
