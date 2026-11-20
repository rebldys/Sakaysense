import { signInWithPopup, signOut } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase.ts';
import { JEEPNEY_ROUTES, getRouteById } from '../shared/routesData.ts';
import type {
  DriverStatus,
  JeepneyRoute,
  PassengerCategory,
  PublicJeepneyState,
  RecentJourneyEntry,
  TripRecord,
  UserProfile,
} from '../shared/types.ts';

const STALE_GPS_MS = 90_000;

function timestampToIso(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function mapJeepneyDoc(id: string, data: Record<string, unknown>): PublicJeepneyState {
  const lastUpdatedIso = timestampToIso(data.lastUpdated);
  const lastMs = lastUpdatedIso ? Date.parse(lastUpdatedIso) : 0;
  const isStale = !lastUpdatedIso || Date.now() - lastMs > STALE_GPS_MS;
  const rawActive = Boolean(data.isActive);
  const status = (data.driverStatus as DriverStatus) || 'offline';
  const effectiveActive = rawActive && status === 'on_trip' && !isStale;

  return {
    jeepneyId: String(data.jeepneyId || id),
    plateNumber: String(data.plateNumber || 'UNASSIGNED'),
    unitName: String(data.unitName || id),
    driverDisplayName: String(data.driverDisplayName || 'Driver'),
    routeId: typeof data.routeId === 'string' ? data.routeId : null,
    isActive: effectiveActive,
    driverStatus: status,
    latitude: effectiveActive && typeof data.latitude === 'number' ? data.latitude : null,
    longitude: effectiveActive && typeof data.longitude === 'number' ? data.longitude : null,
    accuracy: effectiveActive && typeof data.accuracy === 'number' ? data.accuracy : null,
    speedKmh: effectiveActive && typeof data.speedKmh === 'number' ? data.speedKmh : null,
    heading: effectiveActive && typeof data.heading === 'number' ? data.heading : null,
    lastUpdated: lastUpdatedIso,
    isSimulated: false,
    isStale,
  };
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase() === ADMIN_EMAIL);
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

export async function ensureUserProfileAndAdminSeeds(): Promise<UserProfile> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Authentication required.');
  }

  const userPath = `users/${current.uid}`;
  const userRef = doc(db, 'users', current.uid);
  const isAdmin = isAdminEmail(current.email) && current.emailVerified;

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  if (!snap.exists()) {
    const cleanName = (current.displayName || current.email?.split('@')[0] || 'Commuter').slice(0, 80);
    const initialRole = isAdmin ? 'driver' : 'passenger';
    const initialJeepneyId = isAdmin ? 'JEEP-101' : null;
    const initialPlate = isAdmin ? 'NBE 4821' : null;

    const payload = {
      uid: current.uid,
      name: cleanName,
      role: initialRole,
      jeepneyId: initialJeepneyId,
      plateNumber: initialPlate,
      passengerCategory: 'regular',
      favoriteRouteIds: isAdmin ? ['R-KAT-UPD'] : ['R-KAT-UPD'],
      recentRouteIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userPath);
    }

    if (isAdmin) {
      await seedAdminRoutesAndSampleJeepney(current.uid, cleanName);
    }

    return {
      uid: current.uid,
      name: cleanName,
      email: current.email || '',
      role: initialRole,
      jeepneyId: initialJeepneyId,
      plateNumber: initialPlate,
      favoriteRouteIds: ['R-KAT-UPD'],
      recentRouteIds: [],
      recentJourneys: [],
      passengerCategory: 'regular',
    };
  }

  const data = snap.data();
  if (isAdmin) {
    await seedAdminRoutesAndSampleJeepney(current.uid, String(data.name || 'Fleet Admin'));
  }

  return {
    uid: current.uid,
    name: String(data.name || current.displayName || 'Commuter'),
    email: current.email || '',
    role: data.role === 'driver' ? 'driver' : 'passenger',
    jeepneyId: typeof data.jeepneyId === 'string' ? data.jeepneyId : null,
    plateNumber: typeof data.plateNumber === 'string' ? data.plateNumber : null,
    favoriteRouteIds: Array.isArray(data.favoriteRouteIds) ? data.favoriteRouteIds : [],
    recentRouteIds: Array.isArray(data.recentRouteIds) ? data.recentRouteIds : [],
    recentJourneys: [],
    passengerCategory:
      data.passengerCategory === 'student' ||
      data.passengerCategory === 'senior' ||
      data.passengerCategory === 'pwd'
        ? data.passengerCategory
        : 'regular',
  };
}

