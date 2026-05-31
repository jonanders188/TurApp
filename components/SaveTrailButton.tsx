'use client';

import { useEffect, useState } from 'react';
import type { Trail } from '@/types/trail';

const STORAGE_KEY = 'turrute_saved_trails_v1';

type SavedTrail = Pick<Trail, 'id' | 'slug' | 'name' | 'municipality' | 'area' | 'distance_km' | 'estimated_minutes' | 'difficulty'>;

function readSaved(): SavedTrail[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as SavedTrail[] : [];
  } catch {
    return [];
  }
}

function writeSaved(trails: SavedTrail[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trails));
  window.dispatchEvent(new CustomEvent('turrute:saved-changed'));
}

export function getSavedTrailsFromBrowser() {
  return readSaved();
}

export function SaveTrailButton({ trail, variant = 'solid' }: { trail: Trail; variant?: 'solid' | 'outline' }) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(readSaved().some((item) => item.id === trail.id));
  }, [trail.id]);

  function toggle() {
    const current = readSaved();
    if (current.some((item) => item.id === trail.id)) {
      writeSaved(current.filter((item) => item.id !== trail.id));
      setIsSaved(false);
      return;
    }

    writeSaved([
      ...current,
      {
        id: trail.id,
        slug: trail.slug,
        name: trail.name,
        municipality: trail.municipality,
        area: trail.area,
        distance_km: trail.distance_km,
        estimated_minutes: trail.estimated_minutes,
        difficulty: trail.difficulty,
      },
    ]);
    setIsSaved(true);
  }

  const classes = variant === 'outline'
    ? 'rounded-full border border-emerald-900/20 bg-white px-6 py-3 font-black text-emerald-900 hover:bg-emerald-50'
    : 'rounded-full bg-emerald-950 px-6 py-3 font-black text-white hover:bg-emerald-900';

  return (
    <button type="button" onClick={toggle} className={classes} aria-pressed={isSaved}>
      {isSaved ? 'Lagret ✓' : 'Lagre tur'}
    </button>
  );
}
