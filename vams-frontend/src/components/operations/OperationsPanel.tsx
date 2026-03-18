interface AircraftRoute {
  aircraftId: string;
  route: string[];
  currentStep: number;
}

interface OperationsPanelProps {
  aircraftRoutes: AircraftRoute[];
}

const getStatus = (currentStep: number, routeLength: number) => {
  if (currentStep === 0) {
    return 'DEPARTING PAD';
  }
  if (currentStep > 0 && currentStep < routeLength - 1) {
    return 'TAXIING';
  }
  if (currentStep === routeLength - 1) {
    return 'ARRIVED';
  }
  return 'DEPARTING PAD';
};

const OperationsPanel = ({ aircraftRoutes }: OperationsPanelProps) => {

  return (
    <div className="bg-white shadow rounded-lg p-4 mt-6">
      <h2 className="text-lg font-bold mb-3 text-gray-900">Vertiport Operations</h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-700">
            <th className="text-left pb-2">Aircraft</th>
            <th className="text-left pb-2">Status</th>
            <th className="text-left pb-2">From</th>
            <th className="text-left pb-2">Current Node</th>
            <th className="text-left pb-2">Destination</th>
          </tr>
        </thead>
        <tbody>
          {aircraftRoutes.map((aircraft) => {
            const origin = aircraft.route[0] ?? 'N/A';
            const destination = aircraft.route[aircraft.route.length - 1] ?? 'N/A';
            const currentNode = aircraft.route[aircraft.currentStep] ?? destination;
            const status = getStatus(aircraft.currentStep, aircraft.route.length);

            return (
              <tr key={aircraft.aircraftId} className="border-t border-gray-100 text-gray-700">
                <td className="py-2 font-semibold">{aircraft.aircraftId}</td>
                <td className="py-2">{status}</td>
                <td className="py-2">{origin}</td>
                <td className="py-2">{currentNode}</td>
                <td className="py-2">{destination}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OperationsPanel;
