import { useQuery } from '@tanstack/react-query';
import { siteConfig } from '@/lib/config';

export interface BtcMapPlace {
  id: number;
  lat: number;
  lon: number;
  name: string;
  address: string;
  phone: string;
  website: string;
  icon: string;
  verified_at: string;
  boosted_until: string;
}

interface Coordinates {
  lat: number;
  lon: number;
}

async function geocodeZip(zip: string, country: string, signal: AbortSignal): Promise<Coordinates> {
  const params = new URLSearchParams({
    postalcode: zip,
    country,
    format: 'json',
    limit: '1',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: { 'User-Agent': 'BitcoinCommunitySites/1.0' },
  });
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data.length) throw new Error(`No results for zip "${zip}" in country "${country}"`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function fetchBtcMapPlaces(lat: number, lon: number, signal: AbortSignal): Promise<BtcMapPlace[]> {
  const res = await fetch(
    `https://api.btcmap.org/v4/places/search?lat=${lat}&lon=${lon}&radius_km=50`,
    { signal },
  );
  if (!res.ok) throw new Error('BTCMap API request failed');
  return res.json();
}

export function useBtcMapPlaces() {
  const hasExplicitCoords =
    siteConfig.locationLat !== undefined && siteConfig.locationLon !== undefined;

  const geocodeQuery = useQuery({
    queryKey: ['geocode', siteConfig.locationZip, siteConfig.locationCountry],
    queryFn: async ({ signal }) => {
      if (hasExplicitCoords) {
        return { lat: siteConfig.locationLat!, lon: siteConfig.locationLon! };
      }
      if (!siteConfig.locationZip) {
        throw new Error('VITE_LOCATION_ZIP is required when business pages are enabled');
      }
      return geocodeZip(siteConfig.locationZip, siteConfig.locationCountry, signal);
    },
    staleTime: Infinity,
    enabled: siteConfig.enableBusiness,
  });

  const coordinates = geocodeQuery.data;

  const placesQuery = useQuery({
    queryKey: ['btcmap-places', coordinates?.lat, coordinates?.lon],
    queryFn: async ({ signal }) => {
      return fetchBtcMapPlaces(coordinates!.lat, coordinates!.lon, signal);
    },
    enabled: !!coordinates,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    places: placesQuery.data ?? [],
    coordinates,
    isLoading: geocodeQuery.isLoading || placesQuery.isLoading,
    error: geocodeQuery.error || placesQuery.error,
  };
}
