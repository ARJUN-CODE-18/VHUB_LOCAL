import { useEffect, useState } from 'react';
import { getMetar, MetarData } from '../services/metarService';

const Weather = () => {
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetar = async () => {
    try {
      setError(null);
      const data = await getMetar();
      setMetar(data);
    } catch {
      setError('Aviation weather data unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetar();

    const interval = setInterval(() => {
      fetchMetar();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-2 border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900 mb-5">VERTIPORT WEATHER (AVIATION)</h1>

      {loading && <p className="text-slate-500">Loading aviation weather...</p>}

      {error && <p className="text-red-700 bg-red-50 border border-red-100 rounded p-3">{error}</p>}

      {!loading && !error && metar && (
        <div className="space-y-4 text-slate-800">
          <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold tracking-wide text-slate-600 mb-1">METAR REPORT</p>
            <p className="font-mono text-sm text-slate-900">{metar.raw}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold tracking-wide text-slate-600">WIND</p>
              <p className="text-lg font-semibold text-slate-900">{metar.wind}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold tracking-wide text-slate-600">VISIBILITY</p>
              <p className="text-lg font-semibold text-slate-900">{metar.visibility}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold tracking-wide text-slate-600">TEMPERATURE</p>
              <p className="text-lg font-semibold text-slate-900">{metar.temperature}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold tracking-wide text-slate-600">PRESSURE</p>
              <p className="text-lg font-semibold text-slate-900">{metar.pressure}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Weather;
