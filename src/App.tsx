import {
  Bus,
  Compass,
  Home,
  Map as MapIcon,
  Navigation,
  Receipt,
  Route as RouteIcon,
  User as UserIcon,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { DriverPortal } from './components/DriverPortal.tsx';
import { FareGuideTab } from './components/FareGuideTab.tsx';
import { JourneyTrackerTab } from './components/JourneyTrackerTab.tsx';
import { PassengerHome } from './components/PassengerHome.tsx';
import { PassengerMapTab } from './components/PassengerMapTab.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { RouteExplorerTab } from './components/RouteExplorerTab.tsx';
import { auth } from './firebase.ts';
import {
  deleteUserJourney,
  ensureUserProfileAndAdminSeeds,
  recordUserJourney,
  signInWithGoogle,
  signOutAccount,
  subscribeActiveJeepneys,
  subscribePublicRoutes,
  subscribeUserJourneys,
  updateUserPreferences,
} from './lib/firebaseService.ts';
import { advanceSimulationStep, createInitialSimProgress } from './lib/simulation.ts';
import { JEEPNEY_ROUTES, createInitialSimulatedVehicles } from './shared/routesData.ts';
import type {
  JeepneyRoute,
  PassengerCategory,
  PublicJeepneyState,
  RecentJourneyEntry,
  UserProfile,
} from './shared/types.ts';

type AppMode = 'passenger' | 'driver';
type PassengerTab = 'home' | 'map' | 'routes' | 'journey' | 'fare' | 'profile';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('passenger');
  const [activeTab, setActiveTab] = useState<PassengerTab>('home');

  const [routes, setRoutes] = useState<JeepneyRoute[]>(JEEPNEY_ROUTES);
  const [liveJeepneys, setLiveJeepneys] = useState<PublicJeepneyState[]>([]);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [journeys, setJourneys] = useState<RecentJourneyEntry[]>([]);
  const [guestCategory, setGuestCategory] = useState<PassengerCategory>('regular');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // 5-jeepney DEMO simulation state (strictly separate from real GPS drivers)
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(true);
  const [, setSimProgress] = useState(() => createInitialSimProgress());
  const [simulatedJeepneys, setSimulatedJeepneys] = useState<PublicJeepneyState[]>(() =>
    createInitialSimulatedVehicles(),
  );

  // Firebase Auth listener + gated Firestore onSnapshot subscriptions
  useEffect(() => {
    let unsubRoutes: (() => void) | null = null;
    let unsubJeepneys: (() => void) | null = null;
    let unsubJourneys: (() => void) | null = null;

    const cleanupFirestoreListeners = () => {
      unsubRoutes?.();
      unsubJeepneys?.();
      unsubJourneys?.();
      unsubRoutes = null;
      unsubJeepneys = null;
      unsubJourneys = null;
    };

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupFirestoreListeners();

      if (!firebaseUser) {
        setUser(null);
        setJourneys([]);
        setLiveJeepneys([]);
        setRoutes(JEEPNEY_ROUTES);
        setAuthReady(true);
        return;
      }

      try {
        const profile = await ensureUserProfileAndAdminSeeds();
        setUser(profile);
        setAuthError(null);

        // Only attach onSnapshot listeners once auth is ready & user is authenticated
        unsubRoutes = subscribePublicRoutes((loaded) => setRoutes(loaded));
        unsubJeepneys = subscribeActiveJeepneys((loaded) => setLiveJeepneys(loaded));
        unsubJourneys = subscribeUserJourneys(profile.uid, (loaded) => setJourneys(loaded));
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : 'Unable to sync Firebase user profile.',
        );
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      cleanupFirestoreListeners();
      unsubAuth();
    };
  }, []);

  // DEMO simulation animation tick
  useEffect(() => {
    if (!isSimulationActive) return;

    const timer = window.setInterval(() => {
      setSimProgress((prev) => {
        const { nextProgress, vehicles } = advanceSimulationStep(prev, 1.2);
        setSimulatedJeepneys(vehicles);
        return nextProgress;
      });
    }, 1200);

    return () => window.clearInterval(timer);
  }, [isSimulationActive]);

  const userWithJourneys: UserProfile | null = user
    ? { ...user, recentJourneys: journeys }
    : null;

  const handleToggleFavorite = useCallback(
    async (routeId: string) => {
      if (!user) {
        setActiveTab('profile');
        return;
      }
      const exists = user.favoriteRouteIds.includes(routeId);
      const nextFavs = exists
        ? user.favoriteRouteIds.filter((id) => id !== routeId)
        : [...user.favoriteRouteIds, routeId];

      setUser({ ...user, favoriteRouteIds: nextFavs });
      await updateUserPreferences(user.uid, { favoriteRouteIds: nextFavs });
    },
    [user],
  );

  const handleChangeCategory = useCallback(
    async (category: PassengerCategory) => {
      setGuestCategory(category);
      if (!user) return;
      setUser({ ...user, passengerCategory: category });
      await updateUserPreferences(user.uid, { passengerCategory: category });
    },
    [user],
  );

  const handleRecordJourney = useCallback(
    async (routeId: string, destinationStop: string, mode: 'live' | 'simulated_journey') => {
      if (!user) return;
      await recordUserJourney(user.uid, routeId, destinationStop, mode, user.recentRouteIds);
      const nextRecent = [routeId, ...user.recentRouteIds.filter((r) => r !== routeId)].slice(0, 8);
      setUser((prev) => (prev ? { ...prev, recentRouteIds: nextRecent } : prev));
    },
    [user],
  );

  const handleDeleteJourney = useCallback(
    async (journeyId: string) => {
      if (!user) return;
      await deleteUserJourney(user.uid, journeyId);
    },
    [user],
  );

  const handleLogout = async () => {
    await signOutAccount();
  };

  const openMapForRoute = (routeId?: string) => {
    if (routeId) setSelectedRouteId(routeId);
    setAppMode('passenger');
    setActiveTab('map');
  };

  const openExplorerForRoute = (routeId?: string) => {
    if (routeId) setSelectedRouteId(routeId);
    setAppMode('passenger');
    setActiveTab('routes');
  };

  const openJourneyForRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setAppMode('passenger');
    setActiveTab('journey');
  };

  const passengerCategory = user?.passengerCategory || guestCategory;

  const navItems: { id: PassengerTab; label: string; shortLabel: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', shortLabel: 'Home', icon: Home },
    { id: 'map', label: 'Live Map', shortLabel: 'Map', icon: MapIcon },
    { id: 'routes', label: 'Routes', shortLabel: 'Routes', icon: RouteIcon },
    { id: 'journey', label: 'Journey', shortLabel: 'Journey', icon: Navigation },
    { id: 'fare', label: 'Fare Guide', shortLabel: 'Fare', icon: Receipt },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Top Bar (Strict 3-zone contract) */}
        <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
            {/* Zone 1: Single-line Brand Wordmark */}
            <button
              type="button"
              onClick={() => {
                setAppMode('passenger');
                setActiveTab('home');
              }}
              className="text-lg font-extrabold tracking-tight text-[#0F1E36] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg"
            >
              SakaySense
            </button>

            {/* Zone 2: Desktop Single-Line Navigation Links */}
            <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
              {appMode === 'passenger' ? (
                navItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`text-sm font-semibold whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                        active
                          ? 'text-teal-700 border-teal-600'
                          : 'text-slate-600 border-transparent hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  onClick={() => setAppMode('passenger')}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Return to Passenger View
                </button>
              )}
            </nav>

            {/* Zone 3: Single Primary Account Action */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAppMode('passenger');
                  setActiveTab('profile');
                }}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                  activeTab === 'profile' && appMode === 'passenger'
                    ? 'bg-teal-600 text-white'
                    : 'bg-[#0F1E36] hover:bg-slate-800 text-white'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                {user ? user.name.split(' ')[0] : 'Sign In'}
              </button>
            </div>
          </div>
        </header>

        {/* Workspace Toolbar: Passenger Mode / Driver Mode Switch */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex items-center p-1 bg-slate-100 rounded-xl"
              role="tablist"
              aria-label="Application mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={appMode === 'passenger'}
                onClick={() => setAppMode('passenger')}
                className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  appMode === 'passenger'
                    ? 'bg-white text-[#0F1E36] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-teal-600" />
                Passenger Mode
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={appMode === 'driver'}
                onClick={() => setAppMode('driver')}
                className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  appMode === 'driver'
                    ? 'bg-[#0F1E36] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bus className="w-3.5 h-3.5" />
                Driver Mode
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              {!user && authReady && (
                <button
                  type="button"
                  onClick={() => signInWithGoogle().catch(() => setActiveTab('profile'))}
                  className="text-teal-700 font-semibold hover:underline"
                >
                  Sign in with Google for live Firestore GPS sync
                </button>
              )}
              {user && (
                <span className="hidden sm:inline">
                  Cloud Firestore Sync Active · {user.role === 'driver' ? `Driver (${user.jeepneyId})` : 'Passenger'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-10">
          {authError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm">
              {authError}
            </div>
          )}

          {!authReady ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#0F1E36]">Connecting to Firebase &amp; Cloud Firestore...</p>
              <p className="text-xs text-slate-500">Initializing commuter session</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${appMode}-${appMode === 'passenger' ? activeTab : 'driver'}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
              >
                {appMode === 'driver' ? (
                  <DriverPortal
                    user={userWithJourneys}
                    routes={routes}
                    onLogout={handleLogout}
                  />
                ) : activeTab === 'home' ? (
                  <PassengerHome
                    user={userWithJourneys}
                    routes={routes}
                    liveJeepneys={liveJeepneys}
                    simulatedJeepneys={simulatedJeepneys}
                    isSimulationActive={isSimulationActive}
                    onToggleSimulation={() => setIsSimulationActive((v) => !v)}
                    onOpenMap={openMapForRoute}
                    onOpenRouteExplorer={openExplorerForRoute}
                    onStartJourney={openJourneyForRoute}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ) : activeTab === 'map' ? (
                  <PassengerMapTab
                    routes={routes}
                    liveJeepneys={liveJeepneys}
                    simulatedJeepneys={simulatedJeepneys}
                    isSimulationActive={isSimulationActive}
                    onToggleSimulation={() => setIsSimulationActive((v) => !v)}
                    selectedRouteId={selectedRouteId}
                    onSelectRouteId={setSelectedRouteId}
                    sseConnected={Boolean(user)}
                  />
                ) : activeTab === 'routes' ? (
                  <RouteExplorerTab
                    user={userWithJourneys}
                    routes={routes}
                    liveJeepneys={liveJeepneys}
                    simulatedJeepneys={simulatedJeepneys}
                    isSimulationActive={isSimulationActive}
                    selectedRouteId={selectedRouteId}
                    onSelectRouteId={(id) => setSelectedRouteId(id)}
                    onOpenOnMap={openMapForRoute}
                    onTrackJourney={openJourneyForRoute}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ) : activeTab === 'journey' ? (
                  <JourneyTrackerTab
                    routes={routes}
                    selectedRouteId={selectedRouteId}
                    onSelectRouteId={(id) => setSelectedRouteId(id)}
                    onRecordJourney={handleRecordJourney}
                  />
                ) : activeTab === 'fare' ? (
                  <FareGuideTab
                    routes={routes}
                    passengerCategory={passengerCategory}
                    onChangeCategory={handleChangeCategory}
                  />
                ) : (
                  <ProfileView
                    user={userWithJourneys}
                    routes={routes}
                    isSimulationActive={isSimulationActive}
                    onToggleSimulation={() => setIsSimulationActive((v) => !v)}
                    onLogout={handleLogout}
                    onToggleFavorite={handleToggleFavorite}
                    onDeleteJourney={handleDeleteJourney}
                    onChangeCategory={handleChangeCategory}
                    onOpenRouteMap={openMapForRoute}
                    onSwitchToDriverMode={() => setAppMode('driver')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Mobile Bottom Thumb-Zone Navigation (Passenger Mode) */}
        {appMode === 'passenger' && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
          >
            <div className="grid grid-cols-5 h-[60px] items-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                      active ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </MotionConfig>
  );
}
