interface AircraftRoute {
  aircraftId: string;
  route: string[];
  currentStep: number;
}

interface VertiportTwinProps {
  aircraftRoutes: AircraftRoute[];
}

const VertiportTwin = ({ aircraftRoutes }: VertiportTwinProps) => {
  function aircraftAt(node: string) {
    return aircraftRoutes.filter((a) => a.route[a.currentStep] === node);
  }

  const nodeClass = (node: string) =>
    `p-3 rounded text-center ${
      aircraftAt(node).length ? 'bg-green-200' : 'bg-gray-100'
    }`;

  const renderNode = (node: string) => (
    <div className={nodeClass(node)}>
      <div className="font-semibold">{node}</div>
      {aircraftAt(node).map((a) => (
        <div key={a.aircraftId}>✈ {a.aircraftId}</div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-4">
      <div />
      {renderNode('CHARGING')}
      <div />

      {renderNode('PAD-1')}
      {renderNode('TAXIWAY')}
      {renderNode('PAD-2')}

      <div />
      <div />
      <div />
    </div>
  );
};

export default VertiportTwin;
