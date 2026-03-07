import { useEffect, useState } from "react";
import { aircraftApi } from "../../api/aircraft";
import { padsApi } from "../../api/pads";

const ScheduleTaxiLanding = () => {
  const [aircraft, setAircraft] = useState<any[]>([]);
  const [pads, setPads] = useState<any[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedPad, setSelectedPad] = useState("");
  const [operation, setOperation] = useState("LANDING");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const aircraftList = await aircraftApi.getAll();
      const padList = await padsApi.getAll();

      setAircraft(aircraftList);
      setPads(padList);
    } catch (err) {
      console.error("Failed to load scheduling data", err);
    }
  };

  const scheduleOperation = async () => {
    if (!selectedAircraft || !selectedPad) {
      alert("Select aircraft and pad");
      return;
    }

    try {
      setLoading(true);

      await fetch("/operations/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aircraft_id: selectedAircraft,
          pad_id: selectedPad,
          operation_type: operation,
        }),
      });

      alert("Operation scheduled successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to schedule operation");
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
              {a.tail_number}
            </option>
          ))}
        </select>
      </div>

      {/* Pad */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Vertipad
        </label>
        <select
          value={selectedPad}
          onChange={(e) => setSelectedPad(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
        >
          <option value="">Select Pad</option>
          {pads.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
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
    </div>
  );
};

export default ScheduleTaxiLanding;