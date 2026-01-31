import { useEffect, useState } from 'react';
import { weatherApi } from '../../api/weather';
import { WeatherData } from '../../types/weather';
import normalizeArray from '../../utils/normalizeArray';

const Weather = () => {
  const [current, setCurrent] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      const [currentRaw, forecastRaw] = await Promise.all([
        weatherApi.getCurrent().catch(() => null),
        weatherApi.getForecast().catch(() => null),
      ]);

      if (currentRaw && typeof currentRaw === 'object') {
        setCurrent(currentRaw as WeatherData);
      } else {
        setCurrent(null);
      }

      const normalized = normalizeArray<WeatherData>(forecastRaw);
      setForecast(normalized);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load weather data');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading weather data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Weather Conditions
        </h1>
        <button
          onClick={loadWeather}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Current Weather */}
      {current && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Current Conditions
            </h2>
            <div
              className={`px-4 py-2 rounded-lg font-semibold ${
                current.is_safe_for_operations
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {current.is_safe_for_operations
                ? '✓ Safe for Operations'
                : '✗ Operations Restricted'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Temperature</p>
              <p className="text-3xl font-bold text-gray-900">
                {current.temperature_c}°C
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Wind Speed</p>
              <p className="text-3xl font-bold text-gray-900">
                {current.wind_speed_kmh}
              </p>
              <p className="text-xs text-gray-500">
                km/h {current.wind_direction}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Visibility</p>
              <p className="text-3xl font-bold text-gray-900">
                {current.visibility_km}
              </p>
              <p className="text-xs text-gray-500">km</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Precipitation</p>
              <p className="text-3xl font-bold text-gray-900">
                {current.precipitation_mm}
              </p>
              <p className="text-xs text-gray-500">mm</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-lg font-semibold text-blue-900">
              {current.conditions}
            </p>
          </div>
        </div>
      )}

      {/* Forecast */}
      {forecast.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Forecast
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecast.map((item, index) => (
              <div
                key={item.id ?? index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <p className="text-sm text-gray-600 mb-2">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {item.temperature_c}°C
                    </p>
                    <p className="text-sm text-gray-600">
                      {item.conditions}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>Wind: {item.wind_speed_kmh} km/h</p>
                    <p>Vis: {item.visibility_km} km</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!current && forecast.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">No weather data available</p>
        </div>
      )}
    </div>
  );
};

export default Weather;