async function seedAdminRoutesAndSampleJeepney(adminUid: string, adminName: string): Promise<void> {
  try {
    const firstRouteRef = doc(db, 'routes', JEEPNEY_ROUTES[0].routeId);
    const firstRouteSnap = await getDoc(firstRouteRef);
    if (!firstRouteSnap.exists()) {
      const batch = writeBatch(db);
      for (const r of JEEPNEY_ROUTES) {
        batch.set(doc(db, 'routes', r.routeId), {
          routeId: r.routeId,
          code: r.code.slice(0, 24),
          routeName: r.routeName.slice(0, 120),
          origin: r.origin.slice(0, 100),
          destination: r.destination.slice(0, 100),
          distanceKm: r.distanceKm,
          estimatedMinutes: r.estimatedMinutes,
          vehicleClass: r.vehicleClass,
          colorHex: r.colorHex,
          isPublic: true,
          stops: r.stops.map((s) => ({ ...s })),
        });
      }
      await batch.commit();
    }

    const jeepRef = doc(db, 'jeepneys', 'JEEP-101');
    const jeepSnap = await getDoc(jeepRef);
    if (!jeepSnap.exists()) {
      await setDoc(jeepRef, {
        jeepneyId: 'JEEP-101',
        plateNumber: 'NBE 4821',
        unitName: 'Katipunan Coop Unit 101',
        driverId: adminUid,
        driverDisplayName: adminName.split(' ')[0].slice(0, 40),
        routeId: null,
        isActive: false,
        driverStatus: 'offline',
        latitude: null,
        longitude: null,
        accuracy: null,
        speedKmh: null,
        heading: null,
        lastUpdated: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'routes_or_jeepneys_seed');
  }
}

export function subscribePublicRoutes(
  onRoutes: (routes: JeepneyRoute[]) => void,
): () => void {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, 'routes'), where('isPublic', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onRoutes(JEEPNEY_ROUTES);
        return;
      }
      const loaded: JeepneyRoute[] = snapshot.docs.map((d) => {
        const data = d.data();
        const fallback = getRouteById(String(data.routeId || d.id));
        return {
          routeId: String(data.routeId || d.id),
          code: String(data.code || fallback?.code || d.id),
          routeName: String(data.routeName || fallback?.routeName || d.id),
          origin: String(data.origin || fallback?.origin || ''),
          destination: String(data.destination || fallback?.destination || ''),
          distanceKm: Number(data.distanceKm || fallback?.distanceKm || 4),
          estimatedMinutes: Number(data.estimatedMinutes || fallback?.estimatedMinutes || 15),
          vehicleClass: data.vehicleClass === 'modernized' ? 'modernized' : 'traditional',
          colorHex: String(data.colorHex || fallback?.colorHex || '#0D9488'),
          stops: Array.isArray(data.stops) ? data.stops : fallback?.stops || [],
          path: fallback?.path || [],
        };
      });
      onRoutes(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'routes');
    },
  );
}

export function subscribeActiveJeepneys(
  onUpdate: (jeepneys: PublicJeepneyState[]) => void,
): () => void {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, 'jeepneys'), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => mapJeepneyDoc(d.id, d.data()));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jeepneys');
    },
  );
}

