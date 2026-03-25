export type NodeType = 'PAD' | 'TAXI' | 'CHARGING';

export interface LayoutNode {
  x: number;
  y: number;
  label: string;
  type: NodeType;
}

export const layoutDimensions = {
  width: 420,
  height: 340,
};

export const nodes: Record<string, LayoutNode> = {
  PAD_1: { x: 50, y: 300, label: 'PAD-1', type: 'PAD' },
  PAD_2: { x: 350, y: 300, label: 'PAD-2', type: 'PAD' },
  TAXI_A: { x: 200, y: 200, label: 'TAXI-A', type: 'TAXI' },
  CHARGING: { x: 200, y: 50, label: 'CHARGING', type: 'CHARGING' },
};

export const edges: Array<[string, string]> = [
  ['PAD_1', 'TAXI_A'],
  ['PAD_2', 'TAXI_A'],
  ['TAXI_A', 'CHARGING'],
];

export function normalizeNodeId(nodeId: string): string {
  const normalized = nodeId.toUpperCase().replace(/-/g, '_');

  if (normalized === 'PAD1') {
    return 'PAD_1';
  }

  if (normalized === 'PAD2') {
    return 'PAD_2';
  }

  if (normalized === 'CHARGE1') {
    return 'CHARGING';
  }

  return normalized;
}

export function getStateDefaultNode(state: string): string {
  const upperState = state.toUpperCase();

  if (upperState === 'CHARGING') {
    return 'CHARGING';
  }

  if (
    upperState === 'TAXI_TO_CHARGING'
    || upperState === 'TAXI_TO_PAD'
    || upperState === 'TAXIING'
    || upperState === 'LANDING_QUEUE'
    || upperState === 'LANDING'
  ) {
    return 'TAXI_A';
  }

  if (upperState === 'DEPARTURE' || upperState === 'DEPARTED') {
    return 'PAD_2';
  }

  return 'PAD_1';
}
