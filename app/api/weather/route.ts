import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

type MetInstant = {
  air_temperature?: number;
  wind_speed?: number;
};

type MetNext1h = {
  details?: { precipitation_amount?: number };
};

type MetTimeseries = {
  time: string;
  data: {
    instant?: { details?: MetInstant };
    next_1_hours?: MetNext1h;
  };
};

function getConditionLabel(temp: number | null, wind: number | null, rain: number | null) {
  if ((rain ?? 0) > 2) return 'Vått turvær';
  if ((wind ?? 0) > 9) return 'Mye vind';
  if ((temp ?? 10) < 0) return 'Kaldt turvær';
  if ((rain ?? 0) <= 0.2 && (wind ?? 0) <= 5) return 'Perfekt turvær';
  return 'Fint turvær';
}

function getRecommendation(temp: number | null, wind: number | null, rain: number | null) {
  if ((rain ?? 0) > 2) return 'Ta regntøy og velg en kort tur med enkelt underlag.';
  if ((wind ?? 0) > 9) return 'Velg skjermet skogstur fremfor åpen kyststi akkurat nå.';
  if ((temp ?? 10) < 0) return 'Kle godt på barna og vurder kort runde.';
  if ((rain ?? 0) <= 0.2 && (wind ?? 0) <= 5) return 'Lite vind og lite nedbør. Dette er et godt tidspunkt å gå tur.';
  return 'Gode forhold for nærtur de neste timene.';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const { lat, lng } = parsed.data;
  const endpoint = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': process.env.TURRUTE_MET_USER_AGENT || 'Turrute MVP jon@bluestonepim.com',
      },
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `MET API returned ${response.status}` }, { status: 502 });
    }

    const payload = await response.json();
    const current = payload?.properties?.timeseries?.[0] as MetTimeseries | undefined;
    const instant = current?.data?.instant?.details ?? {};
    const nextHour = current?.data?.next_1_hours?.details ?? {};

    const temperature = typeof instant.air_temperature === 'number' ? instant.air_temperature : null;
    const windSpeed = typeof instant.wind_speed === 'number' ? instant.wind_speed : null;
    const precipitation = typeof nextHour.precipitation_amount === 'number' ? nextHour.precipitation_amount : null;

    return NextResponse.json({
      source: 'met.no',
      time: current?.time ?? null,
      temperature,
      windSpeed,
      precipitation,
      label: getConditionLabel(temperature, windSpeed, precipitation),
      recommendation: getRecommendation(temperature, windSpeed, precipitation),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
