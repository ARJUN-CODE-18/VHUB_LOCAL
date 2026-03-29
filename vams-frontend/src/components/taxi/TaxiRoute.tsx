type TaxiRouteProps = {
  route: string[];
  aircraftRoutes: AircraftRoute[];
};

interface AircraftRoute {
  aircraftId: string;
  route: string[];
  currentStep: number;
}

const TaxiRoute = ({ route, aircraftRoutes }: TaxiRouteProps) => {
  const hasRoute = route.length > 0;

  if (!hasRoute || !aircraftRoutes.length) {
    return <p className="text-sm text-gray-500">No taxi route available</p>;
  }

  const aircraftAtNode = (node: string) =>
    aircraftRoutes.filter((aircraft) => aircraft.route[aircraft.currentStep] === node);

  const nodeClass = (name: string) =>
    `min-h-14 min-w-24 px-2 py-1 rounded border text-xs font-semibold ${
      aircraftAtNode(name).length
        ? 'bg-green-500 text-white border-green-500'
        : 'bg-gray-200 text-gray-700 border-gray-300'
    }`;

  const renderNode = (name: string) => (
    <div className={nodeClass(name)}>
      <div>{name}</div>
      {aircraftAtNode(name).map((aircraft) => (
        <div key={aircraft.aircraftId} className="text-[10px] leading-tight">
          🚁 {aircraft.aircraftId}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mx-auto w-64 grid grid-cols-3 grid-rows-3 items-center justify-items-center">
        <div />
        {renderNode('CHARGING')}
        <div />

        <div />
        <div className="h-6 w-px bg-gray-300" />
        <div />

        <div className="flex items-center gap-1">
          {renderNode('PAD-1')}
          <div className="h-px w-5 bg-gray-300" />
        </div>
        {renderNode('TAXIWAY')}
        <div className="flex items-center gap-1">
          <div className="h-px w-5 bg-gray-300" />
          {renderNode('PAD-2')}
        </div>
      </div>

      <div className="flex gap-4 mt-4 text-sm justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span>Active Drone Route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded" />
          <span>Idle Pad</span>
        </div>
      </div>
    </div>
  );
};

export default TaxiRoute;
