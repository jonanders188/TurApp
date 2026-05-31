import trails from '../../data/trails.vestfold.json';
import { filterTrails, sortTrailsForHome } from './filterTrails';
import type { Trail } from '../types/trail';

const allTrails = trails as Trail[];

export const homeTrails = sortTrailsForHome(allTrails);

export const strollerFriendlyUnderOneHour = filterTrails(allTrails, {
  suitable: 'stroller',
  maxMinutes: 60,
});

export const wheelchairFriendlyVestfold = filterTrails(allTrails, {
  suitable: 'wheelchair',
  maxDistanceKm: 3,
});