export function subscribeUserJourneys(
  uid: string,
  onJourneys: (journeys: RecentJourneyEntry[]) => void,
): () => void {
  if (!auth.currentUser) return () => {};
  const path = `users/${uid}/journeys`;
  const q = query(collection(db, 'users', uid, 'journeys'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: RecentJourneyEntry[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data.journeyId || d.id),
            routeId: String(data.routeId || ''),
            routeName: String(data.routeName || ''),
            destinationStop: String(data.destinationStop || ''),
            timestamp: timestampToIso(data.createdAt) || new Date().toISOString(),
            mode: data.mode === 'live' ? ('live' as const) : ('simulated_journey' as const),
          };
        })
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
        .slice(0, 10);
      onJourneys(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function updateUserPreferences(
  uid: string,
  updates: {
    favoriteRouteIds?: string[];
    recentRouteIds?: string[];
    passengerCategory?: PassengerCategory;
  },
): Promise<void> {
  const path = `users/${uid}`;
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.favoriteRouteIds) {
    payload.favoriteRouteIds = updates.favoriteRouteIds.slice(0, 12);
  }
  if (updates.recentRouteIds) {
    payload.recentRouteIds = updates.recentRouteIds.slice(0, 8);
  }
  if (updates.passengerCategory) {
    payload.passengerCategory = updates.passengerCategory;
  }

  try {
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function recordUserJourney(
  uid: string,
  routeId: string,
  destinationStop: string,
  mode: 'live' | 'simulated_journey',
  currentRecentRouteIds: string[],
): Promise<void> {
  const route = getRouteById(routeId);
  if (!route) return;
  const journeyId = `jrn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const journeyPath = `users/${uid}/journeys/${journeyId}`;

  try {
    await setDoc(doc(db, 'users', uid, 'journeys', journeyId), {
      journeyId,
      userId: uid,
      routeId: route.routeId,
      routeName: route.routeName.slice(0, 120),
      destinationStop: destinationStop.slice(0, 100),
      mode,
      createdAt: serverTimestamp(),
    });

    const nextRecent = [
      route.routeId,
      ...currentRecentRouteIds.filter((r) => r !== route.routeId),
    ].slice(0, 8);

    await updateDoc(doc(db, 'users', uid), {
      recentRouteIds: nextRecent,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, journeyPath);
  }
}

export async function deleteUserJourney(uid: string, journeyId: string): Promise<void> {
  const path = `users/${uid}/journeys/${journeyId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'journeys', journeyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Driver Subscriptions & Operations
export function subscribeDriverJeepney(
  driverUid: string,
  onJeepney: (jeepney: PublicJeepneyState | null) => void,
): () => void {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, 'jeepneys'), where('driverId', '==', driverUid));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onJeepney(null);
        return;
      }
      const d = snapshot.docs[0];
      onJeepney(mapJeepneyDoc(d.id, d.data()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jeepneys');
    },
  );
}

export function subscribeDriverTrips(
  driverUid: string,
  onTrips: (trips: TripRecord[]) => void,
): () => void {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, 'trips'), where('driverId', '==', driverUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TripRecord[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            tripId: String(data.tripId || d.id),
            driverId: String(data.driverId || ''),
            jeepneyId: String(data.jeepneyId || ''),
            routeId: String(data.routeId || ''),
            startedAt: timestampToIso(data.startedAt) || new Date().toISOString(),
            endedAt: timestampToIso(data.endedAt),
            status: data.status === 'completed' ? ('completed' as const) : ('active' as const),
          };
        })
        .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
        .slice(0, 15);
      onTrips(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
    },
  );
}

