'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from './skeleton';

const LocationPickerMap = dynamic(() => import('./location-picker-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-md" />,
});

interface LocationPickerProps {
  initialPosition?: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
  className?: string;
}

export function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerMap {...props} />;
}
