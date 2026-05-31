export type WeatherNow = {
  temperatureC: number;
  windMps: number;
  precipitationNext3HoursMm: number;
};

export function getTripWeatherLabel(weather: WeatherNow): {
  label: string;
  severity: 'good' | 'ok' | 'bad';
  reasons: string[];
} {
  const reasons: string[] = [];

  if (weather.precipitationNext3HoursMm > 4) reasons.push('mye nedbør neste 3 timer');
  else if (weather.precipitationNext3HoursMm > 0.5) reasons.push('litt nedbør neste 3 timer');
  else reasons.push('lite eller ingen nedbør');

  if (weather.windMps >= 10) reasons.push('mye vind');
  else if (weather.windMps >= 6) reasons.push('noe vind');
  else reasons.push('lite vind');

  if (weather.temperatureC < 0) reasons.push('kaldt');
  else if (weather.temperatureC < 8) reasons.push('kjølig');
  else reasons.push('behagelig temperatur');

  if (weather.precipitationNext3HoursMm > 4 || weather.windMps >= 10) {
    return { label: 'Ikke ideelt turvær', severity: 'bad', reasons };
  }

  if (weather.precipitationNext3HoursMm > 0.5 || weather.windMps >= 6 || weather.temperatureC < 8) {
    return { label: 'Greit turvær', severity: 'ok', reasons };
  }

  return { label: 'Perfekt turvær de neste 3 timene', severity: 'good', reasons };
}
