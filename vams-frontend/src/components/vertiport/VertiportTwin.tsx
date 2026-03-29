import { useEffect, useMemo, useRef, useState } from 'react';
import { VertiportEventBus } from '../../controllers/VertiportEventBus';
import { getAircraftList, type AircraftStoreItem } from '../../state/aircraftStore';
import { edges, nodes, normalizeNodeId } from '../../config/vertiportLayout';
import droneMarker from '../../assets/drone-marker.svg';

interface AircraftRoute {
  aircraftId: string;
  route: string[];
  currentStep: number;
}

interface VertiportTwinProps {
  aircraftRoutes: AircraftRoute[];
  selectedAircraft: AircraftStoreItem | undefined;
  onSelectAircraft: (aircraft: AircraftStoreItem | undefined) => void;
}

const SVG_WIDTH = 500;
const SVG_HEIGHT = 500;
const TWIN_METERS_PER_UNIT = 1.35;

type TwinPosition = {
  id: string;
  currentNode: string;
  nextNode?: string;
  progress: number;
};

type DroneTelemetry = {
  id: string;
  x: number;
  y: number;
  targetNode?: string;
  distanceToTargetM?: number;
  isNearPad: boolean;
};

const RENDER_STATES = new Set(['TAXIING', 'IN_AIR', 'AT_PAD', 'CHARGING']);
const PAD_BOUND_STATES = new Set(['AT_PAD', 'CHARGING', 'PARKED', 'LANDED']);

