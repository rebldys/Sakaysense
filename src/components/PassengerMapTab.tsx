import { Crosshair, Play, Radio, Square, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatRelativeTime } from '../lib/firebaseService.ts';
import type { JeepneyRoute, PublicJeepneyState } from '../shared/types.ts';
import { LeafletMap } from './LeafletMap.tsx';

interface PassengerMapTabProps {
  routes: JeepneyRoute[];
  liveJeepneys: PublicJeepneyState[];
  simulatedJeepneys: PublicJeepneyState[];
  isSimulationActive: boolean;
  onToggleSimulation: () => void;
  selectedRouteId: string | null;
  onSelectRouteId: (routeId: string | null) => void;
  sseConnected: boolean;
}

export function PassengerMapTab({
  routes,
  liveJeepneys,
  simulatedJeepneys,
  isSimulationActive,
  onToggleSimulation,
  selectedRouteId,
  onSelectRouteId,
  sseConnected,
}: PassengerMapTabProps) {
  const [selectedJeepneyId, setSelectedJeepneyId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.routeId === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  // Merge active real GPS vehicles + (if enabled) DEMO simulated vehicles
  const displayedJeepneys = useMemo(() => {
    const activeReal = liveJeepneys.filter((j) => j.isActive && !j.isSimulated);
    const activeDemo = isSimulationActive ? simulatedJeepneys : [];
    const combined = [...activeReal, ...activeDemo];
    if (!selectedRouteId) return combined;
    return combined.filter((j) => j.routeId === selectedRouteId);
  }, [liveJeepneys, simulatedJeepneys, isSimulationActive, selectedRouteId]);

  const activeRealCount = useMemo(
    () => displayedJeepneys.filter((j) => !j.isSimulated).length,
    [displayedJeepneys],
  );
  const activeDemoCount = useMemo(
    () => displayedJeepneys.filter((j) => j.isSimulated).length,
    [displayedJeepneys],
  );

  const selectedJeepney = useMemo(
    () => displayedJeepneys.find((j) => j.jeepneyId === selectedJeepneyId) ?? null,
    [displayedJeepneys, selectedJeepneyId],
  );

  const handleRequestUserLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        };
        setUserLocation(coords);
        setMapCenter([coords.latitude, coords.longitude]);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Enable browser location to see your pin.');
        } else {
          setLocationError('Unable to determine your current location right now.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-4">
      {/* Map Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F1E36]">Live Jeepney Map</h1>
            <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-teal-700 font-semibold">
                <Radio className="w-3.5 h-3.5" />
                {activeRealCount} Live GPS
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-700 font-semibold">
                {activeDemoCount} DEMO Simulated
              </span>
              <span aria-hidden="true">·</span>
              <span>{sseConnected ? 'Firestore live sync active' : 'Sign in for live Firestore GPS'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRequestUserLocation}
              disabled={locating}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Crosshair className="w-4 h-4 text-blue-600" />
              {locating ? 'Locating...' : userLocation ? 'Update My Pin' : 'My Location'}
            </button>

            <button
              type="button"
              onClick={onToggleSimulation}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                isSimulationActive
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-[#0F1E36] hover:bg-slate-800 text-white'
              }`}
            >
              {isSimulationActive ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Stop Demo Mode
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Start Demo Mode
                </>
              )}
            </button>
          </div>
        </div>

        {/* Route Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              onSelectRouteId(null);
              setMapCenter(null);
            }}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              selectedRouteId === null
                ? 'bg-[#0F1E36] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Routes
          </button>
          {routes.map((route) => (
            <button
              key={route.routeId}
              type="button"
              onClick={() => {
                onSelectRouteId(route.routeId);
                setMapCenter(null);
              }}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedRouteId === route.routeId
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {route.code}
            </button>
          ))}
        </div>

        {locationError && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {locationError}
          </p>
        )}
      </div>

      {/* Map + Info Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 relative">
          <LeafletMap
            jeepneys={displayedJeepneys}
            selectedRoute={selectedRoute}
            selectedJeepneyId={selectedJeepneyId}
            userLocation={userLocation}
            centerOverride={mapCenter}
            heightClass="h-[380px] sm:h-[520px]"
            onSelectJeepney={(j) => {
              setSelectedJeepneyId(j.jeepneyId);
              if (j.routeId && !selectedRouteId) {
                onSelectRouteId(j.routeId);
              }
            }}
          />

          {/* Map Legend Bar */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-teal-600 inline-block" />
                <span className="font-medium text-slate-800">Actual Driver GPS</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-600 inline-block" />
                <span className="font-medium text-slate-800">DEMO Simulated Unit</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                <span>Your Pin</span>
              </span>
            </div>
            <span>OpenStreetMap · Tap any marker for telemetry</span>
          </div>
        </div>

        {/* Selected Vehicle Info Card + Active List */}
        <div className="lg:col-span-4 space-y-4">
          {selectedJeepney ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      selectedJeepney.isSimulated
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {selectedJeepney.isSimulated ? 'DEMO · Simulated Vehicle' : 'LIVE GPS · Real Driver'}
                  </span>
                  <h2 className="text-lg font-bold text-[#0F1E36] mt-1.5">
                    {selectedJeepney.jeepneyId}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedJeepney.unitName} · Plate {selectedJeepney.plateNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJeepneyId(null)}
                  aria-label="Close vehicle details"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Assigned Route</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {routes.find((r) => r.routeId === selectedJeepney.routeId)?.routeName ||
                      selectedJeepney.routeId ||
                      'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Last GPS Update</span>
                  <span className="font-mono-tabular text-slate-900">
                    {formatRelativeTime(selectedJeepney.lastUpdated)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="font-mono-tabular text-xs text-slate-700">
                    {selectedJeepney.latitude?.toFixed(5)}, {selectedJeepney.longitude?.toFixed(5)}
                  </span>
                </div>
                {selectedJeepney.accuracy !== null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">GPS Accuracy</span>
                    <span className="font-mono-tabular text-slate-900">
                      ±{Math.round(selectedJeepney.accuracy)} m
                    </span>
                  </div>
                )}
                {selectedJeepney.speedKmh !== null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Est. Speed</span>
                    <span className="font-mono-tabular text-slate-900">
                      {selectedJeepney.speedKmh} km/h
                    </span>
                  </div>
                )}
              </div>

              {selectedJeepney.isSimulated && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-xl p-2.5">
                  Demonstration vehicle moving along sample route geometry. Not a real driver GPS feed.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
              Tap a jeepney marker on the map or choose a unit below to inspect its route and last GPS update.
            </div>
          )}

          {/* Participating Units List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-bold text-[#0F1E36]">
              Visible Units ({displayedJeepneys.length})
            </h3>
            {displayedJeepneys.length === 0 ? (
              <div className="py-4 text-xs text-slate-500 space-y-2">
                <p>
                  No active GPS drivers are currently on trip{selectedRoute ? ` for ${selectedRoute.code}` : ''}.
                </p>
                {!isSimulationActive && (
                  <button
                    type="button"
                    onClick={onToggleSimulation}
                    className="text-teal-700 font-semibold hover:underline"
                  >
                    Turn on 5-Jeepney Demo Simulation to preview moving markers
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {displayedJeepneys.map((j) => {
                  const route = routes.find((r) => r.routeId === j.routeId);
                  const isSelected = j.jeepneyId === selectedJeepneyId;
                  return (
                    <button
                      key={j.jeepneyId}
                      type="button"
                      onClick={() => {
                        setSelectedJeepneyId(j.jeepneyId);
                        if (j.latitude != null && j.longitude != null) {
                          setMapCenter([j.latitude, j.longitude]);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 min-h-[56px] ${
                        isSelected
                          ? 'border-[#0F1E36] bg-slate-50'
                          : 'border-slate-100 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{j.jeepneyId}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              j.isSimulated
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {j.isSimulated ? 'DEMO' : 'LIVE GPS'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {route?.code || 'No route'} · {j.plateNumber}
                        </p>
                      </div>
                      <span className="text-xs font-mono-tabular text-slate-500 shrink-0">
                        {formatRelativeTime(j.lastUpdated)}
                      </span>
                    </button>
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
