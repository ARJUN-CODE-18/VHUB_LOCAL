import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { padsApi } from '../../api/pads';
import { Pad, PadStatus } from '../../types/pads';
import ErrorDisplay from '../common/ErrorDisplay';

const PadList = () => {
  const [pads, setPads] = useState<Pad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPads();
  }, []);

  const loadPads = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await padsApi.getAll();
      setPads(data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Failed to load pads');
      } else {
        setError('Failed to load pads');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: PadStatus) => {
    switch (status) {
      case PadStatus.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case PadStatus.RESERVED:
        return 'bg-yellow-100 text-yellow-800';
      case PadStatus.OCCUPIED:
        return 'bg-red-100 text-red-800';
      case PadStatus.CHARGING:
        return 'bg-blue-100 text-blue-800';
      case PadStatus.MAINTENANCE:
        return 'bg-gray-100 text-gray-800';
      case PadStatus.OFFLINE:
        return 'bg-black text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Vertipads</h1>
        <button
          onClick={loadPads}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          🔄 Refresh
        </button>
      </div>

      <ErrorDisplay message={error} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pads.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No pads available
          </div>
        ) : (
          pads.map((pad) => (
            <div
              key={pad.id}
              onClick={() => navigate(`/pads/${pad.id}`)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900">{pad.pad_number}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(pad.status)}`}
                >
                  {pad.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Max Weight: {pad.max_weight_kg} kg</p>
                <p>Charging: {pad.has_charging ? '✅ Yes' : '❌ No'}</p>
                {pad.aircraft_id && <p>Occupied by Aircraft: {pad.aircraft_id}</p>}
                <p>Created: {new Date(pad.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(pad.updated_at).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PadList;
