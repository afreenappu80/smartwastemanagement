import type {
  BackendStatus,
  Complaint,
  ComplaintStatus,
  DetectionResult,
  UserProfile,
  UserRole,
  WasteCategory,
} from '../types/waste';
import { buildSimulatedDetection, CATEGORY_GUIDANCE } from '../utils/wasteLogic';

const REQUEST_TIMEOUT_MS = 2200;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function checkFlaskHealth(baseUrl: string): Promise<BackendStatus> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  try {
    const res = await fetchWithTimeout(`${cleanUrl}/api/health`, { method: 'GET' }, 1600);
    if (res.ok) {
      return {
        connected: true,
        mode: 'live-flask',
        lastCheckedAt: now,
        message: `Connected to Flask API at ${cleanUrl}`,
      };
    }
  } catch {
    // Expected when Flask server is not running locally in preview
  }

  return {
    connected: false,
    mode: 'demo-local',
    lastCheckedAt: now,
    message: `Flask API unreachable at ${cleanUrl} — running in Demo Mode`,
  };
}

export async function authenticateWithFlask(
  baseUrl: string,
  payload: {
    mode: 'login' | 'register';
    name?: string;
    email: string;
    password: string;
    role: UserRole;
  },
  enabled = false
): Promise<{ user: UserProfile; viaFlask: boolean }> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = payload.mode === 'login' ? '/api/auth/login' : '/api/auth/register';

  if (enabled) {
    try {
      const res = await fetchWithTimeout(`${cleanUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          role: payload.role,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          return { user: data.user as UserProfile, viaFlask: true };
        }
      }
    } catch {
      // Fallback to Demo Mode auth without persisting passwords
    }
  }

  const displayName =
    payload.name?.trim() ||
    payload.email
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  return {
    viaFlask: false,
    user: {
      id: payload.role === 'admin' ? 'adm-001' : 'cit-101',
      name: displayName || (payload.role === 'admin' ? 'Priya Menon' : 'Aarav Sharma'),
      email: payload.email.trim(),
      role: payload.role,
      phone: '+91 98450 21490',
      ward:
        payload.role === 'admin'
          ? 'Central Municipal Operations'
          : 'Ward 4 - Greenpark Avenue',
      joinedAt: new Date().toISOString().slice(0, 10),
    },
  };
}

export async function submitComplaintToFlask(
  baseUrl: string,
  complaint: Complaint,
  enabled = false
): Promise<{ savedToFlask: boolean; complaint: Complaint }> {
  if (enabled) {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    try {
      const res = await fetchWithTimeout(`${cleanUrl}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaint),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          savedToFlask: true,
          complaint: (data?.complaint as Complaint) || complaint,
        };
      }
    } catch {
      // Graceful local persistence fallback
    }
  }
  return { savedToFlask: false, complaint };
}

export async function updateComplaintOnFlask(
  baseUrl: string,
  complaintId: string,
  patch: {
    status?: ComplaintStatus;
    assignedWorkerId?: string | null;
    assignedWorkerName?: string | null;
    resolutionNotes?: string;
  },
  enabled = false
): Promise<{ syncedToFlask: boolean }> {
  if (!enabled) return { syncedToFlask: false };
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  try {
    const res = await fetchWithTimeout(`${cleanUrl}/api/complaints/${complaintId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return { syncedToFlask: res.ok };
  } catch {
    return { syncedToFlask: false };
  }
}

async function sampleCanvasColorProfile(
  imageSrc: string
): Promise<{ greenRatio: number; blueRatio: number; grayRatio: number } | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(undefined);
        ctx.drawImage(img, 0, 0, 48, 48);
        const { data } = ctx.getImageData(0, 0, 48, 48);
        let greenHits = 0;
        let blueHits = 0;
        let grayHits = 0;
        const total = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (g > r + 15 && g > b + 10) greenHits++;
          else if (b > r + 15 && b > g + 5) blueHits++;
          else if (Math.abs(r - g) < 16 && Math.abs(g - b) < 16) grayHits++;
        }
        resolve({
          greenRatio: greenHits / total,
          blueRatio: blueHits / total,
          grayRatio: grayHits / total,
        });
      } catch {
        resolve(undefined);
      }
    };
    img.onerror = () => resolve(undefined);
    img.src = imageSrc;
  });
}

export async function detectWasteWithFlask(
  baseUrl: string,
  input: { file?: File | null; imageUrl: string; filenameHint: string },
  enabled = false
): Promise<DetectionResult> {
  if (enabled) {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    try {
      let res: Response;
      if (input.file) {
        const formData = new FormData();
        formData.append('image', input.file);
        res = await fetchWithTimeout(
          `${cleanUrl}/api/detect`,
          { method: 'POST', body: formData },
          3500
        );
      } else {
        res = await fetchWithTimeout(
          `${cleanUrl}/api/detect`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: input.imageUrl, filename: input.filenameHint }),
          },
          2500
        );
      }

      if (res.ok) {
        const data = await res.json();
        const category = (['Organic', 'Plastic', 'Metal', 'Others'].includes(data.category)
          ? data.category
          : 'Others') as WasteCategory;
        const confidence = Math.min(100, Math.max(1, Math.round(Number(data.confidence ?? 90))));
        return {
          category,
          detectedLabel: data.detectedLabel || `${category} Waste Detected`,
          confidence,
          status: confidence >= 85 ? 'Detected' : 'Low Confidence',
          modelEngine: data.modelEngine || 'Flask YOLOv8 + OpenCV Live API',
          isMockResult: false,
          disposalGuidance: data.disposalGuidance || CATEGORY_GUIDANCE[category],
          estimatedWeightKg: Number(data.estimatedWeightKg ?? 18),
          boundingBoxes: Array.isArray(data.boundingBoxes) ? data.boundingBoxes : [],
          analyzedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Expected fallback when Flask AI server is offline
    }
  }

  // Clearly labelled simulated detection using actual image color heuristics
  const colorProfile = await sampleCanvasColorProfile(input.imageUrl);
  return buildSimulatedDetection(input.filenameHint, colorProfile);
}
