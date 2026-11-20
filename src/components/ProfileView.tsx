import { Clock, LogOut, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { formatRelativeTime, signInWithGoogle } from '../lib/firebaseService.ts';
import type { JeepneyRoute, PassengerCategory, UserProfile } from '../shared/types.ts';

interface ProfileViewProps {
  user: UserProfile | null;
  routes: JeepneyRoute[];
  isSimulationActive: boolean;
  onToggleSimulation: () => void;
  onLogout: () => void;
  onToggleFavorite: (routeId: string) => void;
  onDeleteJourney: (journeyId: string) => void;
  onChangeCategory: (cat: PassengerCategory) => void;
  onOpenRouteMap: (routeId: string) => void;
  onSwitchToDriverMode: () => void;
}

export function ProfileView({
  user,
  routes,
  isSimulationActive,
  onToggleSimulation,
  onLogout,
  onToggleFavorite,
  onDeleteJourney,
  onChangeCategory,
  onOpenRouteMap,
  onSwitchToDriverMode,
}: ProfileViewProps) {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In failed. Ensure popups are allowed for this window.',
      );
    } finally {
      setSigningIn(false);
    }
  };

  const favoriteRoutes = routes.filter((r) => user?.favoriteRouteIds.includes(r.routeId));

  return (
    <div className="space-y-5">
      {/* Firebase Account Section */}
      <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0F1E36] text-white font-bold text-lg flex items-center justify-center shrink-0">
                {user.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#0F1E36]">{user.name}</h1>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      user.role === 'driver'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {user.role === 'driver' ? `Authorized Driver (${user.jeepneyId})` : 'Passenger Account'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5 truncate">{user.email}</p>
                <p className="text-[11px] font-mono-tabular text-slate-400 mt-0.5 truncate">
                  UID: {user.uid}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user.role === 'driver' && (
                <button
                  type="button"
                  onClick={onSwitchToDriverMode}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                >
                  Open Driver Console
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700">
                <ShieldCheck className="w-4 h-4" />
                Firebase Authentication &amp; Cloud Firestore
              </div>
              <h1 className="text-2xl font-bold text-[#0F1E36]">
                Sign in with Google to sync live jeepney GPS &amp; saved routes
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Signing in connects your commuter profile to Cloud Firestore for live participating jeepney updates, saved favorite routes, and journey history.
              </p>
              {authError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  {authError}
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={signingIn}
              onClick={handleGoogleSignIn}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#0F1E36] hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold whitespace-nowrap shrink-0 shadow-sm"
            >
              {signingIn ? 'Connecting Google...' : 'Continue with Google'}
            </button>
          </div>
        )}
      </section>

      {/* Favorite Routes & Recent Journeys */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F1E36] flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Favorite Routes
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">{favoriteRoutes.length} saved</span>
          </div>

          {!user ? (
            <p className="text-sm text-slate-500 py-3">
              Sign in with Google above to save and sync your favorite commuter corridors in Cloud Firestore.
            </p>
          ) : favoriteRoutes.length === 0 ? (
            <p className="text-sm text-slate-500 py-3">
              No favorite routes saved yet. Tap the star icon on any route to pin it here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {favoriteRoutes.map((route) => (
                <div
                  key={route.routeId}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-teal-700">{route.code}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{route.routeName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenRouteMap(route.routeId)}
                      className="min-h-[40px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(route.routeId)}
                      className="min-h-[40px] px-3 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F1E36] flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-700" />
              Recent Journeys
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {user?.recentJourneys.length ?? 0} logged
            </span>
          </div>

          {!user || user.recentJourneys.length === 0 ? (
            <p className="text-sm text-slate-500 py-3">
              Complete a tracked or simulated journey in the Journey tab to record it in Firestore.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {user.recentJourneys.map((j) => (
                <div
                  key={j.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{j.destinationStop}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {j.routeName} · {j.mode === 'simulated_journey' ? 'Simulated Demo' : 'Live Tracker'} ·{' '}
                      {formatRelativeTime(j.timestamp)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteJourney(j.id)}
                    aria-label={`Delete journey to ${j.destinationStop}`}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Settings */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-[#0F1E36]">Commuter Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">5-Jeepney Demo Simulation</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Show 5 simulated DEMO units on the Live Map when no real drivers are on trip.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleSimulation}
              className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold shrink-0 ${
                isSimulationActive
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {isSimulationActive ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Default Fare Category</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Applied across Route Explorer and Sample Fare Guide.
              </p>
            </div>
            <select
              aria-label="Default fare category"
              value={user?.passengerCategory || 'regular'}
              onChange={(e) => onChangeCategory(e.target.value as PassengerCategory)}
              className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900"
            >
              <option value="regular">Regular</option>
              <option value="student">Student (20% off)</option>
              <option value="senior">Senior (20% off)</option>
              <option value="pwd">PWD (20% off)</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
