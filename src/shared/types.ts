export type UserRole = 'passenger' | 'driver';

export type PassengerCategory = 'regular' | 'student' | 'senior' | 'pwd';

export type DriverStatus = 'online' | 'on_trip' | 'offline' | 'gps_unavailable';

export interface RouteStop {
  stopId: string;
  name: string;
  landmark: string;
  latitude: number;
  longitude: number;
  kmFromOrigin: number;
}

export interface JeepneyRoute {
  routeId: string;
  code: string;
  routeName: string;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedMinutes: number;
  vehicleClass: 'traditional' | 'modernized';
  colorHex: string;
  stops: RouteStop[];
  path: [number, number][];
}

export interface PublicJeepneyState {
  jeepneyId: string;
  plateNumber: string;
  unitName: string;
  driverDisplayName: string;
  routeId: string | null;
  isActive: boolean;
  driverStatus: DriverStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speedKmh: number | null;
  heading: number | null;
  lastUpdated: string | null;
  isSimulated: boolean;
  isStale: boolean;
}

export interface TripRecord {
  tripId: string;
  driverId: string;
  jeepneyId: string;
  routeId: string;
  startedAt: string;
  endedAt: string | null;
  status: 'active' | 'completed';
}

export interface RecentJourneyEntry {
  id: string;
  routeId: string;
  routeName: string;
  destinationStop: string;
  timestamp: string;
  mode: 'live' | 'simulated_journey';
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  jeepneyId: string | null;
  plateNumber?: string | null;
  favoriteRouteIds: string[];
  recentRouteIds: string[];
  recentJourneys: RecentJourneyEntry[];
  passengerCategory: PassengerCategory;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
