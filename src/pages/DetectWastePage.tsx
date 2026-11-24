import { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  ScanSearch,
  Trash2,
  Upload,
} from 'lucide-react';
import { SAMPLE_WASTE_PRESETS } from '../data/seedData';
import { detectWasteWithFlask } from '../services/flaskApi';
import type { DetectionResult, WasteCategory } from '../types/waste';
import { CATEGORY_COLORS } from '../utils/wasteLogic';

interface DetectWastePageProps {
  flaskApiBaseUrl: string;
  useLiveFlaskApi: boolean;
  onReportWithDetection: (payload: {
    imageUrl: string;
    category: WasteCategory;
    confidence: number;
    title: string;
  }) => void;
}

export function DetectWastePage({
  flaskApiBaseUrl,
  useLiveFlaskApi,
  onReportWithDetection,
}: DetectWastePageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filenameHint, setFilenameHint] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const runDetection = async (src: string, file: File | null, hint: string) => {
    setAnalyzing(true);
    try {
      const detection = await detectWasteWithFlask(
        flaskApiBaseUrl,
        {
          file,
          imageUrl: src,
          filenameHint: hint,
        },
        useLiveFlaskApi
      );
      setResult(detection);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    setImageFile(file);
    setFilenameHint(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        void runDetection(reader.result, file, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSampleClick = (preset: (typeof SAMPLE_WASTE_PRESETS)[number]) => {
    setImageFile(null);
    setFilenameHint(preset.filename);
    setImageUrl(preset.imageUrl);
    setResult(null);
    void runDetection(preset.imageUrl, null, preset.filename);
  };

  const handleClear = () => {
    setImageUrl('');
    setImageFile(null);
    setFilenameHint('');
    setResult(null);
  };

  const accentColor = result ? CATEGORY_COLORS[result.category] : '#059669';

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#064E3B] text-[#A7F3D0]">
            <ScanSearch className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-[#022C22]">
              Detect Waste
            </h2>
            <p className="mt-0.5 text-sm text-[#4B5563]">
              Upload or capture a waste photograph for automated YOLO &amp; OpenCV category
              classification and disposal routing.
            </p>
          </div>
        </div>

        {/* Upload Image / Use Camera Segmented Mode */}
        <div className="inline-flex rounded-xl border border-[#DCE6E0] bg-white p-1 self-start">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              inputMode === 'upload'
                ? 'bg-[#064E3B] text-white'
                : 'text-[#4B5563] hover:text-[#022C22]'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Image</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('camera');
              cameraInputRef.current?.click();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              inputMode === 'camera'
                ? 'bg-[#064E3B] text-white'
                : 'text-[#4B5563] hover:text-[#022C22]'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Use Camera</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT: Upload & Preview Area */}
        <section className="rounded-2xl border border-[#E2EAE5] bg-white p-6 lg:col-span-7">
          {!imageUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileSelected(e.dataTransfer.files?.[0]);
              }}
              className={`flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                isDragging
                  ? 'border-[#059669] bg-[#ECFDF5]'
                  : 'border-[#C7DBD0] bg-[#F8FBF9]'
              }`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
                <Upload className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-[#022C22]">
                Drag &amp; drop a waste photo here
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-[#6B7280]">
                Supports roadside dumps, bins, plastic bottles, organic market piles, metal cans,
                and mixed urban waste (JPG, PNG, WEBP).
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#064E3B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#022C22]"
                >
                  <Upload className="h-4 w-4" />
                  <span>Choose File</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6E0] bg-white px-5 py-2.5 text-sm font-semibold text-[#064E3B] transition-colors hover:bg-[#F5F8F6]"
                >
                  <Camera className="h-4 w-4" />
                  <span>Capture Camera</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#374151] truncate">
                  Image: <span className="font-mono text-[#064E3B]">{filenameHint}</span>
                </p>
                <div className="flex items-center gap-2">
                  {result && result.boundingBoxes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBoxes((b) => !b)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6E0] px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#F5F8F6]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{showBoxes ? 'Hide Boxes' : 'Show Boxes'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6E0] px-3 py-1.5 text-xs font-semibold text-[#064E3B] hover:bg-[#F5F8F6]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {/* Image Preview + YOLO Bounding Box Overlay */}
              <div className="relative overflow-hidden rounded-xl border border-[#DCE6E0] bg-[#0F172A]">
                <img
                  src={imageUrl}
                  alt="Waste sample under AI analysis"
                  referrerPolicy="no-referrer"
                  className="max-h-[380px] w-full object-contain bg-[#F5F8F6]"
                />
                {showBoxes &&
                  result &&
                  result.boundingBoxes.map((box, index) => (
                    <div
                      key={index}
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                        borderColor: accentColor,
                      }}
                      className="pointer-events-none absolute rounded-md border-2 bg-white/5"
                    >
                      <span
                        style={{ backgroundColor: accentColor }}
                        className="absolute -top-6 left-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold text-white whitespace-nowrap shadow-xs"
                      >
                        {box.label} {box.confidence}%
                      </span>
                    </div>
                  ))}
                {analyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#022C22]/70 text-white backdrop-blur-xs">
                    <Loader2 className="h-9 w-9 animate-spin text-[#A7F3D0]" />
                    <p className="mt-3 font-display text-sm font-bold">
                      Running YOLO &amp; OpenCV Waste Analysis...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sample Test Gallery */}
          <div className="mt-6 border-t border-[#EEF3F0] pt-5">
            <p className="text-xs font-semibold text-[#374151]">
              Quick Test Samples (click any photo to run instant AI detection):
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SAMPLE_WASTE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSampleClick(preset)}
                  className="group overflow-hidden rounded-xl border border-[#DCE6E0] bg-white text-left transition-all hover:border-[#059669] hover:shadow-xs"
                >
                  <img
                    src={preset.imageUrl}
                    alt={preset.label}
                    referrerPolicy="no-referrer"
                    className="h-20 w-full object-cover"
                  />
                  <div className="p-2">
                    <p className="truncate text-xs font-bold text-[#022C22]">
                      {preset.category}
                    </p>
                    <p className="truncate text-[11px] text-[#6B7280]">{preset.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT: AI Detection Result Panel */}
        <section className="rounded-2xl border border-[#E2EAE5] bg-white p-6 lg:col-span-5">
          <h3 className="font-display text-base font-bold text-[#022C22]">
            AI Detection Result
          </h3>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            Connects to Flask <code className="font-mono text-[#064E3B]">POST /api/detect</code>{' '}
            when available
          </p>

          {!result && !analyzing && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#DCE6E0] bg-[#F8FBF9] px-6 py-14 text-center">
              <ScanSearch className="h-10 w-10 text-[#9CA3AF]" />
              <p className="mt-3 text-sm font-semibold text-[#374151]">
                No image analyzed yet
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                Upload a waste image or click one of the sample inspection photos on the left to
                view category predictions, confidence score, and disposal routing.
              </p>
            </div>
          )}

          {result && (
            <div className="mt-5 space-y-5">
              {/* Mock vs Live Source Notice */}
              {result.isMockResult ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold">Simulated Result (Flask API Offline)</p>
                    <p className="mt-0.5 text-[11px] text-amber-800">
                      Start the Flask YOLO/OpenCV server and configure its URL in Settings for live
                      model inference.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-2.5 text-xs font-semibold text-[#064E3B]">
                  <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                  <span>Live Flask YOLO/OpenCV Detection</span>
                </div>
              )}

              {/* Category Highlight Card */}
              <div className="rounded-xl border border-[#DCE6E0] bg-[#F8FBF9] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#6B7280]">
                    Detected Waste Category
                  </span>
                  <span className="text-xs font-semibold text-[#059669]">
                    {result.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 rounded-sm shrink-0"
                    style={{ backgroundColor: accentColor }}
                  />
                  <p className="font-display text-2xl font-extrabold text-[#022C22]">
                    {result.category}
                  </p>
                </div>
                <p className="mt-1 text-xs font-medium text-[#374151]">
                  {result.detectedLabel}
                </p>

                {/* Confidence Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#4B5563]">Model Confidence</span>
                    <span className="font-mono font-bold text-[#022C22] tabular-nums">
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#DCE6E0]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${result.confidence}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Technical Summary Metadata (Clean Key-Value Rows) */}
              <dl className="divide-y divide-[#EEF3F0] rounded-xl border border-[#E2EAE5] text-xs">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-[#6B7280]">Engine</dt>
                  <dd className="font-medium text-[#1F2937] text-right">
                    {result.modelEngine}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-[#6B7280]">Estimated Volume</dt>
                  <dd className="font-mono font-semibold text-[#022C22] tabular-nums">
                    ~{result.estimatedWeightKg} kg
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-[#6B7280]">Objects Highlighted</dt>
                  <dd className="font-mono font-semibold text-[#022C22] tabular-nums">
                    {result.boundingBoxes.length} regions
                  </dd>
                </div>
              </dl>

              {/* Municipal Disposal Guidance */}
              <div className="rounded-xl bg-[#ECFDF5] p-4">
                <p className="text-xs font-bold text-[#064E3B]">
                  Recommended Municipal Action
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#1F4B3B]">
                  {result.disposalGuidance}
                </p>
              </div>

              {/* Action CTA: Report Garbage with This Photo */}
              <button
                type="button"
                onClick={() =>
                  onReportWithDetection({
                    imageUrl,
                    category: result.category,
                    confidence: result.confidence,
                    title: `${result.detectedLabel} reported via AI scan`,
                  })
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#064E3B] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#022C22]"
              >
                <span>File Complaint with This Photo</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
