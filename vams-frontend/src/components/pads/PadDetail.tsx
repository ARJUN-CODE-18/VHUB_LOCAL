import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { padsApi } from '../../api/pads';
import { Pad, PadStatus } from '../../types/pads';

const STATUS_ACTIONS: PadStatus[] = [
  PadStatus.AVAILABLE,
  PadStatus.RESERVED,
  PadStatus.MAINTENANCE,
  PadStatus.OFFLINE,
];

const PadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pad, setPad] = useState<Pad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [aircraftInput, setAircraftInput] = useState('');

  useEffect(() => {
    loadPad();
  }, [id]);

  const loadPad = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await padsApi.getById(id);
      setPad(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load pad');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: PadStatus) => {
    if (!id) return;
    setActionLoading(true);
    setError(null);

    try {
      await padsApi.updateStatus(id, status);
      await loadPad();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update pad status');
    } finally {
      setActionLoading(false);
    }
  };

  const assignAircraft = async () => {
    if (!id || !aircraftInput) return;
    setActionLoading(true);
    setError(null);

    try {
      await padsApi.assignAircraft(id, aircraftInput);
      setAircraftInput('');
      await loadPad();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign aircraft');
    } finally {
      setActionLoading(false);
    }
  };

  const releaseAircraft = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);

    try {
      await padsApi.releaseAircraft(id);
      await loadPad();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to release aircraft');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading pad details...
      </div>
    );
  }

  if (!pad) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Pad not found</p>
        <button
          onClick={() => navigate('/pads')}
          className="text-primary-600 hover:text-primary-800"
        >
          ← Back to Pads
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/pads')}
        className="text-primary-600 hover:text-primary-800 font-medium"
      >
        ← Back to Pads
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Pad Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pad {pad.pad_number}
            </h1>
            <p className="text-gray-500 mt-1">ID: {pad.id}</p>
          </div>
          <span className="px-4 py-2 rounded-lg font-bold bg-gray-100 text-gray-800">
            {pad.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Max Weight</h3>
            <p className="text-lg">{pad.max_weight_kg} kg</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Charging</h3>
            <p className="text-lg">{pad.has_charging ? '✅ Available' : '❌ No'}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Aircraft</h3>
            <p className="text-lg">
              {pad.aircraft_id || '— Not Occupied'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
            <p className="text-sm">
              {new Date(pad.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Status Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4">Pad Status</h2>
        <div className="flex flex-wrap gap-3">
          {STATUS_ACTIONS.map((status) => (
            <button
              key={status}
              onClick={() => updateStatus(status)}
              disabled={actionLoading || pad.status === status}
              className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white"
            >
              → {status}
            </button>
          ))}
        </div>
      </div>

      {/* Aircraft Assignment */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h2 className="text-xl font-bold">Aircraft Assignment</h2>

        {pad.aircraft_id ? (
          <button
            onClick={releaseAircraft}
            disabled={actionLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
          >
            Release Aircraft
          </button>
        ) : (
          <div className="flex gap-3">
            <input
              value={aircraftInput}
              onChange={(e) => setAircraftInput(e.target.value)}
              placeholder="Aircraft ID"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={assignAircraft}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
            >
              Assign
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PadDetail;
