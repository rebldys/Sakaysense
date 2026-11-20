import L from 'leaflet';
import { useEffect, useRef } from 'react';
import type { JeepneyRoute, PublicJeepneyState } from '../shared/types.ts';

interface LeafletMapProps {
  jeepneys: PublicJeepneyState[];
  selectedRoute?: JeepneyRoute | null;
  selectedJeepneyId?: string | null;
  userLocation?: { latitude: number; longitude: number; accuracy?: number | null } | null;
  centerOverride?: [number, number] | null;
  zoomOverride?: number;
  heightClass?: string;
  onSelectJeepney?: (jeepney: PublicJeepneyState) => void;
}

const MANILA_DEFAULT_CENTER: [number, number] = [14.616, 121.028];

function buildJeepneyMarkerIcon(jeepney: PublicJeepneyState, isSelected: boolean): L.DivIcon {
  const isDemo = jeepney.isSimulated;
  const bg = isDemo ? '#D97706' : '#0D9488';
  const border = isSelected ? '#0F1E36' : '#FFFFFF';
  const ring = isSelected ? 'box-shadow: 0 0 0 3px rgba(15,30,54,0.35);' : 'box-shadow: 0 4px 12px rgba(15,23,42,0.28);';
  const label = isDemo ? 'DEMO' : jeepney.jeepneyId.replace('JEEP-', 'J');

  return L.divIcon({
    className: 'sakay-marker-wrapper',
    iconSize: [74, 38],
    iconAnchor: [37, 19],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;cursor:pointer;">
        <div style="display:flex;align-items:center;gap:4px;background:${bg};color:#fff;border:2px solid ${border};border-radius:10px;padding:3px 7px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;white-space:nowrap;${ring}">
          <span style="display:inline-block;width:7px;height:7px;border-radius:9999px;background:#fff;"></span>
          <span>${label}</span>
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${bg};margin-top:-1px;"></div>
      </div>
    `,
  });
}

function buildUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'sakay-marker-wrapper',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `
      <div style="width:24px;height:24px;border-radius:9999px;background:rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;">
        <div style="width:12px;height:12px;border-radius:9999px;background:#2563EB;border:2.5px solid #FFFFFF;box-shadow:0 2px 6px rgba(37,99,235,0.5);"></div>
      </div>
    `,
  });
}

function buildStopIcon(isTerminal: boolean): L.DivIcon {
  const size = isTerminal ? 14 : 10;
  const fill = isTerminal ? '#0F1E36' : '#FFFFFF';
  const stroke = isTerminal ? '#FFFFFF' : '#0F1E36';
  return L.divIcon({
    className: 'sakay-marker-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${fill};border:2.5px solid ${stroke};box-shadow:0 1px 4px rgba(15,23,42,0.3);"></div>`,
  });
}

export function LeafletMap({
  jeepneys,
  selectedRoute,
  selectedJeepneyId,
  userLocation,
  centerOverride,
  zoomOverride,
  heightClass = 'h-[420px] sm:h-[520px]',
  onSelectJeepney,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectJeepney);

  onSelectRef.current = onSelectJeepney;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: centerOverride || MANILA_DEFAULT_CENTER,
      zoom: zoomOverride ?? 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    vehicleLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pan / fit when centerOverride changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centerOverride) return;
    map.setView(centerOverride, zoomOverride ?? map.getZoom(), { animate: true });
  }, [centerOverride, zoomOverride]);

  // Render selected route polyline & stops
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!selectedRoute) return;

    const polyline = L.polyline(selectedRoute.path, {
      color: selectedRoute.colorHex || '#0D9488',
      weight: 5,
      opacity: 0.85,
    });
    polyline.addTo(layer);

    selectedRoute.stops.forEach((stop, index) => {
      const isTerminal = index === 0 || index === selectedRoute.stops.length - 1;
      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: buildStopIcon(isTerminal),
      });
      marker.bindTooltip(`${stop.name} (${stop.landmark})`, {
        direction: 'top',
        offset: [0, -6],
      });
      marker.addTo(layer);
    });

    if (!centerOverride) {
      map.fitBounds(polyline.getBounds(), { padding: [36, 36], maxZoom: 15 });
    }
  }, [selectedRoute, centerOverride]);

  // Render active vehicles (LIVE GPS vs DEMO clearly distinguished)
  useEffect(() => {
    const layer = vehicleLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    for (const jeepney of jeepneys) {
      if (!jeepney.isActive || jeepney.latitude == null || jeepney.longitude == null) continue;
      const isSelected = jeepney.jeepneyId === selectedJeepneyId;
      const marker = L.marker([jeepney.latitude, jeepney.longitude], {
        icon: buildJeepneyMarkerIcon(jeepney, isSelected),
        zIndexOffset: jeepney.isSimulated ? 200 : 500,
      });

      marker.on('click', () => {
        onSelectRef.current?.(jeepney);
      });

      marker.addTo(layer);
    }
  }, [jeepneys, selectedJeepneyId]);

  // Render user's real GPS position
  useEffect(() => {
    const layer = userLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!userLocation) return;

    if (userLocation.accuracy && userLocation.accuracy > 0 && userLocation.accuracy < 1000) {
      L.circle([userLocation.latitude, userLocation.longitude], {
        radius: userLocation.accuracy,
        color: '#2563EB',
        fillColor: '#3B82F6',
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(layer);
    }

    const marker = L.marker([userLocation.latitude, userLocation.longitude], {
      icon: buildUserLocationIcon(),
      zIndexOffset: 400,
    });
    marker.bindTooltip('Your Current Location', { direction: 'top', offset: [0, -10] });
    marker.addTo(layer);
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative`}
      aria-label="Interactive OpenStreetMap Jeepney Map"
    />
  );
}
