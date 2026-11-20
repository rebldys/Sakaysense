import { AlertCircle, Calculator } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SAMPLE_FARE_CONFIG, calculateSampleFare } from '../shared/routesData.ts';
import type { JeepneyRoute, PassengerCategory } from '../shared/types.ts';

interface FareGuideTabProps {
  routes: JeepneyRoute[];
  passengerCategory: PassengerCategory;
  onChangeCategory: (category: PassengerCategory) => void;
}

const CATEGORY_OPTIONS: { id: PassengerCategory; label: string; note: string }[] = [
  { id: 'regular', label: 'Regular', note: 'Standard fare' },
  { id: 'student', label: 'Student', note: '20% discount' },
  { id: 'senior', label: 'Senior Citizen', note: '20% discount' },
  { id: 'pwd', label: 'PWD', note: '20% discount' },
];

export function FareGuideTab({
  routes,
  passengerCategory,
  onChangeCategory,
}: FareGuideTabProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.routeId || 'R-KAT-UPD');
  const [customDistanceKm, setCustomDistanceKm] = useState<number>(5);
  const [vehicleClass, setVehicleClass] = useState<'traditional' | 'modernized'>('traditional');

  const selectedRoute = useMemo(
    () => routes.find((r) => r.routeId === selectedRouteId),
    [routes, selectedRouteId],
  );

  const customFare = useMemo(
    () => calculateSampleFare(customDistanceKm, vehicleClass, passengerCategory),
    [customDistanceKm, vehicleClass, passengerCategory],
  );

  const sampleDistances = [4, 5, 6, 8, 10, 12];

  return (
    <div className="space-y-5">
      {/* Unverified Sample Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-950">Sample Fare Estimates Only</p>
          <p className="text-xs text-amber-900 leading-relaxed">
            {SAMPLE_FARE_CONFIG.disclaimer}
          </p>
        </div>
      </div>

      {/* Passenger Category Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h1 className="text-xl font-bold text-[#0F1E36]">Jeepney Fare Guide</h1>
        <p className="text-xs text-slate-600">
          Select your passenger category to preview discounted and regular sample fares.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {CATEGORY_OPTIONS.map((cat) => {
            const active = passengerCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChangeCategory(cat.id)}
                className={`min-h-[52px] p-3 rounded-xl border text-left transition-colors ${
                  active
                    ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <p className="text-sm font-bold">{cat.label}</p>
                <p className={`text-xs mt-0.5 ${active ? 'text-teal-300' : 'text-slate-500'}`}>
                  {cat.note}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Distance Estimator */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-700" />
            <h2 className="text-base font-bold text-[#0F1E36]">Sample Distance Calculator</h2>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600">Jeepney Class</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVehicleClass('traditional')}
                className={`min-h-[44px] rounded-xl text-xs font-semibold border transition-colors ${
                  vehicleClass === 'traditional'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Traditional (₱13 base)
              </button>
              <button
                type="button"
                onClick={() => setVehicleClass('modernized')}
                className={`min-h-[44px] rounded-xl text-xs font-semibold border transition-colors ${
                  vehicleClass === 'modernized'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Modernized (₱15 base)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="fare-distance-range" className="font-semibold text-slate-600">
                Trip Distance
              </label>
              <span className="font-mono-tabular font-bold text-[#0F1E36]">{customDistanceKm} km</span>
            </div>
            <input
              id="fare-distance-range"
              type="range"
              min={1}
              max={20}
              step={1}
              value={customDistanceKm}
              onChange={(e) => setCustomDistanceKm(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono-tabular">
              <span>1 km</span>
              <span>10 km</span>
              <span>20 km</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fare-route-preset" className="block text-xs font-semibold text-slate-600">
              Or Load Route Distance
            </label>
            <select
              id="fare-route-preset"
              value={selectedRouteId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedRouteId(nextId);
                const found = routes.find((r) => r.routeId === nextId);
                if (found) {
                  setCustomDistanceKm(Math.max(1, Math.round(found.distanceKm)));
                  setVehicleClass(found.vehicleClass);
                }
              }}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900"
            >
              {routes.map((r) => (
                <option key={r.routeId} value={r.routeId}>
                  {r.code} ({r.distanceKm} km · {r.vehicleClass})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F1E36] text-white flex items-center justify-between">
            <div>
              <p className="text-xs text-teal-300">
                Estimated Sample Fare ({passengerCategory.toUpperCase()})
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                {selectedRoute ? `${vehicleClass} · ${customDistanceKm} km` : `${customDistanceKm} km`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold font-mono-tabular">
                ₱{customFare.appliedFare.toFixed(2)}
              </p>
              {passengerCategory !== 'regular' && (
                <p className="text-xs text-slate-400 line-through font-mono-tabular">
                  ₱{customFare.regularFare.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sample Fare Matrix Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F1E36]">
              Sample Fare Reference Matrix (Unverified Demo Data)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              First 4 km minimum fare plus per-kilometer increment, showing regular vs 20% discounted rate.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 pr-3 font-semibold">Distance</th>
                  <th className="py-2.5 px-3 font-semibold">Trad. Regular</th>
                  <th className="py-2.5 px-3 font-semibold">Trad. Discount</th>
                  <th className="py-2.5 px-3 font-semibold">Mod. Regular</th>
                  <th className="py-2.5 pl-3 font-semibold">Mod. Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-tabular">
                {sampleDistances.map((km) => {
                  const trad = calculateSampleFare(km, 'traditional', 'student');
                  const mod = calculateSampleFare(km, 'modernized', 'student');
                  return (
                    <tr key={km} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        {km === 4 ? 'Up to 4 km' : `${km} km`}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">₱{trad.regularFare.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-teal-700 font-semibold">
                        ₱{trad.discountedFare.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">₱{mod.regularFare.toFixed(2)}</td>
                      <td className="py-2.5 pl-3 text-teal-700 font-semibold">
                        ₱{mod.discountedFare.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
