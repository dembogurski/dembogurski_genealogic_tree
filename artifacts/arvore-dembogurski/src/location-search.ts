export type Place = { label: string; latitude: number; longitude: number };

export function parsePlaces(data: unknown): Place[] {
  if (!data || typeof data !== 'object' || !('features' in data) || !Array.isArray(data.features)) {
    throw new Error('Não foi possível interpretar os resultados da busca.');
  }
  return data.features.flatMap((feature): Place[] => {
    if (!feature || feature.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return [];
    const [longitude, latitude] = feature.geometry.coordinates;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    const properties = feature.properties || {};
    const parts = [properties.name, properties.street, properties.city, properties.state, properties.country]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    const label = [...new Set(parts)].join(', ');
    return label ? [{ label, latitude, longitude }] : [];
  });
}

const cache = new Map<string, Place[]>();

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const term = query.trim();
  if (term.length < 3) throw new Error('Digite pelo menos 3 caracteres para buscar.');
  const key = term.toLocaleLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', term);
  url.searchParams.set('limit', '5');
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('A busca está indisponível. Tente novamente ou informe as coordenadas.');
  const places = parsePlaces(await response.json());
  if (cache.size >= 50) cache.delete(cache.keys().next().value!);
  cache.set(key, places);
  return places;
}
