export interface MetarData {
  raw: string;
  wind: string;
  visibility: string;
  temperature: string;
  pressure: string;
}

export async function getMetar(): Promise<MetarData> {
  const ICAO = 'VOMM';

  const response = await fetch(
    `https://aviationweather.gov/api/data/metar?ids=${ICAO}&format=json`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch METAR weather');
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error('No METAR data available');
  }

  const metar = data[0];

  return {
    raw: metar.rawOb,
    wind: `${metar.wdir}° ${metar.wspd} kt`,
    visibility: `${metar.visib} km`,
    temperature: `${metar.temp} °C`,
    pressure: `${metar.altim} hPa`,
  };
}
