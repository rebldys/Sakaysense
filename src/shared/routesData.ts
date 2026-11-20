import type { JeepneyRoute, PassengerCategory, PublicJeepneyState } from './types.ts';

export const JEEPNEY_ROUTES: JeepneyRoute[] = [
  {
    routeId: 'R-KAT-UPD',
    code: 'KAT-UPD',
    routeName: 'Katipunan – UP Diliman Campus Loop',
    origin: 'Katipunan LRT-2 Station',
    destination: 'UP Diliman Palma Hall',
    distanceKm: 4.8,
    estimatedMinutes: 18,
    vehicleClass: 'modernized',
    colorHex: '#0D9488',
    stops: [
      {
        stopId: 'KAT-1',
        name: 'Katipunan LRT-2 Terminal',
        landmark: 'Aurora Blvd underpass bay',
        latitude: 14.6309,
        longitude: 121.0743,
        kmFromOrigin: 0,
      },
      {
        stopId: 'KAT-2',
        name: 'Ateneo Gate 3',
        landmark: 'Katipunan Ave pedestrian footbridge',
        latitude: 14.6392,
        longitude: 121.0752,
        kmFromOrigin: 1.1,
      },
      {
        stopId: 'KAT-3',
        name: 'Miriam College',
        landmark: 'Katipunan northbound loading zone',
        latitude: 14.6458,
        longitude: 121.0757,
        kmFromOrigin: 2.0,
      },
      {
        stopId: 'KAT-4',
        name: 'UP Town Center',
        landmark: 'Phase 2 amphitheater frontage',
        latitude: 14.6502,
        longitude: 121.0758,
        kmFromOrigin: 2.7,
      },
      {
        stopId: 'KAT-5',
        name: 'CP Garcia / Velasquez',
        landmark: 'National Institute of Physics',
        latitude: 14.6548,
        longitude: 121.0734,
        kmFromOrigin: 3.6,
      },
      {
        stopId: 'KAT-6',
        name: 'UP Palma Hall (AS)',
        landmark: 'Academic Oval waiting shed',
        latitude: 14.6538,
        longitude: 121.0684,
        kmFromOrigin: 4.8,
      },
    ],
    path: [
      [14.6309, 121.0743],
      [14.6349, 121.0747],
      [14.6392, 121.0752],
      [14.6458, 121.0757],
      [14.6502, 121.0758],
      [14.6548, 121.0734],
      [14.6562, 121.0706],
      [14.6538, 121.0684],
    ],
  },
  {
    routeId: 'R-PHI-ESP',
    code: 'PHI-ESP',
    routeName: 'Philcoa – Quiapo via España',
    origin: 'Philcoa Terminal',
    destination: 'Quiapo Church',
    distanceKm: 10.6,
    estimatedMinutes: 38,
    vehicleClass: 'traditional',
    colorHex: '#0F766E',
    stops: [
      {
        stopId: 'PHI-1',
        name: 'Philcoa Terminal',
        landmark: 'Commonwealth Ave jeepney bay',
        latitude: 14.654,
        longitude: 121.0545,
        kmFromOrigin: 0,
      },
      {
        stopId: 'PHI-2',
        name: 'Quezon Memorial Circle',
        landmark: 'Elliptical Rd City Hall side',
        latitude: 14.6494,
        longitude: 121.0493,
        kmFromOrigin: 1.0,
      },
      {
        stopId: 'PHI-3',
        name: 'Quezon Ave – EDSA',
        landmark: 'Centris MRT-3 loading bay',
        latitude: 14.6345,
        longitude: 121.0282,
        kmFromOrigin: 3.9,
      },
      {
        stopId: 'PHI-4',
        name: 'Welcome Rotonda',
        landmark: 'E. Rodriguez / España boundary',
        latitude: 14.6184,
        longitude: 121.002,
        kmFromOrigin: 7.1,
      },
      {
        stopId: 'PHI-5',
        name: 'UST España Gate',
        landmark: 'P. Noval footbridge',
        latitude: 14.6101,
        longitude: 120.9896,
        kmFromOrigin: 8.7,
      },
      {
        stopId: 'PHI-6',
        name: 'Morayta / FEU',
        landmark: 'Nicanor Reyes St corner',
        latitude: 14.6024,
        longitude: 120.9873,
        kmFromOrigin: 9.8,
      },
      {
        stopId: 'PHI-7',
        name: 'Quiapo Plaza Miranda',
        landmark: 'Quezon Blvd underpass',
        latitude: 14.5988,
        longitude: 120.9839,
        kmFromOrigin: 10.6,
      },
    ],
    path: [
      [14.654, 121.0545],
      [14.6494, 121.0493],
      [14.6416, 121.0387],
      [14.6345, 121.0282],
      [14.6266, 121.0156],
      [14.6184, 121.002],
      [14.6101, 120.9896],
      [14.6024, 120.9873],
      [14.5988, 120.9839],
    ],
  },
  {
    routeId: 'R-CUB-DIV',
    code: 'CUB-DIV',
    routeName: 'Cubao – Divisoria via Aurora / Legarda',
    origin: 'Araneta City Cubao',
    destination: 'Divisoria Tutuban',
    distanceKm: 9.8,
    estimatedMinutes: 42,
    vehicleClass: 'traditional',
    colorHex: '#1D4ED8',
    stops: [
      {
        stopId: 'CUB-1',
        name: 'Araneta City Cubao',
        landmark: 'Aurora Blvd Gateway Mall bay',
        latitude: 14.6209,
        longitude: 121.0532,
        kmFromOrigin: 0,
      },
      {
        stopId: 'CUB-2',
        name: 'Gilmore LRT-2',
        landmark: 'Aurora Blvd IT Center corner',
        latitude: 14.6135,
        longitude: 121.0342,
        kmFromOrigin: 2.3,
      },
      {
        stopId: 'CUB-3',
        name: 'V. Mapa / SM Sta. Mesa',
        landmark: 'Magsaysay Blvd',
        latitude: 14.6041,
        longitude: 121.017,
        kmFromOrigin: 4.5,
      },
      {
        stopId: 'CUB-4',
        name: 'Pureza / PUP Stop',
        landmark: 'Magsaysay Blvd corner Pureza',
        latitude: 14.6016,
        longitude: 121.0052,
        kmFromOrigin: 5.9,
      },
      {
        stopId: 'CUB-5',
        name: 'Legarda / Mendiola',
        landmark: 'San Sebastian / CEU corridor',
        latitude: 14.6009,
        longitude: 120.9927,
        kmFromOrigin: 7.3,
      },
      {
        stopId: 'CUB-6',
        name: 'Recto Avenida',
        landmark: 'LRT-1 / LRT-2 interchange',
        latitude: 14.6028,
        longitude: 120.9822,
        kmFromOrigin: 8.5,
      },
      {
        stopId: 'CUB-7',
        name: 'Divisoria Tutuban',
        landmark: 'Claro M. Recto terminal',
        latitude: 14.6033,
        longitude: 120.9718,
        kmFromOrigin: 9.8,
      },
    ],
    path: [
      [14.6209, 121.0532],
      [14.6185, 121.0422],
      [14.6135, 121.0342],
      [14.6085, 121.0249],
      [14.6041, 121.017],
      [14.6016, 121.0052],
      [14.6009, 120.9927],
      [14.6028, 120.9822],
      [14.6033, 120.9718],
    ],
  },
  {
    routeId: 'R-MOA-BUE',
    code: 'MOA-BUE',
    routeName: 'SM Mall of Asia – Taft / Buendia',
    origin: 'SM Mall of Asia Rotonda',
    destination: 'Gil Puyat LRT-1 (Buendia)',
    distanceKm: 4.1,
    estimatedMinutes: 16,
    vehicleClass: 'modernized',
    colorHex: '#0284C7',
    stops: [
      {
        stopId: 'MOA-1',
        name: 'SM MOA Globe Rotonda',
        landmark: 'Southbound transport bay',
        latitude: 14.5351,
        longitude: 120.9822,
        kmFromOrigin: 0,
      },
      {
        stopId: 'MOA-2',
        name: 'Macapagal / EDSA Ext',
        landmark: 'Blue Bay Walk intersection',
        latitude: 14.5376,
        longitude: 120.9892,
        kmFromOrigin: 1.0,
      },
      {
        stopId: 'MOA-3',
        name: 'Pasay Rotonda (EDSA-Taft)',
        landmark: 'MRT-3 Taft / LRT-1 EDSA',
        latitude: 14.5378,
        longitude: 121.0005,
        kmFromOrigin: 2.2,
      },
      {
        stopId: 'MOA-4',
        name: 'Libertad LRT-1',
        landmark: 'Taft Ave Pasay Public Market',
        latitude: 14.5477,
        longitude: 120.9986,
        kmFromOrigin: 3.3,
      },
      {
        stopId: 'MOA-5',
        name: 'Gil Puyat LRT-1 (Buendia)',
        landmark: 'Jac Liner / DLTB terminal corner',
        latitude: 14.5542,
        longitude: 120.997,
        kmFromOrigin: 4.1,
      },
    ],
    path: [
      [14.5351, 120.9822],
      [14.5376, 120.9892],
      [14.5378, 121.0005],
      [14.5432, 120.9995],
      [14.5477, 120.9986],
      [14.5542, 120.997],
    ],
  },
  {
    routeId: 'R-MAR-CUB',
    code: 'MAR-CUB',
    routeName: 'Marikina Bayan – Cubao via Aurora',
    origin: 'Marikina Sports Center',
    destination: 'Cubao Gateway',
    distanceKm: 6.2,
    estimatedMinutes: 24,
    vehicleClass: 'modernized',
    colorHex: '#0F766E',
    stops: [
      {
        stopId: 'MAR-1',
        name: 'Marikina Sports Center',
        landmark: 'Sumulong Hwy loading bay',
        latitude: 14.6327,
        longitude: 121.0978,
        kmFromOrigin: 0,
      },
      {
        stopId: 'MAR-2',
        name: 'Riverbanks Center',
        landmark: 'A. Bonifacio Ave bridge',
        latitude: 14.6296,
        longitude: 121.0846,
        kmFromOrigin: 1.6,
      },
      {
        stopId: 'MAR-3',
        name: 'Santolan LRT-2',
        landmark: 'Marcos Highway terminal',
        latitude: 14.6223,
        longitude: 121.0858,
        kmFromOrigin: 2.9,
      },
      {
        stopId: 'MAR-4',
        name: 'Anonas LRT-2',
        landmark: 'Aurora Blvd corner Anonas',
        latitude: 14.6279,
        longitude: 121.0645,
        kmFromOrigin: 4.9,
      },
      {
        stopId: 'MAR-5',
        name: 'Cubao Gateway',
        landmark: 'Aurora Blvd corner Gen. Araneta',
        latitude: 14.6215,
        longitude: 121.0535,
        kmFromOrigin: 6.2,
      },
    ],
    path: [
      [14.6327, 121.0978],
      [14.6311, 121.091],
      [14.6296, 121.0846],
      [14.6223, 121.0858],
      [14.6298, 121.0736],
      [14.6279, 121.0645],
      [14.6215, 121.0535],
    ],
  },
  {
    routeId: 'R-MON-QUI',
    code: 'MON-QUI',
    routeName: 'Monumento – Quiapo via Rizal Ave',
    origin: 'Monumento Circle',
    destination: 'Quiapo Plaza Miranda',
    distanceKm: 7.4,
    estimatedMinutes: 30,
    vehicleClass: 'traditional',
    colorHex: '#1E3A8A',
    stops: [
      {
        stopId: 'MON-1',
        name: 'Monumento Circle',
        landmark: 'Rizal Ave Extension southbound',
        latitude: 14.6574,
        longitude: 120.9839,
        kmFromOrigin: 0,
      },
      {
        stopId: 'MON-2',
        name: '5th Ave LRT-1',
        landmark: 'C-3 intersection',
        latitude: 14.6444,
        longitude: 120.9836,
        kmFromOrigin: 1.5,
      },
      {
        stopId: 'MON-3',
        name: 'Abad Santos LRT-1',
        landmark: 'Rizal Ave corner Abad Santos',
        latitude: 14.6305,
        longitude: 120.9815,
        kmFromOrigin: 3.1,
      },
      {
        stopId: 'MON-4',
        name: 'Tayuman LRT-1',
        landmark: 'SM San Lazaro corner',
        latitude: 14.6167,
        longitude: 120.9826,
        kmFromOrigin: 4.7,
      },
      {
        stopId: 'MON-5',
        name: 'Bambang LRT-1',
        landmark: 'Medical supply district',
        latitude: 14.6111,
        longitude: 120.9824,
        kmFromOrigin: 5.4,
      },
      {
        stopId: 'MON-6',
        name: 'Carriedo / Quiapo',
        landmark: 'Plaza Miranda terminal',
        latitude: 14.5988,
        longitude: 120.9839,
        kmFromOrigin: 7.4,
      },
    ],
    path: [
      [14.6574, 120.9839],
      [14.6444, 120.9836],
      [14.6305, 120.9815],
      [14.6167, 120.9826],
      [14.6111, 120.9824],
      [14.5991, 120.9813],
      [14.5988, 120.9839],
    ],
  },
];

