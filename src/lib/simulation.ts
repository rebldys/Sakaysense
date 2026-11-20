import {
  SIMULATED_VEHICLE_SEEDS,
  getRouteById,
  interpolatePath,
} from '../shared/routesData.ts';
import type { PublicJeepneyState } from '../shared/types.ts';

export interface SimRuntimeState {
  progress: number;
  direction: 1 | -1;
}

export function createInitialSimProgress(): Record<string, SimRuntimeState> {
  const map: Record<string, SimRuntimeState> = {};
  for (const seed of SIMULATED_VEHICLE_SEEDS) {
    map[seed.jeepneyId] = {
      progress: seed.startProgress,
      direction: seed.direction,
    };
  }
  return map;
}

export function advanceSimulationStep(
  current: Record<string, SimRuntimeState>,
  dtSeconds: number,
): { nextProgress: Record<string, SimRuntimeState>; vehicles: PublicJeepneyState[] } {
  const nextProgress: Record<string, SimRuntimeState> = {};
  const nowIso = new Date().toISOString();
  const vehicles: PublicJeepneyState[] = [];

  for (const seed of SIMULATED_VEHICLE_SEEDS) {
    const prev = current[seed.jeepneyId] ?? {
      progress: seed.startProgress,
      direction: seed.direction,
    };
    let p = prev.progress + prev.direction * seed.speedFactor * dtSeconds;
    let dir = prev.direction;

    if (p >= 1) {
      p = 1 - (p - 1);
      dir = -1;
    } else if (p <= 0) {
      p = Math.abs(p);
      dir = 1;
    }

    nextProgress[seed.jeepneyId] = { progress: p, direction: dir };

    const route = getRouteById(seed.routeId)!;
    const pos = interpolatePath(route.path, p);
    const adjustedHeading = dir === -1 ? (pos.heading + 180) % 360 : pos.heading;

    vehicles.push({
      jeepneyId: seed.jeepneyId,
      plateNumber: seed.plateNumber,
      unitName: seed.unitName,
      driverDisplayName: 'Simulated Route Unit',
      routeId: seed.routeId,
      isActive: true,
      driverStatus: 'on_trip',
      latitude: pos.lat,
      longitude: pos.lng,
      accuracy: null,
      speedKmh: Math.round(18 + seed.speedFactor * 420),
      heading: adjustedHeading,
      lastUpdated: nowIso,
      isSimulated: true,
      isStale: false,
    });
  }

  return { nextProgress, vehicles };
}
