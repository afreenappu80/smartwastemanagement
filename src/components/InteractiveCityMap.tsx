import { useState } from 'react';
import { Crosshair, ExternalLink, MapPin, Minus, Plus } from 'lucide-react';
import type { Complaint, Coordinates } from '../types/waste';
import { CATEGORY_COLORS } from '../utils/wasteLogic';

interface InteractiveCityMapProps {
  complaints?: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (complaint: Complaint) => void;
  pickerMode?: boolean;
  pickedCoordinates?: Coordinates;
  onPickCoordinates?: (coords: Coordinates, suggestedLocation: string) => void;
  heightClass?: string;
}

// Municipal bounding box around demo city coordinates (12.954 - 12.988 lat, 77.580 - 77.615 lng)
const LAT_MIN = 12.955;
const LAT_MAX = 12.986;
const LNG_MIN = 77.582;
const LNG_MAX = 77.614;

function projectToPercent(coords: Coordinates): { x: number; y: number } {
  const x = ((coords.lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
  const y = (1 - (coords.lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100;
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(88, Math.max(12, y)),
  };
}

function unprojectFromPercent(xPct: number, yPct: number): Coordinates {
  const lng = LNG_MIN + (xPct / 100) * (LNG_MAX - LNG_MIN);
  const lat = LAT_MAX - (yPct / 100) * (LAT_MAX - LAT_MIN);
  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
  };
}

function inferRoadLabel(coords: Coordinates): string {
  if (coords.lat > 12.976 && coords.lng < 77.595) return 'Civic Center Boulevard, Ward 1';
  if (coords.lat > 12.972) return 'Greenpark Avenue Crossroad, Ward 4';
  if (coords.lng > 77.601) return 'Central Market East Road, Ward 2';
  if (coords.lat < 12.963) return 'Industrial Belt Feeder Road, Ward 5';
  return 'Riverside Sector Main Lane, Ward 7';
}

export function InteractiveCityMap({
  complaints = [],
  selectedComplaintId,
  onSelectComplaint,
  pickerMode = false,
  pickedCoordinates,
  onPickCoordinates,
  heightClass = 'h-80',
}: InteractiveCityMapProps) {
  const [zoom, setZoom] = useState(1);

  const activeCoords =
    pickedCoordinates ??
    complaints.find((c) => c.id === selectedComplaintId)?.coordinates ??
    complaints[0]?.coordinates ?? { lat: 12.9716, lng: 77.5946 };

  const osmUrl = `https://www.openstreetmap.org/?mlat=${activeCoords.lat}&mlon=${activeCoords.lng}#map=15/${activeCoords.lat}/${activeCoords.lng}`;

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerMode || !onPickCoordinates) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const coords = unprojectFromPercent(xPct, yPct);
    onPickCoordinates(coords, inferRoadLabel(coords));
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#DCE6E0] bg-[#EAF2ED]">
      {/* Map Viewport */}
      <div
        onClick={handleMapClick}
        className={`relative w-full overflow-hidden ${heightClass} ${
          pickerMode ? 'cursor-crosshair' : 'cursor-default'
        }`}
        data-testid="interactive-city-map"
      >
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out origin-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Crisp Municipal Cartographic Vector Layer (OpenStreetMap-style streets, river, parks, wards) */}
          <svg
            viewBox="0 0 900 440"
            className="h-full w-full object-cover"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="900" height="440" fill="#EDF3EF" />

            {/* Urban Parks & Greenbelts */}
            <path d="M55 40 L215 35 L235 120 L80 135 Z" fill="#D1FAE5" />
            <path d="M645 45 L845 55 L830 165 L665 148 Z" fill="#D1FAE5" />
            <path d="M360 285 L520 275 L545 385 L370 398 Z" fill="#D1FAE5" />

            {/* Municipal River Channel */}
            <path
              d="M-10 345 C140 315 245 380 410 345 C580 310 720 360 915 310"
              stroke="#BAE6FD"
              strokeWidth="22"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M-10 345 C140 315 245 380 410 345 C580 310 720 360 915 310"
              stroke="#7DD3FC"
              strokeWidth="2"
              strokeDasharray="8 8"
              fill="none"
            />

            {/* Secondary Street Grid */}
            <g stroke="#DCE6E0" strokeWidth="4">
              <line x1="0" y1="95" x2="900" y2="95" />
              <line x1="0" y1="185" x2="900" y2="178" />
              <line x1="0" y1="268" x2="900" y2="262" />
              <line x1="150" y1="0" x2="138" y2="440" />
              <line x1="310" y1="0" x2="318" y2="440" />
              <line x1="485" y1="0" x2="478" y2="440" />
              <line x1="655" y1="0" x2="664" y2="440" />
              <line x1="790" y1="0" x2="782" y2="440" />
            </g>

            {/* Primary Arterial Roads */}
            <g stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round">
              <path d="M-10 142 L910 132" />
              <path d="M-10 232 L910 218" />
              <path d="M230 -10 L258 450" />
              <path d="M565 -10 L542 450" />
              <path d="M90 420 L485 135 L860 90" fill="none" />
            </g>
            <g stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="6 6" fill="none">
              <path d="M-10 142 L910 132" />
              <path d="M565 -10 L542 450" />
            </g>

            {/* Ward & Sector Cartographic Labels */}
            <g
              fill="#4B6358"
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontSize="11"
              fontWeight="700"
              letterSpacing="0.06em"
            >
              <text x="94" y="88">WARD 1 · CIVIC CENTER</text>
              <text x="342" y="122">WARD 4 · GREENPARK AVE</text>
              <text x="678" y="106">WARD 2 · CENTRAL MARKET</text>
              <text x="98" y="305">WARD 7 · RIVERSIDE</text>
              <text x="635" y="388">WARD 5 · INDUSTRIAL BELT</text>
            </g>
          </svg>

          {/* Complaint Location Pins */}
          {complaints.map((c) => {
            const pos = projectToPercent(c.coordinates);
            const isSelected = c.id === selectedComplaintId;
            const color = CATEGORY_COLORS[c.category];
            return (
              <button
                key={c.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComplaint?.(c);
                }}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                aria-label={`Select complaint ${c.id}: ${c.locationName}`}
                className={`group absolute -translate-x-1/2 -translate-y-full transition-transform duration-150 ${
                  isSelected ? 'z-20 scale-115' : 'z-10 hover:scale-110'
                }`}
              >
                <div
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-white shadow-md transition-colors ${
                    isSelected ? 'ring-2 ring-[#022C22] ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: isSelected ? '#022C22' : color }}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono whitespace-nowrap">{c.id.slice(-4)}</span>
                </div>
                <div
                  className="mx-auto h-2 w-2 -translate-y-1 rotate-45"
                  style={{ backgroundColor: isSelected ? '#022C22' : color }}
                />
              </button>
            );
          })}

          {/* Picker Pin (Report Garbage mode) */}
          {pickerMode && pickedCoordinates && (
            <div
              style={{
                left: `${projectToPercent(pickedCoordinates).x}%`,
                top: `${projectToPercent(pickedCoordinates).y}%`,
              }}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
            >
              <div className="flex items-center gap-1 rounded-lg bg-[#064E3B] px-2.5 py-1 text-xs font-semibold text-white shadow-lg ring-2 ring-[#A7F3D0]">
                <Crosshair className="h-3.5 w-3.5 text-[#A7F3D0]" aria-hidden="true" />
                <span>Pinned Spot</span>
              </div>
              <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 bg-[#064E3B]" />
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-lg border border-[#D4E2DA] bg-white/95 shadow-sm backdrop-blur-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))));
            }}
            aria-label="Zoom in map"
            className="flex h-8 w-8 items-center justify-center text-[#064E3B] hover:bg-[#F5F8F6] transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="h-px bg-[#E5ECE8]" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.max(0.9, Number((z - 0.15).toFixed(2))));
            }}
            aria-label="Zoom out map"
            className="flex h-8 w-8 items-center justify-center text-[#064E3B] hover:bg-[#F5F8F6] transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        {/* Coordinate Footer Bar */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D4E2DA] bg-white/95 px-3 py-2 text-xs text-[#1F2937] shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] text-[#374151]">
            <MapPin className="h-3.5 w-3.5 text-[#059669] shrink-0" aria-hidden="true" />
            <span>
              Lat {activeCoords.lat.toFixed(5)}, Lng {activeCoords.lng.toFixed(5)}
            </span>
            {pickerMode && (
              <span className="font-sans text-[#064E3B] font-medium">
                · Click anywhere on map to adjust pin
              </span>
            )}
          </div>
          <a
            href={osmUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-medium text-[#064E3B] hover:text-[#059669] whitespace-nowrap"
          >
            <span>OpenStreetMap</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