export interface SimulatedVehicleSeed {
  jeepneyId: string;
  plateNumber: string;
  unitName: string;
  routeId: string;
  startProgress: number; // 0..1 along route path
  speedFactor: number;
  direction: 1 | -1;
}

export const SIMULATED_VEHICLE_SEEDS: SimulatedVehicleSeed[] = [
  {
    jeepneyId: 'DEMO-01',
    plateNumber: 'DEMO 101',
    unitName: 'Demo E-Jeep Katipunan',
    routeId: 'R-KAT-UPD',
    startProgress: 0.15,
    speedFactor: 0.016,
    direction: 1,
  },
  {
    jeepneyId: 'DEMO-02',
    plateNumber: 'DEMO 202',
    unitName: 'Demo Jeepney España',
    routeId: 'R-PHI-ESP',
    startProgress: 0.48,
    speedFactor: 0.011,
    direction: 1,
  },
  {
    jeepneyId: 'DEMO-03',
    plateNumber: 'DEMO 303',
    unitName: 'Demo Jeepney Aurora',
    routeId: 'R-CUB-DIV',
    startProgress: 0.72,
    speedFactor: 0.012,
    direction: -1,
  },
  {
    jeepneyId: 'DEMO-04',
    plateNumber: 'DEMO 404',
    unitName: 'Demo E-Jeep Bay City',
    routeId: 'R-MOA-BUE',
    startProgress: 0.35,
    speedFactor: 0.018,
    direction: 1,
  },
  {
    jeepneyId: 'DEMO-05',
    plateNumber: 'DEMO 505',
    unitName: 'Demo E-Jeep Marikina',
    routeId: 'R-MAR-CUB',
    startProgress: 0.6,
    speedFactor: 0.014,
    direction: -1,
  },
];

