import { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  ScanSearch,
  Trash2,
  Upload,
} from 'lucide-react';
import { InteractiveCityMap } from '../components/InteractiveCityMap';
import { SAMPLE_WASTE_PRESETS } from '../data/seedData';
import { detectWasteWithFlask } from '../services/flaskApi';
import type {
  Complaint,
  Coordinates,
  DetectionResult,
  UserProfile,
  WasteCategory,
} from '../types/waste';
import { CATEGORY_COLORS, validateReportForm } from '../utils/wasteLogic';

const WARDS = [
  'Ward 1 - Civic Center',
  'Ward 2 - Central Market',
  'Ward 4 - Greenpark Avenue',
  'Ward 5 - Industrial Belt',
  'Ward 7 - Riverside Sector',
];

interface ReportGarbagePageProps {
  user: UserProfile;
  flaskApiBaseUrl: string;
  useLiveFlaskApi: boolean;
  prefillData?: {
    imageUrl?: string;
    category?: WasteCategory;
    confidence?: number;
    title?: string;
  } | null;
  onSubmitComplaint: (draft: {
    title: string;
    description: string;
    category: WasteCategory;
    severity: 'Low' | 'Medium' | 'High';
    locationName: string;
    ward: string;
    coordinates: Coordinates;
    imageUrl: string;
    aiDetected: boolean;
    aiConfidence: number;
    estimatedWeightKg: number;
  }) => Promise<{ complaint: Complaint; savedToFlask: boolean }>;
  onTrackComplaint: (id: string) => void;
}

