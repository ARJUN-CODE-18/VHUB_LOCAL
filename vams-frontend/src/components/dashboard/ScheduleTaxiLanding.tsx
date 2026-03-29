import { useEffect, useState } from "react";
import { aircraftApi } from "../../api/aircraft";
import { operationsApi, OperationType } from "../../api/operations";
import { padsApi } from "../../api/pads";
import { VertiportEventBus } from "../../controllers/VertiportEventBus";
import { getAircraftList } from "../../state/aircraftStore";
import { setAircraftList } from "../../state/aircraftStore";
import { Pad } from "../../types/pads";

type SchedulerAircraft = {
  id: string;
  tail_number?: string;
};

function toSchedulingDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  // Accept HTML datetime-local format and serialize without timezone conversion.
  const htmlLocalMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (htmlLocalMatch) {
    const [, datePart, timePart, seconds] = htmlLocalMatch;
    return `${datePart}T${timePart}:${seconds ?? '00'}`;
  }

  // Accept manual dd-mm-yyyy hh:mm and normalize.
  const legacyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
  if (legacyMatch) {
    const [, dd, mm, yyyy, hh, min] = legacyMatch;
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
  }

  throw new Error("Invalid datetime format. Use YYYY-MM-DDTHH:MM:SS");
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const candidate = err as {
      response?: { data?: { detail?: string } };
      message?: string;
    };

    if (candidate.response?.data?.detail) {
      return candidate.response.data.detail;
    }

    if (candidate.message) {
      return candidate.message;
    }
  }

  return "Failed to schedule operation";
}

const ScheduleTaxiLanding = () => {
  const [aircraft, setAircraft] = useState<SchedulerAircraft[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedPad, setSelectedPad] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [operation, setOperation] = useState<OperationType>("LANDING");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadData();

    const refreshAircraft = () => {
      setAircraft(getAircraftList());
    };

    VertiportEventBus.on("aircraft_added", refreshAircraft);
    VertiportEventBus.on("aircraft_updated", refreshAircraft);
    VertiportEventBus.on("aircraft_removed", refreshAircraft);
    VertiportEventBus.on("aircraft_state_changed", refreshAircraft);

    return () => {
      VertiportEventBus.off("aircraft_added", refreshAircraft);
      VertiportEventBus.off("aircraft_updated", refreshAircraft);
      VertiportEventBus.off("aircraft_removed", refreshAircraft);
      VertiportEventBus.off("aircraft_state_changed", refreshAircraft);
    };
  }, []);

  const loadData = async () => {
    try {
      const aircraftList = getAircraftList();
      const padList = await padsApi.getAll();

      setAircraft(aircraftList);
      setPads(padList);
    } catch (err) {
      console.error("Failed to load scheduling data", err);
    }
  };

  const scheduleOperation = async () => {
    if (!selectedAircraft) {
      setMessage("Select aircraft");
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const payload: Parameters<typeof operationsApi.schedule>[0] = {
        aircraft_id: selectedAircraft,
        operation_type: operation,
        priority: 'NORMAL',
      };

      if (selectedPad) {
        payload.pad_id = selectedPad;
      }
      if (scheduledTime) {
        const formattedTime = toSchedulingDateTime(scheduledTime);
        payload.scheduled_time = formattedTime;
        console.log("SCHEDULING: Input time:", scheduledTime, "-> Formatted:", formattedTime);
      }

      console.log("SCHEDULING_PAYLOAD:", JSON.stringify(payload, null, 2));

      const response = await operationsApi.schedule(payload);

      // Sync simulation milestones to backend authoritative occupancy.
      if (operation === "LANDING") {
        const landedPadId = response.slot?.vertipad_id ?? selectedPad;
        if (landedPadId) {
          console.log("PATCH position", response.aircraft.id, landedPadId);
          await aircraftApi.updatePosition(response.aircraft.id, {
            pad_id: landedPadId,
          });
        }
      }

      if (operation === "TAXI") {
        console.log("PATCH position", response.aircraft.id, null);
        await aircraftApi.updatePosition(response.aircraft.id, {
          pad_id: null,
        });
      }

      const latestAircraft = await aircraftApi.getAll();
      setAircraftList(latestAircraft);
      VertiportEventBus.emit("aircraft_updated", getAircraftList());
      await loadData();

      if (response.status === 'QUEUED') {
        setMessage(`Queued on ${response.queued_pad_id} at position ${response.queue_position}`);
      } else if (response.status === 'OVERRIDDEN') {
        setMessage(`Critical override executed for ${response.operation_type}.`);
      } else {
        setMessage(`${response.operation_type} scheduled on ${response.slot?.vertipad_id ?? 'N/A'}`);
      }
    } catch (err) {
      console.error("SCHEDULING_ERROR:", err);
      const errorMessage = getErrorMessage(err);
      console.error("SCHEDULING_ERROR_DETAIL:", errorMessage);
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">
        Taxi & Landing Scheduling
      </h2>

      {/* Aircraft */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Aircraft
        </label>
        <select
          value={selectedAircraft}
          onChange={(e) => setSelectedAircraft(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
        >
          <option value="">Select Aircraft</option>
          {aircraft.map((a) => (
            <option key={a.id} value={a.id}>
              {a.tail_number ?? a.id}
            </option>
          ))}
        </select>
      </div>

      {/* Pad */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Vertipad (Optional)
        </label>
        <select
          value={selectedPad}
          onChange={(e) => setSelectedPad(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
        >
          <option value="">Auto-assign available pad</option>
          {pads.map((p) => (
            <option key={p.id} value={p.id}>
              {p.pad_number}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Scheduled Time (Optional)
        </label>
        <input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
        />
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value as OperationType)}
          className="mt-1 w-full border rounded-lg p-2"
        >
          <option value="LANDING">Landing</option>
          <option value="TAXI">Taxi</option>
        </select>
      </div>

      {/* Button */}
      <button
        onClick={scheduleOperation}
        disabled={loading}
        className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
      >
        {loading ? "Scheduling..." : "Schedule Operation"}
      </button>

      {message && (
        <p className="text-sm text-gray-700">{message}</p>
      )}
    </div>
  );
};

export default ScheduleTaxiLanding;