const VertiportTwin = ({ aircraftRoutes: _aircraftRoutes, selectedAircraft, onSelectAircraft }: VertiportTwinProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [aircraftState, setAircraftState] = useState<AircraftStoreItem[]>(getAircraftList());
  const [selectedNodeAircraft, setSelectedNodeAircraft] = useState<AircraftStoreItem[]>([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  // Update aircraft state from store
  const updateAircraftState = () => {
    setAircraftState(getAircraftList());
  };

  useEffect(() => {
    updateAircraftState();
    VertiportEventBus.on('aircraft_added', updateAircraftState);
    VertiportEventBus.on('aircraft_updated', updateAircraftState);
    VertiportEventBus.on('aircraft_removed', updateAircraftState);
    VertiportEventBus.on('aircraft_state_changed', updateAircraftState);

    return () => {
      VertiportEventBus.off('aircraft_added', updateAircraftState);
      VertiportEventBus.off('aircraft_updated', updateAircraftState);
      VertiportEventBus.off('aircraft_removed', updateAircraftState);
      VertiportEventBus.off('aircraft_state_changed', updateAircraftState);
    };
  }, []);

  function getAircraftById(id: string): AircraftStoreItem | undefined {
    return aircraftState.find((aircraft) => aircraft.id === id);
  }

  function toTwinPadNode(padId?: string | null): string | null {
    if (!padId) {
      return null;
    }

    const normalized = padId.toUpperCase();
    if (normalized.startsWith('PAD_')) {
      return normalized;
    }
    if (normalized.startsWith('PAD-')) {
      return normalized.replace('PAD-', 'PAD_');
    }

    const match = normalized.match(/^VP-(\d+)$/);
    if (match?.[1]) {
      const suffix = Number(match[1]);
      if (!Number.isNaN(suffix)) {
        return `PAD_${suffix}`;
      }
    }

    return null;
  }

  function getAircraftStatusColor(state?: string): string {
    const normalized = state?.toUpperCase();
    if (normalized === 'EMERGENCY') return '#ef4444';
    if (normalized === 'CHARGING') return '#22c55e';
    if (normalized === 'TAXIING') return '#eab308';
    return '#3b82f6';
  }

  function normalizeAircraftState(state?: string): string {
    return (state ?? '').toUpperCase();
  }

  function getDistanceMeters(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * TWIN_METERS_PER_UNIT);
  }

  const renderableAircraft = useMemo(() => {
    return aircraftState.filter((aircraft) => {
      const state = normalizeAircraftState(aircraft.state ?? aircraft.current_state);
      const hasMotionPosition = Boolean(aircraft.position?.currentNode);
      const hasPadAssignment = Boolean(aircraft.pad_id ?? aircraft.assigned_pad);

      return RENDER_STATES.has(state) || hasMotionPosition || hasPadAssignment;
    });
  }, [aircraftState]);

  useEffect(() => {
    renderableAircraft.forEach((aircraft) => {
      console.log(
        'DT AIRCRAFT:',
        aircraft.id,
        aircraft.state ?? aircraft.current_state ?? 'UNKNOWN',
        aircraft.pad_id ?? aircraft.assigned_pad ?? null,
      );
    });
  }, [renderableAircraft]);

  // Calculate positions for aircraft
  const aircraftPositions = useMemo(() => {
    const nextPositions: TwinPosition[] = [];

    renderableAircraft.forEach((ac) => {
      const state = normalizeAircraftState(ac.state ?? ac.current_state);
      const nodeFromPad = toTwinPadNode(ac.pad_id ?? ac.assigned_pad ?? null);

      // For pad-bound states, backend pad assignment is source of truth.
      if (nodeFromPad && PAD_BOUND_STATES.has(state)) {
        nextPositions.push({
          id: ac.id,
          currentNode: normalizeNodeId(nodeFromPad),
          progress: 0,
        });
        return;
      }

      if (ac.position?.currentNode) {
        nextPositions.push({
          id: ac.id,
          currentNode: normalizeNodeId(ac.position.currentNode),
          ...(ac.position?.nextNode ? { nextNode: normalizeNodeId(ac.position.nextNode) } : {}),
          progress: ac.position?.progress ?? 0,
        });
        return;
      }

      if (!nodeFromPad) {
        return;
      }

      nextPositions.push({
        id: ac.id,
        currentNode: normalizeNodeId(nodeFromPad),
        progress: 0,
      });
    });

    return nextPositions;
  }, [renderableAircraft]);

  // Get aircraft on each node
  const aircraftAtNodes = useMemo(() => {
    const grouped: Record<string, AircraftStoreItem[]> = {};
    aircraftPositions.forEach((entry) => {
      const isStationary = !entry.nextNode || entry.progress < 0.05 || entry.progress > 0.95;
      if (!isStationary) return;

      const aircraft = getAircraftById(entry.id);
      if (!aircraft || !entry.currentNode) return;

      if (!grouped[entry.currentNode]) {
        grouped[entry.currentNode] = [];
      }
      grouped[entry.currentNode]!.push(aircraft);
    });
    return grouped;
  }, [aircraftPositions]);

  const droneTelemetry = useMemo(() => {
    const telemetry: DroneTelemetry[] = [];

    aircraftPositions.forEach((entry) => {
      const from = nodes[entry.currentNode];
      const to = entry.nextNode ? nodes[entry.nextNode] : null;
      if (!from) {
        return;
      }

      const x = to ? from.x + (to.x - from.x) * entry.progress : from.x;
      const y = to ? from.y + (to.y - from.y) * entry.progress : from.y + 20;

      const ac = getAircraftById(entry.id);
      const assignedNode = toTwinPadNode(ac?.pad_id ?? ac?.assigned_pad ?? null);
      const targetNode = assignedNode && nodes[assignedNode] ? assignedNode : undefined;

      let distanceToTargetM: number | undefined;
      let isNearPad = false;

      if (targetNode) {
        const target = nodes[targetNode];
        distanceToTargetM = getDistanceMeters(x, y, target.x, target.y);
        isNearPad = distanceToTargetM <= 35;
      }

      telemetry.push({
        id: entry.id,
        x,
        y,
        targetNode,
        distanceToTargetM,
        isNearPad,
      });
    });

    return telemetry;
  }, [aircraftPositions, aircraftState]);

  // Render taxiway paths
  const renderTaxiways = () => {
    return edges.map(([fromNode, toNode]) => {
      const from = nodes[fromNode];
      const to = nodes[toNode];
      if (!from || !to) return null;

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const pathData = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

      return (
        <g key={`taxiway-${fromNode}-${toNode}`}>
          {/* Dark shadow layer */}
          <path d={pathData} stroke="#1e293b" strokeWidth="24" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Main taxiway surface */}
          <path d={pathData} stroke="#475569" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Yellow centerline */}
          <path d={pathData} stroke="#fbbf24" strokeWidth="2" strokeDasharray="8,6" fill="none" strokeLinecap="round" />
        </g>
      );
    });
  };

  // Render pads
  const renderPads = () => {
    return Object.entries(nodes)
      .filter(([_, node]) => node.type === 'PAD')
      .map(([nodeId, node]) => {
        const hasAircraft = (aircraftAtNodes[nodeId] || []).length > 0;
        return (
          <g key={`pad-${nodeId}`} onClick={() => {
            const allAircraft = aircraftAtNodes[nodeId] || [];
            if (allAircraft.length > 0) {
              setSelectedNodeKey(nodeId);
              setSelectedNodeAircraft(allAircraft);
              onSelectAircraft(allAircraft[0]);
            }
          }}>
            <circle
              cx={node.x}
              cy={node.y}
              r="24"
              fill={hasAircraft ? '#3b82f6' : '#0ea5e9'}
              stroke="white"
              strokeWidth="2"
              filter={hasAircraft ? 'drop-shadow(0 0 6px rgba(59,130,246,0.6))' : undefined}
              style={{ cursor: 'pointer', transition: 'all 200ms' }}
            />
            <line x1={node.x - 8} y1={node.y} x2={node.x + 8} y2={node.y} stroke="white" strokeWidth="1.5" opacity="0.7" />
            <line x1={node.x} y1={node.y - 8} x2={node.x} y2={node.y + 8} stroke="white" strokeWidth="1.5" opacity="0.7" />
            <text x={node.x} y={node.y + 40} textAnchor="middle" fontSize="11" fill="#cbd5e1" fontWeight="bold" pointerEvents="none">
              {node.label}
            </text>
          </g>
        );
      });
  };

  // Render charging station
  const renderCharging = () => {
    return Object.entries(nodes)
      .filter(([_, node]) => node.type === 'CHARGING')
      .map(([nodeId, node]) => {
        const hasAircraft = (aircraftAtNodes[nodeId] || []).length > 0;
        return (
          <g key={`charging-${nodeId}`} onClick={() => {
            const allAircraft = aircraftAtNodes[nodeId] || [];
            if (allAircraft.length > 0) {
              setSelectedNodeKey(nodeId);
              setSelectedNodeAircraft(allAircraft);
              onSelectAircraft(allAircraft[0]);
            }
          }}>
            <rect
              x={node.x - 20}
              y={node.y - 20}
              width="40"
              height="40"
              fill={hasAircraft ? '#22c55e' : '#10b981'}
              stroke="white"
              strokeWidth="2"
              rx="6"
              filter={hasAircraft ? 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' : undefined}
              style={{ cursor: 'pointer', transition: 'all 200ms' }}
            />
            <text x={node.x} y={node.y + 2} textAnchor="middle" dominantBaseline="central" fontSize="16" fill="white" fontWeight="bold" pointerEvents="none">
              ⚡
            </text>
            <text x={node.x} y={node.y + 40} textAnchor="middle" fontSize="11" fill="#cbd5e1" fontWeight="bold" pointerEvents="none">
              {node.label}
            </text>
          </g>
        );
      });
  };

  // Render aircraft in motion
  const renderMovingAircraft = () => {
    return aircraftPositions
      .filter((entry) => entry.nextNode && entry.progress >= 0.05 && entry.progress <= 0.95)
      .map((entry) => {
        if (!entry.currentNode) return null;
        const from = nodes[entry.currentNode];
        const to = entry.nextNode ? nodes[entry.nextNode] : null;
        if (!from || !to) return null;

        const x = from.x + (to.x - from.x) * entry.progress;
        const y = from.y + (to.y - from.y) * entry.progress;
        const ac = getAircraftById(entry.id);
        const color = getAircraftStatusColor(ac?.state);
        const telemetry = droneTelemetry.find((item) => item.id === entry.id);

        return (
          <g key={`moving-${entry.id}`} transform={`translate(${x},${y})`}>
            <circle cx="0" cy="0" r="13" fill={color} opacity="0.2" />
            <image href={droneMarker} x="-11" y="-11" width="22" height="22" opacity="0.98" />
            {telemetry?.distanceToTargetM != null && (
              <text x="0" y="-16" textAnchor="middle" fontSize="9" fill={telemetry.isNearPad ? '#22c55e' : '#fbbf24'} fontWeight="700">
                {telemetry.distanceToTargetM}m
              </text>
            )}
          </g>
        );
      });
  };

  // Render stationary aircraft
  const renderStationaryAircraft = () => {
    return aircraftPositions
      .filter((entry) => !entry.nextNode || entry.progress < 0.05 || entry.progress > 0.95)
      .map((entry) => {
        if (!entry.currentNode) return null;
        const node = nodes[entry.currentNode];
        if (!node) return null;

        const ac = getAircraftById(entry.id);
        const color = getAircraftStatusColor(ac?.state);
        const telemetry = droneTelemetry.find((item) => item.id === entry.id);

        return (
          <g key={`stationary-${entry.id}`} transform={`translate(${node.x},${node.y + 20})`} onClick={() => onSelectAircraft(ac)}>
            <circle cx="0" cy="0" r="13" fill={color} opacity="0.2" />
            <image href={droneMarker} x="-11" y="-11" width="22" height="22" opacity="0.98" style={{ cursor: 'pointer' }} />
            {telemetry?.distanceToTargetM != null && (
              <text x="0" y="-16" textAnchor="middle" fontSize="9" fill={telemetry.isNearPad ? '#22c55e' : '#fbbf24'} fontWeight="700" pointerEvents="none">
                {telemetry.distanceToTargetM}m
              </text>
            )}
          </g>
        );
      });
  };

  const renderMovementTrails = () => {
    return droneTelemetry
      .filter((telemetry) => telemetry.targetNode)
      .map((telemetry) => {
        const target = telemetry.targetNode ? nodes[telemetry.targetNode] : null;
        if (!target) {
          return null;
        }

        return (
          <g key={`trail-${telemetry.id}`}>
            <line
              x1={telemetry.x}
              y1={telemetry.y}
              x2={target.x}
              y2={target.y}
              stroke={telemetry.isNearPad ? '#22c55e' : '#fbbf24'}
              strokeWidth="2"
              strokeDasharray={telemetry.isNearPad ? '4 4' : '8 6'}
              opacity="0.9"
            />
            <circle cx={target.x} cy={target.y} r="4" fill={telemetry.isNearPad ? '#22c55e' : '#fbbf24'} opacity="0.8" />
          </g>
        );
      });
  };

  return (
    <div className="w-full h-[440px] flex items-center justify-center gap-4 overflow-hidden">
      {/* SVG Digital Twin - Responsive Constrained Container */}
      <div className="w-[75%] sm:w-[65%] md:w-[55%] max-w-[400px] aspect-square rounded-lg border border-slate-300 bg-slate-900 overflow-hidden shadow-lg flex items-center justify-center">
        <svg 
          ref={svgRef} 
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
          className="w-full h-full" 
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
        >
          {/* Definitions */}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#0f172a" />

          {/* Grid (optional subtle background) */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#grid)" />

          {/* Scaled Layout Container */}
          <g transform="translate(37, 37) scale(0.85)">
            {/* Taxiways */}
            <g id="taxiways">{renderTaxiways()}</g>

            {/* Drone movement pathways to reach points */}
            <g id="movement-trails">{renderMovementTrails()}</g>

            {/* Infrastructure */}
            <g id="pads">{renderPads()}</g>
            <g id="charging">{renderCharging()}</g>

            {/* Aircraft */}
            <g id="moving-aircraft" opacity="0.9">{renderMovingAircraft()}</g>
            <g id="stationary-aircraft" opacity="0.9">{renderStationaryAircraft()}</g>
          </g>
        </svg>
      </div>

      {/* Aircraft Info Panel */}
      <div className="w-72 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {selectedAircraft ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">Drone Details</h3>
              <button onClick={() => onSelectAircraft(undefined)} className="hover:bg-blue-500 p-1 rounded">
                ✕
              </button>

                    {/* Multi-Aircraft Selector */}
                    {selectedNodeAircraft.length > 1 && (
                      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-blue-700">{selectedNodeAircraft.length} aircraft at {selectedNodeKey}</span>
                        <div className="flex gap-1">
                          <button onClick={() => { const idx = selectedNodeAircraft.findIndex(ac => ac.id === selectedAircraft.id); onSelectAircraft(selectedNodeAircraft[(idx - 1 + selectedNodeAircraft.length) % selectedNodeAircraft.length]); }} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded">◀</button>
                          <button onClick={() => { const idx = selectedNodeAircraft.findIndex(ac => ac.id === selectedAircraft.id); onSelectAircraft(selectedNodeAircraft[(idx + 1) % selectedNodeAircraft.length]); }} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded">▶</button>
                        </div>
                      </div>
                    )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Callsign */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Callsign</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{selectedAircraft.callsign || selectedAircraft.tail_number || '—'}</p>
              </div>

              {/* Status Badge */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
                <div className="inline-block">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                    style={{
                      backgroundColor:
                        selectedAircraft.state === 'emergency'
                          ? '#fee2e2'
                          : selectedAircraft.state === 'charging'
                            ? '#dcfce7'
                            : selectedAircraft.state?.toUpperCase() === 'TAXIING'
                              ? '#fef3c7'
                              : '#dbeafe',
                      color:
                        selectedAircraft.state === 'emergency'
                          ? '#991b1b'
                          : selectedAircraft.state === 'charging'
                            ? '#166534'
                            : selectedAircraft.state?.toUpperCase() === 'TAXIING'
                              ? '#92400e'
                              : '#1e40af',
                    }}
                  >
                    {selectedAircraft.state || 'idle'}
                  </span>
                </div>
              </div>

              {/* Battery */}
              {selectedAircraft.battery_level != null && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Battery Level</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all" style={{ width: `${selectedAircraft.battery_level}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-12 text-right">{selectedAircraft.battery_level.toFixed(0)}%</span>
                  </div>
                </div>
              )}

              {/* Weight */}
              {selectedAircraft.weight != null && (
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Weight</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{selectedAircraft.weight} kg</p>
                </div>
              )}

              {/* Max Range */}
              {selectedAircraft.maxRange != null && (
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Max Range</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{selectedAircraft.maxRange} km</p>
                </div>
              )}

              {/* Position */}
              {selectedAircraft.position?.currentNode && (
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Current Location</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{selectedAircraft.position.currentNode}</p>
                </div>
              )}

              {(() => {
                const telemetry = droneTelemetry.find((item) => item.id === selectedAircraft.id);
                if (!telemetry?.distanceToTargetM) {
                  return null;
                }

                return (
                  <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-indigo-700 uppercase">Distance To Reach Point</p>
                    <p className="text-lg font-bold text-indigo-900 mt-1">{telemetry.distanceToTargetM} m</p>
                    <p className="text-xs text-indigo-700 mt-1">{telemetry.isNearPad ? 'Drone is near pad' : 'Drone en route to target pad'}</p>
                  </div>
                );
              })()}

              {/* Emergency Alert */}
              {selectedAircraft.state?.toUpperCase() === 'EMERGENCY' && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                  <p className="text-sm font-bold text-red-700">🚨 EMERGENCY STATUS ACTIVE</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-4">
            <img src={droneMarker} alt="drone" className="w-12 h-12 mb-2 opacity-80" />
            <p className="text-sm">Click a drone to see details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VertiportTwin;
