import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { aircraftApi } from '../../api/aircraft';
import { Aircraft, AircraftState } from '../../types/aircraft';
import ErrorDisplay from '../common/ErrorDisplay';

// Define valid state transitions
const VALID_TRANSITIONS: Record<AircraftState, AircraftState[]> = {
  [AircraftState.REGISTERED]: [AircraftState.EN_ROUTE_INBOUND, AircraftState.DEREGISTERED],
  [AircraftState.EN_ROUTE_INBOUND]: [AircraftState.APPROACH],
  [AircraftState.APPROACH]: [AircraftState.FINAL_APPROACH, AircraftState.EN_ROUTE_INBOUND],
  [AircraftState.FINAL_APPROACH]: [AircraftState.LANDING, AircraftState.APPROACH],
  [AircraftState.LANDING]: [AircraftState.LANDED],
  [AircraftState.LANDED]: [AircraftState.TAXIING, AircraftState.MAINTENANCE],
  [AircraftState.TAXIING]: [AircraftState.PARKED],
  [AircraftState.PARKED]: [AircraftState.CHARGING, AircraftState.MAINTENANCE, AircraftState.PRE_DEPARTURE],
  [AircraftState.CHARGING]: [AircraftState.PARKED],
  [AircraftState.MAINTENANCE]: [AircraftState.PARKED],
  [AircraftState.PRE_DEPARTURE]: [AircraftState.TAKEOFF_READY],
  [AircraftState.TAKEOFF_READY]: [AircraftState.DEPARTING, AircraftState.PARKED],
  [AircraftState.DEPARTING]: [AircraftState.DEPARTED],
  [AircraftState.DEPARTED]: [AircraftState.DEREGISTERED],
  [AircraftState.EMERGENCY]: [AircraftState.MAINTENANCE],
  [AircraftState.DEREGISTERED]: [],
};

const AircraftDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [batteryInput, setBatteryInput] = useState('');

  // Load aircraft on mount or when id changes
  useEffect(() => {
    loadAircraft();
  }, [id]);

  const loadAircraft = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await aircraftApi.getById(id);
      setAircraft(data);
      setBatteryInput(data.battery_level?.toString() ?? '');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Failed to load aircraft');
      } else {
        setError('Failed to load aircraft');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (targetState: AircraftState) => {
    if (!id) return;
    setActionLoading(true);
    setError(null);

    try {
      await aircraftApi.transition(id, { target_state: targetState });
      await loadAircraft();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Transition failed');
      } else {
        setError('Transition failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBattery = async () => {
    if (!id) return;
    const level = parseFloat(batteryInput);
    if (isNaN(level) || level < 0 || level > 100) {
      setError('Battery level must be between 0 and 100');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      await aircraftApi.updateBattery(id, level);
      await loadAircraft();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Failed to update battery');
      } else {
        setError('Failed to update battery');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading aircraft details...</div>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Aircraft not found</p>
        <button
          onClick={() => navigate('/aircraft')}
          className="text-primary-600 hover:text-primary-800"
        >
          ← Back to Aircraft List
        </button>
      </div>
    );
  }

  const validNextStates = VALID_TRANSITIONS[aircraft.state] || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/aircraft')}
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          ← Back to Aircraft List
        </button>
      </div>

      <ErrorDisplay message={error} />

      {/* Aircraft Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{aircraft.tail_number}</h1>
            <p className="text-gray-500 mt-1">{aircraft.aircraft_type}</p>
          </div>
          {aircraft.is_emergency && (
            <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
              🚨 EMERGENCY
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Operator</h3>
            <p className="text-lg text-gray-900">{aircraft.operator}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Current State</h3>
            <p className="text-lg font-bold text-primary-600">{aircraft.state}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Battery Level</h3>
            <p className="text-lg text-gray-900">{aircraft.battery_level ?? 'N/A'}%</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Weight</h3>
            <p className="text-lg text-gray-900">{aircraft.weight_kg ?? 'N/A'} kg</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Max Range</h3>
            <p className="text-lg text-gray-900">{aircraft.max_range_km ?? 'N/A'} km</p>
          </div>
          {aircraft.position && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Position</h3>
              <p className="text-sm text-gray-900">
                {aircraft.position.latitude.toFixed(6)}, {aircraft.position.longitude.toFixed(6)}
              </p>
              <p className="text-xs text-gray-500">Alt: {aircraft.position.altitude}m</p>
            </div>
          )}
        </div>
      </div>

      {/* State Transitions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">State Transitions</h2>
        {validNextStates.length === 0 ? (
          <p className="text-gray-500">No valid transitions from current state</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {validNextStates.map((state) => (
              <button
                key={state}
                onClick={() => handleTransition(state)}
                disabled={actionLoading}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                → {state}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Battery Update */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Update Battery</h2>
        <div className="flex gap-3">
          <input
            type="number"
            min="0"
            max="100"
            value={batteryInput}
            onChange={(e) => setBatteryInput(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Battery level (0-100)"
          />
          <button
            onClick={handleUpdateBattery}
            disabled={actionLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Update
          </button>
        </div>
      </div>

      {/* Emergency */}
      {aircraft.state !== AircraftState.EMERGENCY && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Actions</h2>
          <button
            onClick={() => handleTransition(AircraftState.EMERGENCY)}
            disabled={actionLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            🚨 Declare Emergency
          </button>
        </div>
      )}
    </div>
  );
};

export default AircraftDetail;
