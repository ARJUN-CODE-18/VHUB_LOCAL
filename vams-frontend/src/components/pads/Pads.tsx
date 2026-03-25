import { useEffect, useState } from 'react';
import { padsApi } from '../../api/pads';
import { emergencyApi } from '../../api/emergency';
import { WS_UPDATES_URL } from '../../config/runtime';
import { VertiportEventBus } from '../../controllers/VertiportEventBus';
import { getAircraftList, type AircraftStoreItem } from '../../state/aircraftStore';
import { Pad } from '../../types/pads';

interface LiveUpdatePayload {
  type: string;
  data?: Pad | {
    pads?: Pad[];
  };
  pads?: Pad[];
}

const Pads = () => {
  const [pads, setPads] = useState<Pad[]>([]);
  const [aircraftFromStore, setAircraftFromStore] = useState<AircraftStoreItem[]>(getAircraftList());
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAircraftFromStore = () => {
    setAircraftFromStore(getAircraftList());
  };

  const getPadOccupancy = (pad: Pad): string | null => {
    const direct = (pad as Pad & { current_aircraft_id?: string | null }).current_aircraft_id;
    if (direct != null) {
      return direct;
    }
    return pad.aircraft_id ?? null;
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialState = async () => {
      try {
        setLoading(true);
        setError(null);
        const padsData = await padsApi.getAll();
        if (!mounted) {
          return;
        }

        console.log('PADS API:', padsData);
        setPads(padsData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load pads');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialState();
  refreshAircraftFromStore();

  VertiportEventBus.on('aircraft_added', refreshAircraftFromStore);
  VertiportEventBus.on('aircraft_updated', refreshAircraftFromStore);
  VertiportEventBus.on('aircraft_removed', refreshAircraftFromStore);
  VertiportEventBus.on('aircraft_state_changed', refreshAircraftFromStore);

    const socket = new WebSocket(WS_UPDATES_URL);

    socket.onmessage = (event) => {
      console.log('WS EVENT:', event.data);
      try {
        const message = JSON.parse(event.data) as LiveUpdatePayload;
        if (message.type === 'UPDATE') {
          const nested = (message.data && typeof message.data === 'object' && 'pads' in message.data)
            ? (message.data as { pads?: Pad[] })
            : undefined;

          const nextPads = Array.isArray(message.pads)
            ? message.pads
            : nested?.pads;

          if (Array.isArray(nextPads)) {
            setPads(nextPads);
          }
          return;
        }

        if (message.type === 'PAD_UPDATED' && message.data && !Array.isArray(message.data)) {
          const nextPad = message.data as Pad;
          console.log('WS EVENT: PAD_UPDATED', nextPad.id, (nextPad as Pad & { current_aircraft_id?: string | null }).current_aircraft_id ?? nextPad.aircraft_id ?? null);
          setPads((prev) => {
            const exists = prev.some((item) => item.id === nextPad.id);
            if (!exists) {
              return [...prev, nextPad];
            }
            return prev.map((item) => (item.id === nextPad.id ? { ...item, ...nextPad } : item));
          });
          return;
        }
      } catch {
        // Ignore malformed websocket payloads.
      }
    };

    socket.onerror = () => {
      if (mounted) {
        setError('Live update connection lost. Retrying...');
      }
    };

    socket.onopen = () => {
      if (mounted) {
        setError(null);
      }
    };

    return () => {
      mounted = false;
      VertiportEventBus.off('aircraft_added', refreshAircraftFromStore);
      VertiportEventBus.off('aircraft_updated', refreshAircraftFromStore);
      VertiportEventBus.off('aircraft_removed', refreshAircraftFromStore);
      VertiportEventBus.off('aircraft_state_changed', refreshAircraftFromStore);
      socket.close();
    };
  }, []);

  const handlePadClick = (padId: string) => {
    setSelectedPadId(padId);
  };

  const declareEmergency = async (aircraftId: string, padId?: string) => {
    try {
      await emergencyApi.declareAircraft({
        aircraft_id: aircraftId,
        emergency_type: 'PRIORITY_REQUEST',
        description: 'Declared from pad queue view',
      });

      if (padId) {
        await padsApi.assignAircraft(padId, aircraftId, 'EMERGENCY');
      }
    } catch {
      setError('Failed to declare emergency');
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
        <span className="text-sm text-gray-500">Live updates enabled</span>
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
          pads.map((pad) => {
            const currentAircraftId = getPadOccupancy(pad);
            const isOccupied = currentAircraftId !== null;
            const aircraftOnPad = aircraftFromStore.find((ac) => ac.id === currentAircraftId)
              ?? aircraftFromStore.find((ac) => (ac.pad_id ?? ac.assigned_pad ?? null) === pad.id);
            const isCharging = (aircraftOnPad?.state ?? aircraftOnPad?.current_state ?? '').toUpperCase() === 'CHARGING';
            console.log('PAD RENDER:', pad.id, (pad as Pad & { current_aircraft_id?: string | null }).current_aircraft_id ?? pad.aircraft_id ?? null);

            return (
            <div
              key={pad.id}
              className={`rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 ${
                isCharging ? 'bg-yellow-100 border-yellow-300' : isOccupied ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300'
              }`}
              onClick={() => handlePadClick(pad.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Pad {pad.pad_number}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    isCharging ? 'CHARGING' : isOccupied ? 'OCCUPIED' : 'AVAILABLE'
                  )}`}
                >
                  {isCharging ? 'CHARGING' : isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
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

                {currentAircraftId && (
                  <div className="pt-3 border-t">
                    <span className="text-xs text-gray-500">Occupied by</span>
                    <p className="font-medium text-gray-900 text-sm">
                      {aircraftOnPad?.tail_number ?? currentAircraftId}
                    </p>
                  </div>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>

      {selectedPadId && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Aircraft on {selectedPadId}</h3>

          <div className="mb-5 rounded-md border border-gray-200 p-3 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-2">Queue</h4>
            {(pads.find((p) => p.id === selectedPadId)?.queue ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">No queued aircraft</p>
            ) : (
              <div className="space-y-1">
                {(pads.find((p) => p.id === selectedPadId)?.queue ?? []).map((aircraftId) => (
                  <div key={aircraftId.aircraft_id} className="text-sm text-gray-700 flex items-center justify-between gap-2">
                    <span>{aircraftId.aircraft_id} - {aircraftId.priority}</span>
                    <button
                      onClick={() => declareEmergency(aircraftId.aircraft_id, selectedPadId)}
                      className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Declare Emergency
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {aircraftFromStore.filter((ac) => (ac.pad_id ?? ac.assigned_pad ?? null) === selectedPadId).length === 0 ? (
            <p className="text-gray-500">No aircraft present</p>
          ) : (
            <div className="space-y-3">
              {aircraftFromStore
                .filter((ac) => (ac.pad_id ?? ac.assigned_pad ?? null) === selectedPadId)
                .map((ac) => (
                <div key={ac.id} className="border border-gray-200 rounded-md p-3">
                  <p className="font-semibold text-gray-900">{ac.tail_number ?? ac.id}</p>
                  <p className="text-sm text-gray-600">Status: {ac.state ?? ac.current_state}</p>
                  <p className="text-sm text-gray-600">
                    Battery: {ac.battery_level ?? ac.battery ?? 'N/A'}%
                  </p>
                  <button
                    onClick={() => declareEmergency(ac.id, selectedPadId)}
                    className="mt-2 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Declare Emergency
                  </button>
                </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Pads;
