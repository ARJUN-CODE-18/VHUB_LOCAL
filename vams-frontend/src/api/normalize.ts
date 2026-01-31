export function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.events)) return obj.events as T[];
    if (Array.isArray(obj.pads)) return obj.pads as T[];
  }

  return [];
}
