import { useEffect, useState } from 'react';
import { padsApi } from '../../api/pads';
import { Pad } from '../../types/pads';

const Pads = () => {
  const [pads, setPads] = useState<Pad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPads();
  }, []);

  const loadPads = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await padsApi.getAll();
      setPads(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load pads');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'OCCUPIED':
        return 'bg-blue-100 text-blue-800';
      case 'CHARGING':
        return 'bg-yellow-100 text-yellow-800';
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800';
      case 'OFFLINE':
        return 'bg-gray-100 text-gray-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Landing Pads</h1>
        <button
          onClick={loadPads}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pads.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No pads available
          </div>
        ) : (
          pads.map((pad) => (
            <div
              key={pad.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Pad {pad.pad_number}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    pad.status
                  )}`}
                >
                  {pad.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Max Weight</span>
                  <span className="font-medium text-gray-900">
                    {pad.max_weight_kg} kg
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Charging</span>
                  <span className="font-medium text-gray-900">
                    {pad.has_charging ? '✓ Available' : '✗ Not Available'}
                  </span>
                </div>

                {pad.aircraft_id && (
                  <div className="pt-3 border-t">
                    <span className="text-xs text-gray-500">Occupied by</span>
                    <p className="font-medium text-gray-900 text-sm">
                      {pad.aircraft_id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Pads;