export async function setDriverJeepneyStatus(
  jeepneyId: string,
  status: 'online' | 'offline' | 'gps_unavailable',
): Promise<void> {
  const path = `jeepneys/${jeepneyId}`;
  try {
    await updateDoc(doc(db, 'jeepneys', jeepneyId), {
      isActive: false,
      driverStatus: status,
      latitude: null,
      longitude: null,
      accuracy: null,
      speedKmh: null,
      heading: null,
      lastUpdated: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function startFirestoreTrip(params: {
  driverUid: string;
  jeepneyId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speedKmh: number | null;
  heading: number | null;
}): Promise<string> {
  const tripId = `TRIP_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const tripPath = `trips/${tripId}`;
  const jeepPath = `jeepneys/${params.jeepneyId}`;

  try {
    await setDoc(doc(db, 'trips', tripId), {
      tripId,
      driverId: params.driverUid,
      jeepneyId: params.jeepneyId,
      routeId: params.routeId,
      startedAt: serverTimestamp(),
      endedAt: null,
      status: 'active',
    });

    await updateDoc(doc(db, 'jeepneys', params.jeepneyId), {
      routeId: params.routeId,
      isActive: true,
      driverStatus: 'on_trip',
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy: params.accuracy,
      speedKmh: params.speedKmh,
      heading: params.heading,
      lastUpdated: serverTimestamp(),
    });

    return tripId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${tripPath} / ${jeepPath}`);
  }
}

export async function publishFirestoreDriverLocation(params: {
  jeepneyId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speedKmh: number | null;
  heading: number | null;
}): Promise<void> {
  const path = `jeepneys/${params.jeepneyId}`;
  try {
    await updateDoc(doc(db, 'jeepneys', params.jeepneyId), {
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy: params.accuracy,
      speedKmh: params.speedKmh,
      heading: params.heading,
      lastUpdated: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function endFirestoreTrip(params: {
  tripId: string | null;
  jeepneyId: string;
}): Promise<void> {
  const path = `jeepneys/${params.jeepneyId}`;
  try {
    if (params.tripId) {
      await updateDoc(doc(db, 'trips', params.tripId), {
        status: 'completed',
        endedAt: serverTimestamp(),
      });
    }
    await updateDoc(doc(db, 'jeepneys', params.jeepneyId), {
      isActive: false,
      driverStatus: 'online',
      latitude: null,
      longitude: null,
      accuracy: null,
      speedKmh: null,
      heading: null,
      lastUpdated: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Fleet Admin helper: Assign a user UID as an authorized driver for a jeepney unit
export async function adminAssignDriverUnit(params: {
  targetUid: string;
  driverName: string;
  jeepneyId: string;
  plateNumber: string;
  unitName: string;
}): Promise<void> {
  const cleanUid = params.targetUid.trim();
  const cleanJeepId = params.jeepneyId.trim().toUpperCase();
  const userRef = doc(db, 'users', cleanUid);
  const jeepRef = doc(db, 'jeepneys', cleanJeepId);

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await updateDoc(userRef, {
        role: 'driver',
        jeepneyId: cleanJeepId,
        plateNumber: params.plateNumber.trim().toUpperCase(),
        updatedAt: serverTimestamp(),
      });
    }

    const jeepSnap = await getDoc(jeepRef);
    if (jeepSnap.exists()) {
      await updateDoc(jeepRef, {
        driverId: cleanUid,
        driverDisplayName: params.driverName.trim().split(' ')[0].slice(0, 40),
        plateNumber: params.plateNumber.trim().toUpperCase(),
        unitName: params.unitName.trim().slice(0, 80),
        lastUpdated: serverTimestamp(),
      });
    } else {
      await setDoc(jeepRef, {
        jeepneyId: cleanJeepId,
        plateNumber: params.plateNumber.trim().toUpperCase(),
        unitName: params.unitName.trim().slice(0, 80),
        driverId: cleanUid,
        driverDisplayName: params.driverName.trim().split(' ')[0].slice(0, 40),
        routeId: null,
        isActive: false,
        driverStatus: 'offline',
        latitude: null,
        longitude: null,
        accuracy: null,
        speedKmh: null,
        heading: null,
        lastUpdated: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `jeepneys/${cleanJeepId}`);
  }
}

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'No GPS reading';
  const diffSec = Math.max(0, Math.floor((Date.now() - Date.parse(isoString)) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}
