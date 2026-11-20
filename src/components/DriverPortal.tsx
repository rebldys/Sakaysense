import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Navigation,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Square,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  adminAssignDriverUnit,
  endFirestoreTrip,
  formatRelativeTime,
  isAdminEmail,
  publishFirestoreDriverLocation,
  setDriverJeepneyStatus,
  signInWithGoogle,
  startFirestoreTrip,
  subscribeDriverJeepney,
  subscribeDriverTrips,
} from '../lib/firebaseService.ts';
import type {
  DriverStatus,
  JeepneyRoute,
  PublicJeepneyState,
  TripRecord,
  UserProfile,
} from '../shared/types.ts';
import { LeafletMap } from './LeafletMap.tsx';

interface DriverPortalProps {
  user: UserProfile | null;
  routes: JeepneyRoute[];
  onLogout: () => void;
}

const STATUS_LABELS: Record<DriverStatus, { label: string; colorClass: string }> = {
  online: { label: 'Online (Idle)', colorClass: 'bg-emerald-100 text-emerald-800' },
  on_trip: { label: 'On Trip (Broadcasting GPS)', colorClass: 'bg-teal-100 text-teal-800' },
  offline: { label: 'Offline', colorClass: 'bg-slate-200 text-slate-700' },
  gps_unavailable: { label: 'GPS Unavailable', colorClass: 'bg-rose-100 text-rose-800' },
};

