import { useEffect, useState } from 'react';
import { slotsApi } from '../../api/slots';
import { Slot, SlotStatus } from '../../types/slot';
import normalizeArray from '../../utils/normalizeArray';

const getStatusColor = (status: SlotStatus) => {
  switch (status) {
    case SlotStatus.REQUESTED:
      return 'bg-green-100 text-green-800';
    case SlotStatus.CONFIRMED:
      return 'bg-blue-100 text-blue-800';
    case SlotStatus.ACTIVE:
      return 'bg-yellow-100 text-yellow-800';
    case SlotStatus.COMPLETED:
      return 'bg-gray-100 text-gray-800';
    case SlotStatus.CANCELLED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const Slots = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await slotsApi.getAll();
      const normalized = normalizeArray<Slot>(data);
      if (!Array.isArray(normalized) || normalized.length === 0) {
        setSlots([]);
        if (normalized.length === 0) {
          setError('No slots available');
        } else {
          setError('Invalid slots data format received from server');
        }
        return;
      }
      setSlots(normalized);
    } catch (err: unknown) {
      let message = 'Failed to load slots';
      if (err instanceof Error) message = err.message;
      setError(message);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading slots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Time Slots</h1>
        <button
          onClick={loadSlots}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Aircraft
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Pad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                End Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {!Array.isArray(slots) || slots.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No slots scheduled
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {slot.aircraft_id || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {slot.vertipad_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(slot.start_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(slot.end_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(slot.status)}`}
                    >
                      {slot.status}
                    </span>
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

export default Slots;
