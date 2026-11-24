export type UserRole = 'citizen' | 'admin';

export type WasteCategory = 'Organic' | 'Plastic' | 'Metal' | 'Others';

export type ComplaintStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Resolved';

export type AnalyticsRange = '7d' | '30d' | '6m';

export type PageRoute =
  | 'dashboard'
  | 'report-garbage'
  | 'detect-waste'
  | 'my-complaints'
  | 'all-complaints'
  | 'track-complaints'
  | 'assign-workers'
  | 'analytics'
  | 'reports'
  | 'notifications'
  | 'profile'
  | 'settings';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  ward: string;
  joinedAt: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  label: string;
  confidence: number;
}

export interface DetectionResult {
  category: WasteCategory;
  detectedLabel: string;
  confidence: number; // 0-100
  status: 'Detected' | 'Low Confidence' | 'Review Required';
  modelEngine: string;
  isMockResult: boolean;
  disposalGuidance: string;
  estimatedWeightKg: number;
  boundingBoxes: BoundingBox[];
  analyzedAt: string;
}

export interface Complaint {
  id: string;
  citizenId: string;
  citizenName: string;
  title: string;
  description: string;
  category: WasteCategory;
  aiDetected: boolean;
  aiConfidence: number;
  status: ComplaintStatus;
  severity: 'Low' | 'Medium' | 'High';
  locationName: string;
  ward: string;
  coordinates: Coordinates;
  imageUrl: string;
  reportedAt: string;
  updatedAt: string;
  assignedWorkerId: string | null;
  assignedWorkerName: string | null;
  estimatedWeightKg: number;
  resolutionNotes?: string;
}

export interface Worker {
  id: string;
  name: string;
  roleTitle: string;
  ward: string;
  phone: string;
  availability: 'Available' | 'On Duty' | 'Off Shift';
  activeTasks: number;
  completedCount: number;
  vehicleCode: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'complaint' | 'assignment' | 'resolved' | 'ai';
  complaintId?: string;
  audience: 'all' | UserRole;
}

export interface AppSettings {
  flaskApiBaseUrl: string;
  useLiveFlaskApi: boolean;
  emailAlerts: boolean;
  statusPushAlerts: boolean;
  weeklyDigest: boolean;
  compactTables: boolean;
}

export interface BackendStatus {
  connected: boolean;
  mode: 'live-flask' | 'demo-local';
  lastCheckedAt: string;
  message: string;
}

export interface DashboardMetrics {
  totalComplaints: number;
  wasteDetectedCount: number;
  resolvedIssues: number;
  pendingComplaints: number;
  inProgressCount: number;
  resolutionRate: number;
  totalEstimatedKg: number;
}

export interface CategoryDistributionItem {
  category: WasteCategory;
  count: number;
  percentage: number;
  color: string;
}

export interface AnalyticsSnapshot {
  range: AnalyticsRange;
  rangeLabel: string;
  wasteCollectedKg: number;
  growthPercentage: number;
  trendLabels: string[];
  trendValuesKg: number[];
  monthlyLabels: string[];
  monthlyReported: number[];
  monthlyResolved: number[];
  areaStats: Array<{
    ward: string;
    total: number;
    resolved: number;
    collectedKg: number;
    resolutionRate: number;
  }>;
  totalComplaints: number;
  resolvedComplaints: number;
  resolutionRate: number;
}
