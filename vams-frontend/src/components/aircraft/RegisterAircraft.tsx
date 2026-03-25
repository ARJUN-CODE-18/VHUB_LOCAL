import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aircraftApi } from '../../api/aircraft';
import { VertiportEventBus } from '../../controllers/VertiportEventBus';
import { addAircraft } from '../../state/aircraftStore';
// note: using a loose `any` shape for formData to match runtime payload
import ErrorDisplay from '../common/ErrorDisplay';

const RegisterAircraft = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    tail_number: '',
    aircraft_type: '',
    operator: '',
    weight_kg: 0,
    max_range_km: 0,
    battery_level: 100,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        tail_number: formData.tail_number,
        aircraft_type: formData.aircraft_type,
        operator: formData.operator,
        weight_kg: Number((formData as any).weight_kg),
        max_range_km: Number((formData as any).max_range_km),
        battery_level: Number((formData as any).battery_level),
      };

      const createdAircraft = await aircraftApi.create(payload);
      const savedAircraft = addAircraft(createdAircraft);
      if (savedAircraft) {
        VertiportEventBus.emit('aircraft_added', savedAircraft);
      }
      navigate('/aircraft');
    } catch (err: unknown) {
      console.error('Register aircraft failed:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to register aircraft');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      // remove leading zeros (but keep a single zero when appropriate)
      const cleaned = value.replace(/^0+(?=[0-9]|\.)/, '');
      const num = cleaned === '' ? 0 : Number(cleaned);
      setFormData((prev: any) => ({ ...prev, [name]: num }));
      return;
    }

    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/aircraft')}
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          ← Back to Aircraft List
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Register New Aircraft</h1>

        <div className="mb-6">
          <ErrorDisplay message={error} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="tail_number" className="block text-sm font-medium text-gray-700 mb-2">
              Tail Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="tail_number"
              name="tail_number"
              required
              value={formData.tail_number}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., N12345"
            />
          </div>

          <div>
            <label htmlFor="aircraft_type" className="block text-sm font-medium text-gray-700 mb-2">
              Aircraft Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="aircraft_type"
              name="aircraft_type"
              required
              value={formData.aircraft_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., eVTOL-X"
            />
          </div>

          <div>
            <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-2">
              Operator <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="operator"
              name="operator"
              required
              value={formData.operator}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., SkyOps Inc"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
                <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="weight_kg"
                  name="weight_kg"
                  required
                  min="0"
                  step="0.01"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
            </div>

            <div>
              <label htmlFor="max_range_km" className="block text-sm font-medium text-gray-700 mb-2">
                Max Range (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="max_range_km"
                name="max_range_km"
                required
                min="0"
                step="0.01"
                value={formData.max_range_km}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="battery_level" className="block text-sm font-medium text-gray-700 mb-2">
              Battery Level (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="battery_level"
              name="battery_level"
              required
              min="0"
              max="100"
              value={formData.battery_level}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Registering...' : 'Register Aircraft'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/aircraft')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterAircraft;