'use client';

import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet/dist/leaflet.css';
import type { LatLngTuple } from 'leaflet';
import { Locate, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { Button } from '@/components/ui/button';

interface LocationPickerMapProps {
  initialPosition?: LatLngTuple;
  onPositionChange: (lat: number, lng: number) => void;
  className?: string;
}

function LocationMarker({
  position,
  setPosition,
  onPositionChange,
}: {
  position: LatLngTuple | null;
  setPosition: (pos: LatLngTuple) => void;
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const newPos: LatLngTuple = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      onPositionChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : <Marker position={position} />;
}

function LocateControl({ onLocate }: { onLocate: (pos: LatLngTuple) => void }) {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLocate = () => {
    setLoading(true);
    setError(null);
    map
      .locate({ setView: true, maxZoom: 16 })
      .on('locationfound', function (e) {
        const newPos: LatLngTuple = [e.latlng.lat, e.latlng.lng];
        onLocate(newPos);
        setLoading(false);
      })
      .on('locationerror', function (e) {
        console.error('Geolocation error:', {
          code: e.code,
          message: e.message,
          type: e.type,
        });
        let msg = 'Gagal mendeteksi lokasi otomatis.';
        if (e.code === 1) msg = 'Izin lokasi ditolak. Harap izinkan akses lokasi di browser Anda.';
        else if (e.code === 2) msg = 'Posisi tidak tersedia. Coba lagi nanti.';
        else if (e.code === 3) msg = 'Waktu permintaan lokasi habis.';

        setError(msg);
        setLoading(false);
      });
  };

  return (
    <div className="leaflet-bottom leaflet-right flex flex-col items-end gap-2">
      {error && (
        <div className="mb-2 mr-2 max-w-[200px] rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
          {error}
        </div>
      )}
      <div className="leaflet-control leaflet-bar">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-8 w-8 rounded-md border bg-background shadow-sm hover:bg-accent"
          onClick={handleLocate}
          disabled={loading}
          title="Gunakan lokasi saya"
        >
          <Locate className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}

// Search Logic Component (renamed for clarity, logic moved to parent effectively)
// We don't need SearchControl as a map child anymore.
// But we need the Search UI. We will integrate it directly into the parent for simplicity or keep a pure UI component.

export default function LocationPickerMap({
  initialPosition,
  onPositionChange,
  className,
}: LocationPickerMapProps) {
  // Default to Jakarta if no position
  const defaultPosition: LatLngTuple = [-6.2088, 106.8456];
  const [position, setPosition] = useState<LatLngTuple | null>(initialPosition || defaultPosition);

  // Search State
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [noResult, setNoResult] = useState(false);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setNoResult(false);

    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data = await res.json();
      const results = Array.isArray(data) ? data : [];

      if (results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        // Updating position triggers LocationMarker effect which flies the map
        const newPos: LatLngTuple = [lat, lon];
        setPosition(newPos);
        onPositionChange(lat, lon);
      } else {
        setNoResult(true);
      }
    } catch (err) {
      console.error('Search error:', err);
      setNoResult(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div
      className={`relative isolate z-0 h-[300px] w-full overflow-hidden rounded-md border ${className}`}
    >
      {/* External Search Overlay */}
      <div className="absolute left-2 top-2 z-[500] flex flex-col gap-1">
        <div className="flex items-center gap-1 rounded-md bg-background/90 p-1 shadow backdrop-blur-sm">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNoResult(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Cari kota/lokasi..."
            className="h-8 w-40 rounded border-none bg-transparent px-2 text-xs focus:outline-none focus:ring-0 sm:w-56"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={searching}
            onClick={handleSearch}
          >
            <Search className={`h-4 w-4 ${searching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {noResult && (
          <div className="rounded-md bg-destructive/90 px-2 py-1 text-xs text-destructive-foreground shadow backdrop-blur-sm animate-in fade-in slide-in-from-top-1">
            Lokasi tidak ditemukan
          </div>
        )}
        <div className="rounded bg-background/50 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow backdrop-blur-sm">
          Klik peta untuk pin poin
        </div>
      </div>

      <MapContainer
        center={position || defaultPosition}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          position={position}
          setPosition={setPosition}
          onPositionChange={onPositionChange}
        />
        {/* SearchControl Removed from Children */}
        <LocateControl
          onLocate={(pos) => {
            setPosition(pos);
            onPositionChange(pos[0], pos[1]);
          }}
        />
      </MapContainer>
    </div>
  );
}
