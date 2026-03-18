export interface WeatherData {
  temperature: number;
  windSpeed: number;
  visibility: number;
  condition: string;
}

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;
const CITY = (import.meta.env.VITE_VERTIPORT_CITY as string | undefined) || 'Chennai';

console.log('Weather API key loaded:', !!API_KEY);

export async function getWeather(): Promise<WeatherData> {
  if (!API_KEY) {
    throw new Error('Missing VITE_OPENWEATHER_API_KEY in environment configuration');
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`
  );

  if (!response.ok) {
    const text = await response.text();
    console.error('OpenWeather error:', text);
    throw new Error(`OpenWeather request failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    temperature: data.main.temp,
    windSpeed: data.wind.speed,
    visibility: data.visibility,
    condition: data.weather[0].main,
  };
}