export function ReportGarbagePage({
  flaskApiBaseUrl,
  useLiveFlaskApi,
  prefillData,
  onSubmitComplaint,
  onTrackComplaint,
}: ReportGarbagePageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [imageUrl, setImageUrl] = useState(prefillData?.imageUrl ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filenameHint, setFilenameHint] = useState('uploaded-waste.jpg');
  const [title, setTitle] = useState(prefillData?.title ?? '');
  const [category, setCategory] = useState<WasteCategory>(prefillData?.category ?? 'Plastic');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [locationName, setLocationName] = useState('');
  const [ward, setWard] = useState(WARDS[2]);
  const [coordinates, setCoordinates] = useState<Coordinates>({
    lat: 12.9742,
    lng: 77.5968,
  });
  const [description, setDescription] = useState('');

  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<DetectionResult | null>(
    prefillData?.confidence
      ? {
          category: prefillData.category ?? 'Plastic',
          detectedLabel: `${prefillData.category ?? 'Plastic'} Waste`,
          confidence: prefillData.confidence,
          status: 'Detected',
          modelEngine: 'Pre-analyzed from Detect Waste',
          isMockResult: true,
          disposalGuidance: '',
          estimatedWeightKg: 18,
          boundingBoxes: [],
          analyzedAt: new Date().toISOString(),
        }
      : null
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<{
    complaint: Complaint;
    savedToFlask: boolean;
  } | null>(null);

  const handleFilePicked = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setImageFile(file);
    setFilenameHint(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setDetection(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (preset: (typeof SAMPLE_WASTE_PRESETS)[number]) => {
    setError(null);
    setImageFile(null);
    setImageUrl(preset.imageUrl);
    setFilenameHint(preset.filename);
    setCategory(preset.category);
    if (!title) setTitle(`Roadside ${preset.label.toLowerCase()} reported`);
    if (!locationName) setLocationName(preset.suggestedLocation);
    setDetection(null);
  };

  const handleCaptureGps = () => {
    setError(null);
    if (!('geolocation' in navigator)) {
      setGpsStatus('Browser GPS unavailable — click directly on the map below to pin location.');
      return;
    }
    setGpsLoading(true);
    setGpsStatus('Requesting device GPS permission...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setCoordinates({ lat, lng });
        if (!locationName.trim()) {
          setLocationName(`GPS Tagged Roadside (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
        setGpsStatus(`GPS acquired (±${Math.round(pos.coords.accuracy)}m accuracy).`);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsStatus(
          err.code === 1
            ? 'Location permission denied. Click on the map or type the road name manually.'
            : 'Unable to fetch live GPS signal in this preview. Click the map below to pin exact coordinates.'
        );
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleRunAiDetect = async () => {
    if (!imageUrl) {
      setError('Upload or select a waste photograph first to run AI detection.');
      return;
    }
    setError(null);
    setDetecting(true);
    try {
      const res = await detectWasteWithFlask(
        flaskApiBaseUrl,
        {
          file: imageFile,
          imageUrl,
          filenameHint,
        },
        useLiveFlaskApi
      );
      setDetection(res);
      setCategory(res.category);
      if (!title.trim()) {
        setTitle(`${res.detectedLabel} dumped beside road`);
      }
    } finally {
      setDetecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateReportForm({
      title,
      locationName,
      imageUrl,
      description,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmitComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        locationName: locationName.trim(),
        ward,
        coordinates,
        imageUrl,
        aiDetected: Boolean(detection),
        aiConfidence: detection?.confidence ?? 0,
        estimatedWeightKg: detection?.estimatedWeightKg ?? 18,
      });
      setSubmittedRecord(result);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedRecord(null);
    setImageUrl('');
    setImageFile(null);
    setTitle('');
    setLocationName('');
    setDescription('');
    setDetection(null);
    setError(null);
  };

  if (submittedRecord) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#CDE7DA] bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-extrabold text-[#022C22]">
          Complaint Submitted Successfully
        </h2>
        <p className="mt-2 text-sm text-[#4B5563]">
          Your garbage report{' '}
          <span className="font-mono font-bold text-[#064E3B]">
            {submittedRecord.complaint.id}
          </span>{' '}
          has been logged and queued for municipal dispatch.
        </p>
        <p className="mt-2 text-xs text-[#6B7280]">
          {submittedRecord.savedToFlask
            ? 'Synced directly to Flask & MySQL backend.'
            : 'Saved in Demo Mode (Flask API offline — will work with Flask POST /api/complaints when connected).'}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-[#F5F8F6] p-4 text-left text-xs sm:grid-cols-4">
          <div>
            <p className="text-[#6B7280]">Category</p>
            <p className="mt-0.5 font-semibold text-[#022C22]">
              {submittedRecord.complaint.category}
            </p>
          </div>
          <div>
            <p className="text-[#6B7280]">Status</p>
            <p className="mt-0.5 font-semibold text-[#D97706]">
              {submittedRecord.complaint.status}
            </p>
          </div>
          <div>
            <p className="text-[#6B7280]">Ward</p>
            <p className="mt-0.5 font-semibold text-[#022C22] truncate">
              {submittedRecord.complaint.ward}
            </p>
          </div>
          <div>
            <p className="text-[#6B7280]">GPS</p>
            <p className="mt-0.5 font-mono text-[#022C22] tabular-nums">
              {submittedRecord.complaint.coordinates.lat.toFixed(4)},{' '}
              {submittedRecord.complaint.coordinates.lng.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onTrackComplaint(submittedRecord.complaint.id)}
            className="rounded-xl bg-[#064E3B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#022C22]"
          >
            Track Complaint Progress
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-[#DCE6E0] px-5 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F5F8F6]"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-[#022C22]">
          Report Roadside Garbage
        </h2>
        <p className="mt-1 text-sm text-[#4B5563]">
          Upload a photograph, tag the GPS location, run optional AI waste classification, and
          dispatch a municipal sanitation ticket.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12" noValidate>
        {/* LEFT COLUMN: Photo Upload + AI Scan + Map Preview */}
        <div className="space-y-6 lg:col-span-6">
          {/* Step 1: Photograph Upload */}
          <section className="rounded-2xl border border-[#E2EAE5] bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#022C22]">
                1. Waste Photograph
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6E0] px-3 py-1.5 text-xs font-semibold text-[#064E3B] hover:bg-[#F5F8F6]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6E0] px-3 py-1.5 text-xs font-semibold text-[#064E3B] hover:bg-[#F5F8F6]"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Camera</span>
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilePicked(e.target.files?.[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFilePicked(e.target.files?.[0])}
            />

            {imageUrl ? (
              <div className="mt-4 space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-[#DCE6E0] bg-[#F5F8F6]">
                  <img
                    src={imageUrl}
                    alt="Uploaded roadside garbage preview"
                    referrerPolicy="no-referrer"
                    className="h-56 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setImageFile(null);
                      setDetection(null);
                    }}
                    aria-label="Remove uploaded photograph"
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-[#022C22]/85 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#022C22]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                {/* Inline AI Classification Action */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F5F8F6] px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-[#022C22]">
                      {detection
                        ? `AI Classified: ${detection.category} (${detection.confidence}% confidence)`
                        : 'Auto-classify waste with YOLO / OpenCV'}
                    </p>
                    <p className="text-[11px] text-[#6B7280]">
                      {detection
                        ? detection.isMockResult
                          ? 'Simulated YOLO result (Flask API offline)'
                          : `Verified via ${detection.modelEngine}`
                        : 'Detects plastic, organic, metal, or mixed debris'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAiDetect}
                    disabled={detecting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#064E3B] disabled:opacity-60 whitespace-nowrap"
                  >
                    {detecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ScanSearch className="h-3.5 w-3.5" />
                    )}
                    <span>{detecting ? 'Analyzing...' : 'Run AI Detect'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilePicked(e.dataTransfer.files?.[0]);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C7DBD0] bg-[#F8FBF9] px-6 py-9 text-center transition-colors hover:border-[#059669] hover:bg-[#ECFDF5]/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#059669]">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#022C22]">
                  Drop a roadside garbage photo here, or click to browse
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  JPG, PNG, or WEBP up to 10 MB
                </p>
              </div>
            )}

            {/* Quick Sample Photos for Instant Testing */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-[#6B7280]">
                Or load a sample inspection photo:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SAMPLE_WASTE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className="group overflow-hidden rounded-lg border border-[#DCE6E0] bg-white text-left transition-colors hover:border-[#059669]"
                  >
                    <img
                      src={preset.imageUrl}
                      alt={preset.label}
                      referrerPolicy="no-referrer"
                      className="h-14 w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1 text-[11px] font-medium text-[#1F2937] group-hover:text-[#064E3B]">
                      {preset.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Step 2: GPS & Map Location */}
          <section className="rounded-2xl border border-[#E2EAE5] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-[#022C22]">
                2. GPS Location &amp; Map Pin
              </h3>
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#ECFDF5] px-3 py-1.5 text-xs font-semibold text-[#064E3B] hover:bg-[#D1FAE5] disabled:opacity-60"
              >
                {gpsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Crosshair className="h-3.5 w-3.5 text-[#059669]" />
                )}
                <span>Use Current GPS</span>
              </button>
            </div>
            {gpsStatus && (
              <p className="mt-2 text-xs font-medium text-[#064E3B]">{gpsStatus}</p>
            )}

            <div className="mt-3">
              <InteractiveCityMap
                pickerMode
                pickedCoordinates={coordinates}
                onPickCoordinates={(coords, suggestedRoad) => {
                  setCoordinates(coords);
                  setLocationName(suggestedRoad);
                }}
                heightClass="h-56"
              />
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Report Details Form */}
        <div className="lg:col-span-6">
          <section className="rounded-2xl border border-[#E2EAE5] bg-white p-6 space-y-5">
            <h3 className="font-display text-base font-bold text-[#022C22]">
              3. Complaint Details
            </h3>

            <div>
              <label
                htmlFor="report-title"
                className="block text-xs font-semibold text-[#374151]"
              >
                Report Title
              </label>
              <input
                id="report-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Overflowing plastic bags beside Main Avenue curb"
                className="mt-1.5 w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] px-4 py-2.5 text-sm text-[#1F2937] focus:border-[#059669] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="report-location"
                  className="block text-xs font-semibold text-[#374151]"
                >
                  Roadside Location / Landmark
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    id="report-location"
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Street name or nearby landmark"
                    className="w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] py-2.5 pl-9 pr-3 text-sm text-[#1F2937] focus:border-[#059669] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="report-ward"
                  className="block text-xs font-semibold text-[#374151]"
                >
                  Municipal Ward / Zone
                </label>
                <select
                  id="report-ward"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] px-3.5 py-2.5 text-sm text-[#1F2937] focus:border-[#059669] focus:bg-white"
                >
                  {WARDS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Selector Buttons */}
            <div>
              <span className="block text-xs font-semibold text-[#374151]">
                Waste Category
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {(['Organic', 'Plastic', 'Metal', 'Others'] as WasteCategory[]).map((cat) => {
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                        selected
                          ? 'border-[#064E3B] bg-[#064E3B] text-white'
                          : 'border-[#DCE6E0] bg-white text-[#374151] hover:border-[#059669]'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-xs shrink-0"
                        style={{
                          backgroundColor: selected ? '#A7F3D0' : CATEGORY_COLORS[cat],
                        }}
                      />
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity */}
            <div>
              <span className="block text-xs font-semibold text-[#374151]">
                Priority / Accumulation Severity
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2.5">
                {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSeverity(lvl)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      severity === lvl
                        ? 'border-[#059669] bg-[#ECFDF5] text-[#064E3B]'
                        : 'border-[#DCE6E0] bg-white text-[#4B5563] hover:bg-[#F5F8F6]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="report-description"
                className="block text-xs font-semibold text-[#374151]"
              >
                Description &amp; Accessibility Notes
              </label>
              <textarea
                id="report-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe approximate pile size, odor or drainage obstruction, and easiest access road for sanitation vehicles..."
                className="mt-1.5 w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] px-4 py-3 text-sm text-[#1F2937] focus:border-[#059669] focus:bg-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#064E3B] py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#022C22] disabled:opacity-60"
              >
                {submitting ? 'Submitting Complaint...' : 'Submit Garbage Complaint'}
              </button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
