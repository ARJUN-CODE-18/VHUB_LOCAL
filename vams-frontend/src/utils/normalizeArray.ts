export default function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }

  return [];
}
