import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { siteConfig } from '@/lib/config';
import { useBtcMapPlaces } from '@/hooks/useBtcMapPlaces';
import { MapPin, ArrowLeft, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import '@/lib/leafletSetup';

export default function BusinessMap() {
  const siteTitle = siteConfig.siteTitle;
  const { places, coordinates, isLoading, error } = useBtcMapPlaces();

  useSeoMeta({
    title: `Bitcoin Business Map - ${siteTitle}`,
    description: `Find bitcoin-accepting businesses near you. Powered by BTCMap.`,
  });

  const placesWithCoords = useMemo(
    () => places.filter((p) => p.lat && p.lon),
    [places],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-64" />
            </div>
            <div className="flex flex-col lg:flex-row gap-4" style={{ height: 'calc(100vh - 12rem)' }}>
              <Skeleton className="w-full lg:flex-[2] rounded-lg" />
              <div className="lg:flex-[1] space-y-3 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <div className="max-w-2xl mx-auto">
              <Card className="border-destructive">
                <CardContent className="py-12 text-center space-y-4">
                  <MapPin className="h-12 w-12 mx-auto text-destructive" />
                  <h2 className="text-xl font-semibold">Could Not Load Map</h2>
                  <p className="text-muted-foreground">
                    {error.message}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check that VITE_LOCATION_ZIP is set correctly in your .env file.
                  </p>
                  <Link to="/business">
                    <Button variant="outline">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Business
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent/20">
      <Navigation />

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Link to="/business">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Bitcoin Business Map</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {placesWithCoords.length} business{placesWithCoords.length !== 1 ? 'es' : ''} found nearby
            </p>
          </div>

          {/* Empty state */}
          {coordinates && placesWithCoords.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-2">
                <MapPin className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  No bitcoin-accepting businesses found in this area.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try checking your zip code or expanding the search area.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Map + Sidebar */}
          {coordinates && placesWithCoords.length > 0 && (
            <div className="flex flex-col lg:flex-row gap-4" style={{ height: 'calc(100vh - 14rem)' }}>
              {/* Map */}
              <div className="w-full lg:flex-[2] rounded-lg overflow-hidden border">
                <MapContainer
                  center={[coordinates.lat, coordinates.lon]}
                  zoom={12}
                  className="h-full w-full"
                  style={{ minHeight: '400px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {placesWithCoords.map((place) => (
                    <Marker key={place.id} position={[place.lat, place.lon]}>
                      <Popup>
                        <div className="space-y-1 text-sm">
                          <strong>{place.name || 'Unnamed Business'}</strong>
                          {place.address && <p>{place.address}</p>}
                          {place.website && (
                            <a
                              href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline flex items-center gap-1"
                            >
                              Website <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Sidebar */}
              <div className="lg:flex-[1] overflow-y-auto space-y-2">
                {placesWithCoords.map((place) => (
                  <Card key={place.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="py-3 px-4">
                      <h3 className="font-medium text-sm truncate">
                        {place.name || 'Unnamed Business'}
                      </h3>
                      {place.address && (
                        <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                      )}
                      {place.website && (
                        <a
                          href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