export const SAMPLE_FARE_CONFIG = {
  disclaimer:
    'Sample fare estimate for prototype demonstration only. Always verify current rates with official LTFRB tariff matrices.',
  traditional: {
    baseFare4Km: 13.0,
    perAdditionalKm: 1.8,
  },
  modernized: {
    baseFare4Km: 15.0,
    perAdditionalKm: 2.2,
  },
  discountRate: 0.2, // 20% Statutory Discount for Student / Senior Citizen / PWD
};

export function calculateSampleFare(
  distanceKm: number,
  vehicleClass: 'traditional' | 'modernized',
  category: PassengerCategory,
): { regularFare: number; discountedFare: number; appliedFare: number } {
  const rate = SAMPLE_FARE_CONFIG[vehicleClass];
  const extraKm = Math.max(0, Math.ceil(distanceKm - 4));
  const rawRegular = rate.baseFare4Km + extraKm * rate.perAdditionalKm;
  const regularFare = Math.round(rawRegular * 4) / 4; // quarter-peso rounding
  const isDiscounted = category !== 'regular';
  const discountedFare = Math.round(regularFare * (1 - SAMPLE_FARE_CONFIG.discountRate) * 4) / 4;
  return {
    regularFare,
    discountedFare,
    appliedFare: isDiscounted ? discountedFare : regularFare,
  };
}

