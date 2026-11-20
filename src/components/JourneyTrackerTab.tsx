import { Bell, BellRing, CheckCircle2, Play, RotateCcw, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { JeepneyRoute } from '../shared/types.ts';

interface JourneyTrackerTabProps {
  routes: JeepneyRoute[];
  selectedRouteId: string | null;
  onSelectRouteId: (routeId: string) => void;
  onRecordJourney: (routeId: string, destinationStop: string, mode: 'live' | 'simulated_journey') => void;
}

function playArrivalTone() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio context restriction
  }
}

export function JourneyTrackerTab({
  routes,
  selectedRouteId,
  onSelectRouteId,
  onRecordJourney,
}: JourneyTrackerTabProps) {
  const activeRoute = useMemo(
    () => routes.find((r) => r.routeId === selectedRouteId) ?? routes[0],
    [routes, selectedRouteId],
  );

  const [destinationStopId, setDestinationStopId] = useState<string>('');
  const [currentStopIdx, setCurrentStopIdx] = useState<number>(0);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [isSimJourneyRunning, setIsSimJourneyRunning] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Sync default destination stop when route changes
  useEffect(() => {
    if (!activeRoute) return;
    const lastStop = activeRoute.stops[activeRoute.stops.length - 1];
    setDestinationStopId(lastStop.stopId);
    setCurrentStopIdx(0);
    setIsSimJourneyRunning(false);
    setAlertMessage(null);
  }, [activeRoute?.routeId]);

  const destinationIndex = useMemo(() => {
    if (!activeRoute) return 0;
    const idx = activeRoute.stops.findIndex((s) => s.stopId === destinationStopId);
    return idx >= 0 ? idx : activeRoute.stops.length - 1;
  }, [activeRoute, destinationStopId]);

  const destinationStop = activeRoute?.stops[destinationIndex];

  // Simulated journey step timer
  useEffect(() => {
    if (!isSimJourneyRunning || !activeRoute) return;

    const timer = window.setInterval(() => {
      setCurrentStopIdx((prev) => {
        const next = prev + 1;
        if (next >= destinationIndex) {
          setIsSimJourneyRunning(false);
          if (reminderEnabled && destinationStop) {
            setAlertMessage(
              `Destination Reminder: You have arrived at ${destinationStop.name} (${destinationStop.landmark}). Para po!`,
            );
            playArrivalTone();
          }
          onRecordJourney(
            activeRoute.routeId,
            destinationStop?.name || activeRoute.destination,
            'simulated_journey',
          );
          return destinationIndex;
        }
        if (reminderEnabled && next === destinationIndex - 1 && destinationStop) {
          setAlertMessage(
            `Approaching Stop: ${destinationStop.name} is the next stop. Prepare to alight.`,
          );
          playArrivalTone();
        }
        return next;
      });
    }, 2200);

    return () => window.clearInterval(timer);
  }, [isSimJourneyRunning, activeRoute, destinationIndex, destinationStop, reminderEnabled, onRecordJourney]);

  if (!activeRoute) return null;

  const stopsRemaining = Math.max(0, destinationIndex - currentStopIdx);

  const handleToggleSimJourney = () => {
    if (isSimJourneyRunning) {
      setIsSimJourneyRunning(false);
      return;
    }
    if (currentStopIdx >= destinationIndex) {
      setCurrentStopIdx(0);
    }
    setAlertMessage(null);
    setIsSimJourneyRunning(true);
  };

  const handleManualNextStop = () => {
    if (currentStopIdx >= destinationIndex) return;
    const next = currentStopIdx + 1;
    setCurrentStopIdx(next);
    if (reminderEnabled && next === destinationIndex - 1 && destinationStop) {
      setAlertMessage(`Approaching Stop: ${destinationStop.name} is next!`);
      playArrivalTone();
    } else if (next === destinationIndex && destinationStop) {
      setAlertMessage(`Arrived at ${destinationStop.name}. Para po!`);
      if (reminderEnabled) playArrivalTone();
      onRecordJourney(activeRoute.routeId, destinationStop.name, 'live');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F1E36]">Journey Tracker & Destination Alert</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Choose your route and alighting stop to follow upcoming landmarks and trigger a destination reminder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReminderEnabled((v) => !v)}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 shrink-0 transition-colors ${
            reminderEnabled
              ? 'bg-teal-600 text-white hover:bg-teal-700'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {reminderEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          {reminderEnabled ? 'Destination Alert On' : 'Destination Alert Off'}
        </button>
      </div>

      {alertMessage && (
        <div
          role="status"
          className="bg-teal-50 border border-teal-300 text-teal-950 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 text-teal-700 shrink-0" />
            <p className="text-sm font-semibold">{alertMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className="text-xs font-semibold text-teal-800 hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Route & Destination Controls */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="journey-route-select" className="block text-xs font-semibold text-slate-600">
              Selected Jeepney Route
            </label>
            <select
              id="journey-route-select"
              value={activeRoute.routeId}
              onChange={(e) => onSelectRouteId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {routes.map((r) => (
                <option key={r.routeId} value={r.routeId}>
                  {r.code} — {r.routeName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="journey-stop-select" className="block text-xs font-semibold text-slate-600">
              Your Destination Stop
            </label>
            <select
              id="journey-stop-select"
              value={destinationStopId}
              onChange={(e) => {
                setDestinationStopId(e.target.value);
                setAlertMessage(null);
              }}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {activeRoute.stops.map((stop, idx) => (
                <option key={stop.stopId} value={stop.stopId} disabled={idx === 0}>
                  {idx + 1}. {stop.name} ({stop.kmFromOrigin.toFixed(1)} km)
                </option>
              ))}
            </select>
          </div>

          {/* Journey Progress Summary */}
          <div className="p-4 rounded-2xl bg-[#0F1E36] text-white space-y-2">
            <div className="flex items-center justify-between text-xs text-teal-300">
              <span>{isSimJourneyRunning ? 'DEMO Journey Running' : 'Manual / Guided Mode'}</span>
              <span className="tabular-nums">{stopsRemaining} stops left</span>
            </div>
            <p className="text-base font-bold">
              {currentStopIdx >= destinationIndex
                ? `Arrived: ${destinationStop?.name}`
                : `Current: ${activeRoute.stops[currentStopIdx]?.name}`}
            </p>
            <p className="text-xs text-slate-300">
              Target Stop: {destinationStop?.name} ({destinationStop?.landmark})
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleToggleSimJourney}
              className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                isSimJourneyRunning
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {isSimJourneyRunning ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Stop Simulated Journey
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run Simulated Journey
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleManualNextStop}
              disabled={isSimJourneyRunning || currentStopIdx >= destinationIndex}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-xs font-semibold text-slate-800"
            >
              Next Stop
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSimJourneyRunning(false);
                setCurrentStopIdx(0);
                setAlertMessage(null);
              }}
              aria-label="Reset journey"
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upcoming Stops Timeline */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F1E36]">Upcoming Stops Checklist</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {currentStopIdx + 1} / {destinationIndex + 1} stops
            </span>
          </div>

          <ol className="space-y-3">
            {activeRoute.stops.slice(0, destinationIndex + 1).map((stop, idx) => {
              const isPassed = idx < currentStopIdx;
              const isCurrent = idx === currentStopIdx;
              const isDest = idx === destinationIndex;

              return (
                <li
                  key={stop.stopId}
                  className={`p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-teal-500 bg-teal-50/70'
                      : isPassed
                        ? 'border-slate-100 bg-slate-50 opacity-70'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                    ) : (
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-teal-600 text-white'
                            : isDest
                              ? 'bg-[#0F1E36] text-white'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {stop.name}
                        {isDest && ' (Your Destination)'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{stop.landmark}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500 shrink-0">
                    {stop.kmFromOrigin.toFixed(1)} km
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
