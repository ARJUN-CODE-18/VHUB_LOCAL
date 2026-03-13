import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { slotsApi } from '../../api/slots';
import { Slot, SlotStatus } from '../../types/slot';
import ErrorDisplay from '../common/ErrorDisplay';

const SlotDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSlot();
  }, [id]);

  const loadSlot = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await slotsApi.getById(id);
      setSlot(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load slot');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: SlotStatus) => {
    if (!id) return;
    setActionLoading(true);
    setError(null);

    try {
      switch (status) {
        case SlotStatus.CONFIRMED:
          await slotsApi.confirm(id);
          break;
        case SlotStatus.ACTIVE:
          await slotsApi.activate(id);
          break;
        case SlotStatus.COMPLETED:
          await slotsApi.complete(id);
          break;
        case SlotStatus.CANCELLED:
          await slotsApi.cancel(id);
          break;
        default:
          setError(`Unsupported transition to ${status}`);
          return;
      }
      await loadSlot();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update slot');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading slot...</div>;
  }

  if (!slot) {
    return <div className="text-center py-12 text-red-600">Slot not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/slots')}
        className="text-primary-600 hover:text-primary-800 font-medium"
      >
        ← Back to Slots
      </button>

      <ErrorDisplay message={error} />

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Slot Details</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Pad</p>
            <p className="text-lg">{slot.vertipad_id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Aircraft</p>
            <p className="text-lg">{slot.aircraft_id || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Start Time</p>
            <p className="text-lg">{new Date(slot.start_time).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End Time</p>
            <p className="text-lg">{new Date(slot.end_time).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-lg font-bold">{slot.status}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Update Status</h2>
        <div className="flex flex-wrap gap-3">
          {[SlotStatus.CONFIRMED, SlotStatus.ACTIVE, SlotStatus.COMPLETED, SlotStatus.CANCELLED].map((status) => (
            <button
              key={status}
              onClick={() => updateStatus(status)}
              disabled={actionLoading || slot.status === status}
              className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white"
            >
              → {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SlotDetail;
