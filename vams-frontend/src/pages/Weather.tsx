import { useEffect, useState } from 'react';
import { weatherApi } from '../api/weather';
import { WeatherData } from '../types/weather';

const Weather = () => {
  const [reports, setReports] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      const [vp1, vp2] = await Promise.all([
        weatherApi.getLatestForPad('VP-001').catch(() => null),
        weatherApi.getLatestForPad('VP-002').catch(() => null),
      ]);

      const next = [vp1, vp2].filter((item): item is WeatherData => item !== null);
      setReports(next);
    } catch {
      setError('Weather data unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();

    const interval = setInterval(() => {
      fetchWeather();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  const describeOperationalState = (report: WeatherData): string => {
    if (report.is_operational) {
      return 'Operational';
    }
    return report.constraint_reasons || 'Restricted';
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-2 border border-slate-200">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-slate-900">VERTIPORT WEATHER</h1>
        <button
          onClick={fetchWeather}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-slate-500">Loading weather...</p>}

      {error && <p className="text-red-700 bg-red-50 border border-red-100 rounded p-3">{error}</p>}

      {!loading && !error && reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-md border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{report.vertipad_id}</p>
                <span
                  className={`text-xs px-2 py-1 rounded ${report.is_operational ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {describeOperationalState(report)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Temperature</p>
                  <p className="font-semibold text-slate-900">{report.temperature_c} deg C</p>
                </div>
                <div>
                  <p className="text-slate-500">Wind</p>
                  <p className="font-semibold text-slate-900">{report.wind_speed_mps} m/s</p>
                </div>
                <div>
                  <p className="text-slate-500">Visibility</p>
                  <p className="font-semibold text-slate-900">{report.visibility_m} m</p>
                </div>
                <div>
                  <p className="text-slate-500">Pressure</p>
                  <p className="font-semibold text-slate-900">{report.pressure_hpa} hPa</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Observed: {new Date(report.observation_time).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <p className="text-slate-500">No weather reports available yet.</p>
      )}
    </div>
  );
};

export default Weather;