export function getRouteById(routeId: string | null | undefined): JeepneyRoute | undefined {
  if (!routeId) return undefined;
  return JEEPNEY_ROUTES.find((r) => r.routeId === routeId);
}

export function createInitialSimulatedVehicles(): PublicJeepneyState[] {
  return SIMULATED_VEHICLE_SEEDS.map((seed) => {
    const route = getRouteById(seed.routeId)!;
    const pos = interpolatePath(route.path, seed.startProgress);
    return {
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
      speedKmh: 24,
      heading: pos.heading,
      lastUpdated: new Date().toISOString(),
      isSimulated: true,
      isStale: false,
    };
  });
}

export function interpolatePath(
  path: [number, number][],
  progress: number,
): { lat: number; lng: number; heading: number } {
  if (path.length === 0) return { lat: 14.6091, lng: 121.0223, heading: 0 };
  if (path.length === 1) return { lat: path[0][0], lng: path[0][1], heading: 0 };

  const clamped = Math.max(0, Math.min(1, progress));
  const totalSegments = path.length - 1;
  const scaled = clamped * totalSegments;
  const idx = Math.min(totalSegments - 1, Math.floor(scaled));
  const frac = scaled - idx;

  const [lat1, lng1] = path[idx];
  const [lat2, lng2] = path[idx + 1];

  const lat = lat1 + (lat2 - lat1) * frac;
  const lng = lng1 + (lng2 - lng1) * frac;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const heading = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;

  return { lat, lng, heading };
}
