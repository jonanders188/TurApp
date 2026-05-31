'use client';

import dynamic from 'next/dynamic';
import type { Trail } from '@/types/trail';

type TrailLeafletMapProps = {
  trail: Trail;
  heightClass?: string;
  interactive?: boolean;
  followUser?: boolean;
};

const ClientTrailLeafletMap = dynamic(
  () => import('@/components/map/TrailLeafletMap').then((mod) => mod.TrailLeafletMap),
  {
    ssr: false,
    loading: () => <div className="h-[22rem] w-full rounded-[1.8rem] bg-emerald-50 ring-1 ring-emerald-900/10" />,
  },
);

export function TrailLeafletMapDynamic(props: TrailLeafletMapProps) {
  return <ClientTrailLeafletMap {...props} />;
}
