import { useEffect, useMemo, useState } from 'react';
import droneMarker from '../../assets/drone-marker.svg';
import type { AircraftStoreItem } from '../../state/aircraftStore';

type PadStatusLike = {
  id: string;
  state: string;
  current_aircraft_id: string | null;
};

type DroneMovement3DProps = {
  aircraft: AircraftStoreItem[];
  pads: PadStatusLike[];
};

type Node = { x: number; y: number };

type DroneSim = {
  id: string;
  state: string;
  from: Node;
  to: Node;
  x: number;
  y: number;
  progress: number;
  distanceM: number;
  near: boolean;
  targetLabel: string;
};

const NODES: Record<string, Node> = {
  SKY: { x: 50, y: 8 },
  TAXI: { x: 50, y: 55 },
  VP_001: { x: 20, y: 80 },
  VP_002: { x: 80, y: 80 },
  CHARGING: { x: 50, y: 22 },
};

const M_PER_SCENE_UNIT = 3.2;

function normalizePad(pad?: string | null): string | null {
  if (!pad) return null;
  const p = pad.toUpperCase();
  if (p === 'VP-001' || p === 'PAD_1' || p === 'PAD-1') return 'VP_001';
  if (p === 'VP-002' || p === 'PAD_2' || p === 'PAD-2') return 'VP_002';
  return null;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function computeDistance(a: Node, b: Node, progress: number): number {
  const remainingDx = (b.x - a.x) * (1 - progress);
  const remainingDy = (b.y - a.y) * (1 - progress);
  return Math.round(Math.sqrt(remainingDx * remainingDx + remainingDy * remainingDy) * M_PER_SCENE_UNIT);
}

const DroneMovement3D = ({ aircraft, pads }: DroneMovement3DProps) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 350);
    return () => window.clearInterval(id);
  }, []);

  const droneList = useMemo(() => aircraft.slice(0, 4), [aircraft]);

  const simulations = useMemo(() => {
    return droneList.map<DroneSim>((ac, index) => {
      const state = String(ac.state ?? ac.current_state ?? 'PARKED').toUpperCase();
      const assigned = normalizePad(ac.pad_id ?? ac.assigned_pad ?? null);
      const fallbackPad = index % 2 === 0 ? 'VP_001' : 'VP_002';
      const target = assigned ?? fallbackPad;
      const targetNode: Node = NODES[target] ?? NODES.VP_001!;

      const phase = ((tick + index * 2) % 28) / 28;

      let from: Node = NODES.TAXI!;
      let to: Node = targetNode;
      let progress = phase;

      if (state.includes('DEPART')) {
        from = targetNode;
        to = NODES.SKY!;
        progress = phase;
      } else if (state.includes('APPROACH') || state.includes('LANDING') || state.includes('INBOUND')) {
        from = NODES.SKY!;
        to = targetNode;
        progress = phase;
      } else if (state === 'CHARGING') {
        from = NODES.CHARGING!;
        to = targetNode;
        progress = 0.05;
      } else if (state === 'PARKED' || state === 'LANDED') {
        from = targetNode;
        to = targetNode;
        progress = 1;
      }

      const x = lerp(from.x, to.x, progress);
      const y = lerp(from.y, to.y, progress);
      const distanceM = computeDistance(from, to, progress);
      const near = distanceM <= 30;

      return {
        id: ac.tail_number ?? ac.id,
        state,
        from,
        to,
        x,
        y,
        progress,
        distanceM,
        near,
        targetLabel: target.replace('_', '-'),
      };
    });
  }, [droneList, tick]);

  const activePads = useMemo(() => pads.map((p) => p.id), [pads]);

  return (
    <div className="bg-white/90 rounded-xl border border-cyan-100 shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-900">3D Drone Movement View</h2>
        <span className="text-xs px-2 py-1 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">Takeoff/Landing Simulation</span>
      </div>

      <div className="relative h-72 rounded-xl overflow-hidden bg-[radial-gradient(circle_at_center,_#0c3259,_#081a30)] border border-slate-700">
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'linear-gradient(to right, rgba(150,230,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(150,230,255,0.2) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="50" y1="8" x2="50" y2="55" stroke="#3dd5f3" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
          <line x1="50" y1="55" x2="20" y2="80" stroke="#3dd5f3" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
          <line x1="50" y1="55" x2="80" y2="80" stroke="#3dd5f3" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />

          {simulations.map((sim) => (
            <g key={`path-${sim.id}`}>
              <line
                x1={sim.x}
                y1={sim.y}
                x2={sim.to.x}
                y2={sim.to.y}
                stroke={sim.near ? '#22c55e' : '#fbbf24'}
                strokeWidth="0.65"
                strokeDasharray={sim.near ? '1.5 1.2' : '2.5 2'}
                opacity="0.95"
              />
            </g>
          ))}
        </svg>

        <div className="absolute left-[16%] top-[75%] text-[10px] text-cyan-100 bg-cyan-900/60 px-2 py-1 rounded">VP-001</div>
        <div className="absolute right-[16%] top-[75%] text-[10px] text-cyan-100 bg-cyan-900/60 px-2 py-1 rounded">VP-002</div>
        <div className="absolute left-1/2 -translate-x-1/2 top-[12%] text-[10px] text-cyan-100 bg-cyan-900/60 px-2 py-1 rounded">CHARGING</div>

        {simulations.map((sim) => (
          <div
            key={sim.id}
            className="absolute"
            style={{ left: `${sim.x}%`, top: `${sim.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className={`absolute -left-6 -top-6 w-12 h-12 rounded-full ${sim.near ? 'bg-green-400/20' : 'bg-amber-300/20'} animate-pulse`} />
            <img src={droneMarker} alt="drone" className="w-7 h-7 relative z-10 drop-shadow-[0_0_8px_rgba(120,220,255,0.7)]" />
            <div className="absolute -left-8 -top-8 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/85 text-cyan-100 border border-cyan-500/40 whitespace-nowrap">
              {sim.id}
            </div>
            <div className={`absolute -left-6 top-7 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${sim.near ? 'bg-green-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
              {sim.distanceM}m to {sim.targetLabel}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200">Pads Active: {activePads.join(', ') || 'N/A'}</div>
        <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200">Drones simulated: {simulations.length}</div>
        <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200">Near-pad drones: {simulations.filter((d) => d.near).length}</div>
      </div>
    </div>
  );
};

export default DroneMovement3D;
