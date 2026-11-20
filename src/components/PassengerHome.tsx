import { ArrowRight, Compass, MapPin, Navigation, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { JeepneyRoute, PublicJeepneyState, UserProfile } from '../shared/types.ts';

interface PassengerHomeProps {
  user: UserProfile | null;
  routes: JeepneyRoute[];
  liveJeepneys: PublicJeepneyState[];
  simulatedJeepneys: PublicJeepneyState[];
  isSimulationActive: boolean;
  onToggleSimulation: () => void;
  onOpenMap: (routeId?: string) => void;
  onOpenRouteExplorer: (routeId?: string) => void;
  onStartJourney: (routeId: string) => void;
  onToggleFavorite: (routeId: string) => void;
}

export function PassengerHome({
  user,
  routes,
  liveJeepneys,
  simulatedJeepneys,
  isSimulationActive,
  onToggleSimulation,
  onOpenMap,
  onOpenRouteExplorer,
  onStartJourney,
  onToggleFavorite,
}: PassengerHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [heroImageError, setHeroImageError] = useState(false);

  const activeRealCount = useMemo(
    () => liveJeepneys.filter((j) => j.isActive && !j.isSimulated).length,
    [liveJeepneys],
  );

  const matchingRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.routeName.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.stops.some((s) => s.name.toLowerCase().includes(q) || s.landmark.toLowerCase().includes(q)),
    );
  }, [routes, searchQuery]);

  const recentRoutes = useMemo(() => {
    const ids = user?.recentRouteIds?.length ? user.recentRouteIds : ['R-KAT-UPD', 'R-PHI-ESP'];
    return ids
      .map((id) => routes.find((r) => r.routeId === id))
      .filter((r): r is JeepneyRoute => Boolean(r));
  }, [routes, user]);

  const countUnitsOnRoute = (routeId: string) => {
    const real = liveJeepneys.filter((j) => j.isActive && j.routeId === routeId).length;
    const demo = isSimulationActive
      ? simulatedJeepneys.filter((j) => j.isActive && j.routeId === routeId).length
      : 0;
    return { real, demo };
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome + Quick Map Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-[#0F1E36] text-white rounded-3xl p-5 sm:p-7 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-medium text-teal-300 tracking-wide">
              SakaySense Commuter Companion
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-balance">
              {user ? `Magandang araw, ${user.name.split(' ')[0]}.` : 'Locate participating jeepneys in real time.'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Track participating drivers using verified browser GPS, explore Metro Manila jeepney corridors, and set destination alerts before you ride.
            </p>
          </div>

          {/* Search Destination Bar */}
          <div className="mt-5 space-y-3">
            <label htmlFor="home-destination-search" className="sr-only">
              Search destination, stop, or route
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                id="home-destination-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destination (e.g., UP Diliman, Quiapo, Cubao, MOA)..."
                className="w-full h-12 pl-10 pr-24 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onOpenMap()}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Navigation className="w-4 h-4" />
                Open Live Map
              </button>
              <button
                type="button"
                onClick={onToggleSimulation}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  isSimulationActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                }`}
              >
                {isSimulationActive ? 'Stop Demo Simulation' : 'Start 5-Jeepney Demo'}
              </button>
            </div>
          </div>
        </div>

        {/* Visual Transit Card */}
        <div className="lg:col-span-5 rounded-3xl overflow-hidden border border-slate-200 bg-white flex flex-col">
          <div className="relative h-48 lg:h-52 bg-slate-900 overflow-hidden">
            {!heroImageError ? (
              <img
                src="/src/assets/images/sakaysense_jeepney_hero_1795200209897.jpg"
                alt="Modern Filipino electric jeepney along a sunlit Metro Manila transit corridor"
                referrerPolicy="no-referrer"
                onError={() => setHeroImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0F1E36] to-teal-800 flex items-center justify-center">
                <Compass className="w-12 h-12 text-teal-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E36]/85 via-[#0F1E36]/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
              <div>
                <p className="text-xs text-teal-300 font-medium">Live Network Telemetry</p>
                <p className="text-lg font-bold tabular-nums">
                  {activeRealCount} {activeRealCount === 1 ? 'Live GPS Jeepney' : 'Live GPS Jeepneys'}
                </p>
              </div>
              {isSimulationActive && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500 text-white">
                  5 DEMO Active
                </span>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 grid grid-cols-2 gap-4 bg-white flex-1 items-center">
            <div>
              <p className="text-xs text-slate-500">Real GPS Drivers</p>
              <p className="text-2xl font-bold text-[#0F1E36] tabular-nums mt-0.5">
                {activeRealCount}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeRealCount === 0 ? 'No real drivers on trip yet' : 'Verified live coordinates'}
              </p>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <p className="text-xs text-slate-500">Demo Vehicles</p>
              <p className="text-2xl font-bold text-amber-600 tabular-nums mt-0.5">
                {isSimulationActive ? simulatedJeepneys.length : 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSimulationActive ? 'Simulated DEMO routes' : 'Simulation paused'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Used Routes */}
      {!searchQuery && recentRoutes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F1E36]">Recently Used Routes</h2>
            <button
              type="button"
              onClick={() => onOpenRouteExplorer()}
              className="text-sm font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 min-h-[40px]"
            >
              All Routes
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentRoutes.map((route) => {
              const counts = countUnitsOnRoute(route.routeId);
              return (
                <div
                  key={route.routeId}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4 hover:border-teal-300 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-[#0F1E36]">{route.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{route.vehicleClass === 'modernized' ? 'Modernized E-Jeep' : 'Traditional'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{route.estimatedMinutes} min</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 truncate">{route.routeName}</h3>
                    <p className="text-xs text-slate-600 truncate">
                      {counts.real > 0
                        ? `${counts.real} Live GPS`
                        : '0 Live GPS'}
                      {counts.demo > 0 ? ` · ${counts.demo} DEMO` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenMap(route.routeId)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold whitespace-nowrap"
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartJourney(route.routeId)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1E36] hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap"
                    >
                      Track
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Nearby / Matching Jeepney Routes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0F1E36]">
              {searchQuery ? `Matching Routes (${matchingRoutes.length})` : 'Nearby Metro Manila Jeepney Routes'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tap a corridor to inspect stops, active jeepneys, or start a guided journey.
            </p>
          </div>
        </div>

        {matchingRoutes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-800">No routes matched &ldquo;{searchQuery}&rdquo;</p>
            <p className="text-sm text-slate-500">
              Try searching for Katipunan, UP Diliman, Quiapo, España, Cubao, Divisoria, MOA, or Monumento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchingRoutes.map((route) => {
              const counts = countUnitsOnRoute(route.routeId);
              const isFav = user?.favoriteRouteIds.includes(route.routeId) ?? false;
              return (
                <article
                  key={route.routeId}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-4 hover:border-teal-400 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-teal-700">{route.code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{route.stops.length} stops</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{route.distanceKm} km</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(route.routeId)}
                        aria-label={isFav ? `Remove ${route.routeName} from favorites` : `Save ${route.routeName} to favorites`}
                        className="min-w-[40px] min-h-[40px] -mt-1 -mr-1 flex items-center justify-center rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-50"
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {route.routeName}
                    </h3>

                    <p className="text-xs text-slate-600">
                      {route.origin} to {route.destination}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-xs font-medium">
                      {counts.real > 0 ? (
                        <span className="text-teal-700">{counts.real} Live GPS</span>
                      ) : (
                        <span className="text-slate-400">0 Live GPS</span>
                      )}
                      {counts.demo > 0 && (
                        <span className="text-amber-600 ml-2">· {counts.demo} DEMO</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenRouteExplorer(route.routeId)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Stops
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenMap(route.routeId)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        Live Map
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
