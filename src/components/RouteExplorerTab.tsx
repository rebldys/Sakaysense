import { Map as MapIcon, Navigation, Star } from 'lucide-react';
import { useMemo } from 'react';
import { formatRelativeTime } from '../lib/firebaseService.ts';
import { calculateSampleFare } from '../shared/routesData.ts';
import type {
  JeepneyRoute,
  PassengerCategory,
  PublicJeepneyState,
  UserProfile,
} from '../shared/types.ts';

interface RouteExplorerTabProps {
  user: UserProfile | null;
  routes: JeepneyRoute[];
  liveJeepneys: PublicJeepneyState[];
  simulatedJeepneys: PublicJeepneyState[];
  isSimulationActive: boolean;
  selectedRouteId: string | null;
  onSelectRouteId: (routeId: string) => void;
  onOpenOnMap: (routeId: string) => void;
  onTrackJourney: (routeId: string) => void;
  onToggleFavorite: (routeId: string) => void;
}

export function RouteExplorerTab({
  user,
  routes,
  liveJeepneys,
  simulatedJeepneys,
  isSimulationActive,
  selectedRouteId,
  onSelectRouteId,
  onOpenOnMap,
  onTrackJourney,
  onToggleFavorite,
}: RouteExplorerTabProps) {
  const activeRoute = useMemo(
    () => routes.find((r) => r.routeId === selectedRouteId) ?? routes[0] ?? null,
    [routes, selectedRouteId],
  );

  const passengerCategory: PassengerCategory = user?.passengerCategory || 'regular';

  const operatingVehicles = useMemo(() => {
    if (!activeRoute) return [];
    const real = liveJeepneys.filter(
      (j) => j.isActive && !j.isSimulated && j.routeId === activeRoute.routeId,
    );
    const demo = isSimulationActive
      ? simulatedJeepneys.filter((j) => j.isActive && j.routeId === activeRoute.routeId)
      : [];
    return [...real, ...demo];
  }, [activeRoute, liveJeepneys, simulatedJeepneys, isSimulationActive]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <h1 className="text-xl font-bold text-[#0F1E36]">Route Explorer</h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect jeepney corridors, intermediate stops, and participating vehicles currently operating on each route.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Route Directory List */}
        <div className="lg:col-span-5 space-y-2.5">
          {routes.map((route) => {
            const isSelected = activeRoute?.routeId === route.routeId;
            const realCount = liveJeepneys.filter(
              (j) => j.isActive && !j.isSimulated && j.routeId === route.routeId,
            ).length;
            const demoCount = isSimulationActive
              ? simulatedJeepneys.filter((j) => j.routeId === route.routeId).length
              : 0;

            return (
              <button
                key={route.routeId}
                type="button"
                onClick={() => onSelectRouteId(route.routeId)}
                className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                  isSelected
                    ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-teal-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={isSelected ? 'text-teal-300 font-semibold' : 'text-teal-700 font-semibold'}>
                    {route.code} · {route.vehicleClass === 'modernized' ? 'Modernized E-Jeep' : 'Traditional'}
                  </span>
                  <span className={`tabular-nums ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {route.distanceKm} km · ~{route.estimatedMinutes} min
                  </span>
                </div>
                <h2 className="font-bold text-base mt-1">{route.routeName}</h2>
                <p className={`text-xs mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                  {route.origin} to {route.destination}
                </p>
                <div className={`text-xs mt-2 font-medium ${isSelected ? 'text-teal-200' : 'text-slate-500'}`}>
                  {realCount} Live GPS{demoCount > 0 ? ` · ${demoCount} DEMO` : ''}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Route Details */}
        {activeRoute && (
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-teal-700">
                  {activeRoute.code} · {activeRoute.stops.length} Designated Stops
                </p>
                <h2 className="text-2xl font-bold text-[#0F1E36] mt-1">{activeRoute.routeName}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {activeRoute.origin} &rarr; {activeRoute.destination}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(activeRoute.routeId)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 self-start shrink-0"
              >
                <Star
                  className={`w-4 h-4 ${
                    user?.favoriteRouteIds.includes(activeRoute.routeId)
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-slate-400'
                  }`}
                />
                {user?.favoriteRouteIds.includes(activeRoute.routeId) ? 'Saved Route' : 'Save Route'}
              </button>
            </div>

            {/* Route Quick Stats */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs text-slate-500">End-to-End</p>
                <p className="text-base font-bold text-slate-900 tabular-nums">
                  {activeRoute.distanceKm} km
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Est. Travel</p>
                <p className="text-base font-bold text-slate-900 tabular-nums">
                  {activeRoute.estimatedMinutes} min
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Sample Max Fare</p>
                <p className="text-base font-bold text-teal-700 tabular-nums">
                  ₱{calculateSampleFare(activeRoute.distanceKm, activeRoute.vehicleClass, passengerCategory).appliedFare.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Intermediate Stops Timeline */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#0F1E36]">Route Stops & Landmarks</h3>
              <ol className="space-y-3">
                {activeRoute.stops.map((stop, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === activeRoute.stops.length - 1;
                  return (
                    <li key={stop.stopId} className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <span
                          className={`w-3 h-3 rounded-full border-2 ${
                            isFirst || isLast
                              ? 'bg-[#0F1E36] border-[#0F1E36]'
                              : 'bg-white border-teal-600'
                          }`}
                        />
                        {!isLast && <span className="w-0.5 h-6 bg-slate-200 mt-1" />}
                      </div>
                      <div className="flex-1 flex items-baseline justify-between gap-2 pb-1">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{stop.name}</p>
                          <p className="text-xs text-slate-500">{stop.landmark}</p>
                        </div>
                        <span className="text-xs font-mono-tabular text-slate-400 shrink-0">
                          {stop.kmFromOrigin.toFixed(1)} km
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Operating Vehicles on this Route */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-[#0F1E36]">
                Operating Vehicles on {activeRoute.code}
              </h3>
              {operatingVehicles.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No real GPS drivers or simulated demo units are currently running on this route.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {operatingVehicles.map((v) => (
                    <div
                      key={v.jeepneyId}
                      className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900">{v.jeepneyId}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              v.isSimulated
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {v.isSimulated ? 'DEMO' : 'LIVE GPS'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Plate {v.plateNumber}</p>
                      </div>
                      <span className="text-xs font-mono-tabular text-slate-500">
                        {formatRelativeTime(v.lastUpdated)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenOnMap(activeRoute.routeId)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <MapIcon className="w-4 h-4" />
                View on Live Map
              </button>
              <button
                type="button"
                onClick={() => onTrackJourney(activeRoute.routeId)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F1E36] hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Start Journey Tracker
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
