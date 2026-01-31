import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { slotsApi } from '../../api/slots';
import { Slot, SlotStatus } from '../../types/slots';

const getStatusColor = (status: SlotStatus) => {
  switch (status) {
    case SlotStatus.AVAILABLE:
      return 'bg-green-100 text-green-800';
    case SlotStatus.BOOKED:
      return 'bg-blue-100 text-blue-800';
    case SlotStatus.OCCUPIED:
      return 'bg-yellow-100 text-yellow-800';
    case SlotStatus.COMPLETED:
      return 'bg-gray-100 text-gray-800';
    case SlotStatus.CANCELLED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const SlotList = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await slotsApi.getAll();
      setSlots(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading slots...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Slot Scheduling</h1>
        <button
          onClick={() => navigate('/slots/create')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          + Create Slot
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                Start
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                End
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {slots.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No slots scheduled
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr
                  key={slot.id}
                  onClick={() => navigate(`/slots/${slot.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">{slot.pad_id}</td>
                  <td className="px-6 py-4">
                    {slot.aircraft_id || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(slot.start_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(slot.end_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(slot.status)}`}
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

export default SlotList;