export function DriverPortal({ user, routes, onLogout }: DriverPortalProps) {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [driverJeepney, setDriverJeepney] = useState<PublicJeepneyState | null>(null);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.routeId || 'R-KAT-UPD');

  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'tracking' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastCoords, setLastCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speedKmh: number | null;
    heading: number | null;
  } | null>(null);
  const [lastUploadAt, setLastUploadAt] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [busyAction, setBusyAction] = useState(false);

  // Fleet Admin assignment form (visible only to bootstrapped admin email)
  const [assignUid, setAssignUid] = useState('');
  const [assignName, setAssignName] = useState('');
  const [assignJeepId, setAssignJeepId] = useState('JEEP-204');
  const [assignPlate, setAssignPlate] = useState('NCT 7193');
  const [assignUnitName, setAssignUnitName] = useState('España Transit Unit 204');
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const latestCoordsRef = useRef<typeof lastCoords>(null);

  const isAuthorizedDriver = Boolean(user && user.role === 'driver');
  const isAdmin = Boolean(user && isAdminEmail(user.email));

  const activeTrip = useMemo(
    () => trips.find((t) => t.status === 'active') || null,
    [trips],
  );

  const stopGpsWatchers = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  // Subscribe to Firestore driver jeepney & trips when authorized driver is signed in
  useEffect(() => {
    if (!user || !isAuthorizedDriver) {
      stopGpsWatchers();
      setDriverJeepney(null);
      setTrips([]);
      return;
    }

    const unsubJeep = subscribeDriverJeepney(user.uid, (jeepney) => {
      setDriverJeepney(jeepney);
      if (jeepney?.routeId) {
        setSelectedRouteId(jeepney.routeId);
      }
    });

    const unsubTrips = subscribeDriverTrips(user.uid, (tripList) => {
      setTrips(tripList);
    });

    return () => {
      unsubJeep();
      unsubTrips();
    };
  }, [user, isAuthorizedDriver, stopGpsWatchers]);

  useEffect(() => {
    return () => stopGpsWatchers();
  }, [stopGpsWatchers]);

  const handleGoogleDriverLogin = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setSigningIn(false);
    }
  };

  const beginLiveWatchAndUploadLoop = useCallback(
    (jeepneyId: string) => {
      stopGpsWatchers();
      setGpsStatus('tracking');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const speedMs = pos.coords.speed;
          const speedKmh =
            typeof speedMs === 'number' && Number.isFinite(speedMs) && speedMs >= 0
              ? Math.round(speedMs * 3.6 * 10) / 10
              : null;

          const snapshot = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
            speedKmh,
            heading:
              typeof pos.coords.heading === 'number' && Number.isFinite(pos.coords.heading)
                ? pos.coords.heading
                : null,
          };
          latestCoordsRef.current = snapshot;
          setLastCoords(snapshot);
          setGpsError(null);
        },
        async (err) => {
          setGpsStatus('error');
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError('Location permission denied. Live GPS tracking stopped.');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setGpsError('GPS signal unavailable on this device.');
          } else {
            setGpsError('GPS reading timed out. Check device location services.');
          }
          try {
            await setDriverJeepneyStatus(jeepneyId, 'gps_unavailable');
          } catch {
            // Ignore secondary error
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 12000,
        },
      );

      // Upload GPS coordinates to Firestore approximately every 5 seconds
      intervalIdRef.current = window.setInterval(async () => {
        const coords = latestCoordsRef.current;
        if (!coords) return;
        setUploadState('syncing');
        try {
          await publishFirestoreDriverLocation({
            jeepneyId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            speedKmh: coords.speedKmh,
            heading: coords.heading,
          });
          setLastUploadAt(new Date().toISOString());
          setUploadState('synced');
        } catch (err) {
          setUploadState('error');
          setGpsError(err instanceof Error ? err.message : 'Failed to upload GPS update to Firestore.');
        }
      }, 5000);
    },
    [stopGpsWatchers],
  );

  const assignedJeepneyId = driverJeepney?.jeepneyId || user?.jeepneyId || null;

  const handleStartTrip = async () => {
    if (!user || !assignedJeepneyId) return;
    if (!('geolocation' in navigator)) {
      setGpsStatus('error');
      setGpsError('Browser Geolocation API is not supported on this device.');
      await setDriverJeepneyStatus(assignedJeepneyId, 'gps_unavailable').catch(() => {});
      return;
    }

    setBusyAction(true);
    setGpsStatus('requesting');
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const initialCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speedKmh:
            typeof pos.coords.speed === 'number' && pos.coords.speed >= 0
              ? Math.round(pos.coords.speed * 3.6 * 10) / 10
              : null,
          heading: typeof pos.coords.heading === 'number' ? pos.coords.heading : null,
        };
        latestCoordsRef.current = initialCoords;
        setLastCoords(initialCoords);

        try {
          await startFirestoreTrip({
            driverUid: user.uid,
            jeepneyId: assignedJeepneyId,
            routeId: selectedRouteId,
            latitude: initialCoords.latitude,
            longitude: initialCoords.longitude,
            accuracy: initialCoords.accuracy,
            speedKmh: initialCoords.speedKmh,
            heading: initialCoords.heading,
          });
          setLastUploadAt(new Date().toISOString());
          setUploadState('synced');
          beginLiveWatchAndUploadLoop(assignedJeepneyId);
        } catch (err) {
          setGpsStatus('error');
          setGpsError(err instanceof Error ? err.message : 'Could not start Firestore trip.');
        } finally {
          setBusyAction(false);
        }
      },
      async (err) => {
        setBusyAction(false);
        setGpsStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(
            'Location permission was denied. Allow location access in your browser settings to start a live trip.',
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('Device GPS position is currently unavailable.');
        } else {
          setGpsError('Timed out acquiring initial GPS fix. Move to an open area and try again.');
        }
        try {
          await setDriverJeepneyStatus(assignedJeepneyId, 'gps_unavailable');
        } catch {
          // Ignore
        }
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const handleEndTrip = async () => {
    if (!assignedJeepneyId) return;
    setBusyAction(true);
    stopGpsWatchers();
    setGpsStatus('idle');
    setUploadState('idle');
    try {
      await endFirestoreTrip({
        tripId: activeTrip?.tripId || null,
        jeepneyId: assignedJeepneyId,
      });
      setLastCoords(null);
      latestCoordsRef.current = null;
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : 'Failed to end trip cleanly.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleManualStatusChange = async (nextStatus: 'online' | 'offline' | 'gps_unavailable') => {
    if (!assignedJeepneyId) return;
    if (activeTrip) {
      setGpsError('End your active trip before changing status to Offline or Online.');
      return;
    }
    try {
      await setDriverJeepneyStatus(assignedJeepneyId, nextStatus);
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : 'Could not update driver status.');
    }
  };

  const handleAssignDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);
    try {
      await adminAssignDriverUnit({
        targetUid: assignUid,
        driverName: assignName,
        jeepneyId: assignJeepId,
        plateNumber: assignPlate,
        unitName: assignUnitName,
      });
      setAdminMessage(`Assigned ${assignJeepId.toUpperCase()} to driver UID ${assignUid.trim()}.`);
    } catch (err) {
      setAdminMessage(err instanceof Error ? err.message : 'Could not assign driver unit.');
    }
  };

  const selectedRoute = useMemo(
    () => routes.find((r) => r.routeId === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  // Sign-In Screen for Driver Mode
  if (!user) {
    return (
      <div className="bg-[#0F1E36] text-white rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-300">
          <ShieldCheck className="w-4 h-4" />
          Firebase Driver Authentication Required
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Sign in with Google to access Driver GPS Telemetry.
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          Firestore security rules strictly enforce that only authorized driver accounts can create trips or update GPS coordinates on their assigned jeepney document.
        </p>

        {authError && (
          <p className="text-xs text-rose-200 bg-rose-900/50 border border-rose-500/40 rounded-xl p-3">
            {authError}
          </p>
        )}

        <button
          type="button"
          disabled={signingIn}
          onClick={handleGoogleDriverLogin}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {signingIn ? 'Signing in...' : 'Sign In with Google'}
        </button>
      </div>
    );
  }

  // Passenger Authorization Gate
  if (!isAuthorizedDriver) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-2xl mx-auto space-y-4">
        <div className="flex items-start gap-3 text-rose-700">
          <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-[#0F1E36]">Driver Authorization Required</h1>
            <p className="text-sm text-slate-600 mt-1">
              You are signed in as <strong>{user.name}</strong> ({user.email}) with a{' '}
              <strong>Passenger</strong> role. Firestore Security Rules block passenger accounts from publishing GPS vehicle locations.
            </p>
            <p className="text-xs font-mono-tabular text-slate-500 mt-2">
              Your Firebase UID: {user.uid}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              A Fleet Admin can authorize your UID and assign a jeepney unit from the Fleet Admin Roster.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F1E36] hover:bg-slate-800 text-white text-sm font-semibold"
          >
            Sign Out &amp; Switch Account
          </button>
        </div>
      </div>
    );
  }

  const currentStatus: DriverStatus = driverJeepney?.driverStatus || 'offline';
  const statusMeta = STATUS_LABELS[currentStatus];

  return (
    <div className="space-y-5">
      {/* Driver Header Card */}
      <section className="bg-[#0F1E36] text-white rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-semibold text-teal-300">Firebase Driver Console</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${statusMeta.colorClass}`}>
              {statusMeta.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold">
            {user.name} · {assignedJeepneyId || 'No Unit Assigned'}
          </h1>
          <p className="text-xs text-slate-300">
            Assigned Unit: {driverJeepney?.unitName || assignedJeepneyId} · Plate{' '}
            {driverJeepney?.plateNumber || user.plateNumber || 'Pending'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['online', 'offline', 'gps_unavailable'] as const).map((st) => (
            <button
              key={st}
              type="button"
              disabled={Boolean(activeTrip) || !assignedJeepneyId}
              onClick={() => handleManualStatusChange(st)}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40 ${
                currentStatus === st
                  ? 'bg-teal-600 border-teal-500 text-white'
                  : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/15'
              }`}
            >
              {st === 'online' ? 'Online' : st === 'offline' ? 'Offline' : 'GPS Unavailable'}
            </button>
          ))}
        </div>
      </section>

      {gpsError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">GPS / Trip Alert</p>
            <p className="text-xs mt-0.5">{gpsError}</p>
          </div>
        </div>
      )}

      {/* Main Controls + Live Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-base font-bold text-[#0F1E36]">Trip Control (Cloud Firestore)</h2>

            <div className="space-y-1.5">
              <label htmlFor="driver-route-select" className="block text-xs font-semibold text-slate-600">
                Select Operating Route
              </label>
              <select
                id="driver-route-select"
                disabled={Boolean(activeTrip)}
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 disabled:bg-slate-50"
              >
                {routes.map((r) => (
                  <option key={r.routeId} value={r.routeId}>
                    {r.code} — {r.routeName}
                  </option>
                ))}
              </select>
            </div>

            {!activeTrip ? (
              <button
                type="button"
                disabled={busyAction || !assignedJeepneyId}
                onClick={handleStartTrip}
                className="w-full min-h-[50px] rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm"
              >
                <Navigation className="w-4 h-4" />
                {gpsStatus === 'requesting' ? 'Requesting GPS Fix...' : 'Start Trip & Share GPS'}
              </button>
            ) : (
              <button
                type="button"
                disabled={busyAction}
                onClick={handleEndTrip}
                className="w-full min-h-[50px] rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm"
              >
                <Square className="w-4 h-4" />
                End Trip &amp; Stop GPS
              </button>
            )}

            {/* GPS Telemetry Readout */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  {gpsStatus === 'tracking' ? (
                    <Radio className="w-4 h-4 text-teal-600" />
                  ) : gpsStatus === 'error' ? (
                    <WifiOff className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Compass className="w-4 h-4 text-slate-400" />
                  )}
                  GPS Telemetry
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {uploadState === 'synced'
                    ? 'Firestore Synced (~5s)'
                    : uploadState === 'syncing'
                      ? 'Syncing...'
                      : uploadState === 'error'
                        ? 'Sync Error'
                        : 'Standby'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 font-mono-tabular">
                <div>
                  <p className="text-[11px] text-slate-500">Latitude</p>
                  <p className="text-sm font-bold text-slate-900">
                    {lastCoords ? lastCoords.latitude.toFixed(6) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Longitude</p>
                  <p className="text-sm font-bold text-slate-900">
                    {lastCoords ? lastCoords.longitude.toFixed(6) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">GPS Accuracy</p>
                  <p className="text-sm font-bold text-slate-900">
                    {lastCoords?.accuracy != null ? `±${Math.round(lastCoords.accuracy)} m` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Last Uploaded</p>
                  <p className="text-sm font-bold text-slate-900">
                    {lastUploadAt ? formatRelativeTime(lastUploadAt) : '—'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Browser GPS tracking runs only while this tab remains active in the foreground. Web browsers cannot guarantee continuous background GPS if the screen is locked or the tab is closed.
            </p>
          </div>

          {/* Fleet Admin Unit Assignment (Admin Email Only) */}
          {isAdmin && (
            <form
              onSubmit={handleAssignDriverSubmit}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
            >
              <h3 className="text-sm font-bold text-[#0F1E36]">Fleet Admin: Assign Driver Unit</h3>
              <p className="text-xs text-slate-500">
                Authorize another user&apos;s Firebase UID as a driver or provision an additional jeepney unit in Firestore.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  value={assignUid}
                  onChange={(e) => setAssignUid(e.target.value)}
                  placeholder="Target Driver Firebase UID"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono-tabular"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={assignName}
                    onChange={(e) => setAssignName(e.target.value)}
                    placeholder="Driver Name"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={assignJeepId}
                    onChange={(e) => setAssignJeepId(e.target.value)}
                    placeholder="JEEP-204"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono-tabular"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={assignPlate}
                    onChange={(e) => setAssignPlate(e.target.value)}
                    placeholder="Plate Number"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={assignUnitName}
                    onChange={(e) => setAssignUnitName(e.target.value)}
                    placeholder="Unit Label"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>
              {adminMessage && (
                <p className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-xl p-2.5">
                  {adminMessage}
                </p>
              )}
              <button
                type="submit"
                className="w-full min-h-[40px] rounded-xl bg-[#0F1E36] hover:bg-slate-800 text-white text-xs font-semibold"
              >
                Assign Driver in Firestore
              </button>
            </form>
          )}
        </div>

        {/* Driver Map Preview + Trip Log */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F1E36]">Live Broadcast Preview</h2>
              <span className="text-xs text-slate-500">
                {selectedRoute?.code} · {activeTrip ? `Trip ${activeTrip.tripId}` : 'No active trip'}
              </span>
            </div>
            <LeafletMap
              jeepneys={driverJeepney && driverJeepney.isActive ? [driverJeepney] : []}
              selectedRoute={selectedRoute}
              selectedJeepneyId={driverJeepney?.jeepneyId}
              userLocation={lastCoords}
              centerOverride={lastCoords ? [lastCoords.latitude, lastCoords.longitude] : null}
              zoomOverride={lastCoords ? 15 : undefined}
              heightClass="h-[300px] sm:h-[360px]"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#0F1E36]">Recent Driver Trips</h2>
            {trips.length === 0 ? (
              <p className="text-xs text-slate-500">
                No trips logged yet for {assignedJeepneyId}. Press Start Trip when ready to depart.
              </p>
            ) : (
              <div className="space-y-2">
                {trips.map((trip) => {
                  const route = routes.find((r) => r.routeId === trip.routeId);
                  return (
                    <div
                      key={trip.tripId}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            trip.status === 'active' ? 'text-teal-600' : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {route?.routeName || trip.routeId}
                          </p>
                          <p className="text-xs text-slate-500 font-mono-tabular">
                            {trip.tripId} · Started {formatRelativeTime(trip.startedAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                          trip.status === 'active'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {trip.status === 'active' ? 'Active' : 'Completed'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
