'use client';

import type { LatLngTuple } from 'leaflet';
import { useState, useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import type { TrackingEvent } from '@/lib/api/types';

const CITY_COORDS: Record<string, LatLngTuple> = {
  jakarta: [-6.2088, 106.8456],
  bandung: [-7.2575, 107.5733],
  surabaya: [-7.2575, 112.7521],
  medan: [3.5952, 98.6722],
  semarang: [-6.9667, 110.4167],
  makassar: [-5.1477, 119.4327],
  palembang: [-2.9761, 104.7754],
  denpasar: [-8.6705, 115.2126],
  yogyakarta: [-7.7956, 110.3695],
  bogor: [-6.595, 106.7899],
  tangerang: [-6.1786, 106.6359],
  bekasi: [-6.2383, 106.9756],
  depok: [-6.3914, 106.8234],
  cikarang: [-6.2597, 107.1506],
};

const DEFAULT_CENTER: LatLngTuple = [-2.5, 118];

function resolveCoords(location: string): LatLngTuple | null {
  const key = location.toLowerCase().trim();
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (key.includes(city)) return coords;
  }
  return null;
}

interface TrackingMapProps {
  tracking: TrackingEvent[];
  className?: string;
}

export default function TrackingMap({ tracking, className }: TrackingMapProps) {
  const [points, setPoints] = useState<(TrackingEvent & { coords: LatLngTuple })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveAllPoints = async () => {
      setLoading(true);
      const resolvedList: (TrackingEvent & { coords: LatLngTuple })[] = [];

      for (const event of tracking) {
        if (!event.location) continue;

        // Try static lookup first (fast & reliable fallback)
        let coords = resolveCoords(event.location);

        // If not found statically, query the dynamic geocoding endpoint
        if (!coords) {
          try {
            const res = await fetch(
              `/api/geocode/search?q=${encodeURIComponent(event.location)}&limit=1`,
            );
            if (res.ok) {
              const data = await res.json();
              if (data && data[0]) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                if (!isNaN(lat) && !isNaN(lon)) {
                  coords = [lat, lon];
                }
              }
            }
          } catch (err) {
            console.error('Failed to geocode location dynamically:', event.location, err);
          }
        }

        if (coords) {
          resolvedList.push({ ...event, coords });
        }
      }

      if (active) {
        setPoints(resolvedList);
        setLoading(false);
      }
    };

    resolveAllPoints();

    return () => {
      active = false;
    };
  }, [tracking]);

  if (loading) {
    return (
      <div className="mt-4 flex h-64 w-full animate-pulse items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Memuat peta pelacakan dan koordinat lokasi...
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
        Data lokasi pengiriman belum tersedia atau tidak dapat ter-geocode.
      </div>
    );
  }

  const routeCoords: LatLngTuple[] = points.map((p) => p.coords);
  const center = points[Math.floor(points.length / 2)]?.coords ?? DEFAULT_CENTER;

  return (
    <div className={`mt-4 h-64 w-full overflow-hidden rounded-lg border ${className ?? ''}`}>
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.7, dashArray: '8 8' }}
        />
        {points.map((point, index) => (
          <Marker key={`${point.timestamp}-${index}`} position={point.coords}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{point.location}</p>
                <p className="text-xs">{point.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
