export interface TaxiEdge {
  from: string;
  to: string;
}

export interface TaxiGraph {
  nodes: string[];
  edges: TaxiEdge[];
}

class TaxiRouteGraph {
  private graph: TaxiGraph = {
    nodes: ['PAD1', 'PAD2', 'CHARGE1', 'TAXI_A'],
    edges: [
      { from: 'PAD1', to: 'TAXI_A' },
      { from: 'PAD2', to: 'TAXI_A' },
      { from: 'TAXI_A', to: 'CHARGE1' },
    ],
  };

  configurePads(padIds: string[]): void {
    const normalizedPads = padIds.map((padId) => padId.replace('-', ''));
    const nodes = new Set<string>([...normalizedPads, 'CHARGE1', 'TAXI_A']);
    const edges: TaxiEdge[] = normalizedPads.map((padId) => ({
      from: padId,
      to: 'TAXI_A',
    }));
    edges.push({ from: 'TAXI_A', to: 'CHARGE1' });

    this.graph = {
      nodes: [...nodes],
      edges,
    };
  }

  getRoute(startNode: string, endNode: string): string[] {
    const normalizedStart = startNode.replace('-', '');
    const normalizedEnd = endNode.replace('-', '');

    if (normalizedStart === normalizedEnd) {
      return [normalizedStart];
    }

    const adjacency = this.buildAdjacency();
    if (!adjacency.has(normalizedStart) || !adjacency.has(normalizedEnd)) {
      return [];
    }

    const visited = new Set<string>([normalizedStart]);
    const previous = new Map<string, string>();
    const queue: string[] = [normalizedStart];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      if (current === normalizedEnd) {
        return this.reconstructPath(previous, normalizedStart, normalizedEnd);
      }

      const neighbors = adjacency.get(current) ?? [];
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          previous.set(neighbor, current);
          queue.push(neighbor);
        }
      });
    }

    return [];
  }

  private buildAdjacency(): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    this.graph.nodes.forEach((node) => {
      adjacency.set(node, []);
    });

    this.graph.edges.forEach(({ from, to }) => {
      const fromNeighbors = adjacency.get(from) ?? [];
      fromNeighbors.push(to);
      adjacency.set(from, fromNeighbors);

      const toNeighbors = adjacency.get(to) ?? [];
      toNeighbors.push(from);
      adjacency.set(to, toNeighbors);
    });

    return adjacency;
  }

  private reconstructPath(
    previous: Map<string, string>,
    startNode: string,
    endNode: string,
  ): string[] {
    const path: string[] = [];
    let current: string | undefined = endNode;

    while (current) {
      path.unshift(current);
      if (current === startNode) {
        return path;
      }
      current = previous.get(current);
    }

    return [];
  }
}

export const taxiRouteGraph = new TaxiRouteGraph();