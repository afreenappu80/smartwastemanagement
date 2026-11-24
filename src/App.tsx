import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import {
  DEFAULT_SETTINGS,
  DEMO_ADMIN_USER,
  DEMO_CITIZEN_USER,
  SEED_COMPLAINTS,
  SEED_NOTIFICATIONS,
  SEED_WORKERS,
} from './data/seedData';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AssignWorkersPage } from './pages/AssignWorkersPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DetectWastePage } from './pages/DetectWastePage';
import { MyComplaintsPage } from './pages/MyComplaintsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportGarbagePage } from './pages/ReportGarbagePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrackComplaintsPage } from './pages/TrackComplaintsPage';
import {
  checkFlaskHealth,
  submitComplaintToFlask,
  updateComplaintOnFlask,
} from './services/flaskApi';
import type {
  AppSettings,
  BackendStatus,
  Complaint,
  ComplaintStatus,
  Coordinates,
  NotificationItem,
  PageRoute,
  UserProfile,
  WasteCategory,
  Worker,
} from './types/waste';
import { generateNextComplaintId } from './utils/wasteLogic';

const STORAGE_KEYS = {
  user: 'wastesmart_session_user_v1',
  rememberedEmail: 'wastesmart_remember_email_v1',
  complaints: 'wastesmart_complaints_v1',
  notifications: 'wastesmart_notifications_v1',
  settings: 'wastesmart_settings_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return params.get('role') === 'admin' ? DEMO_ADMIN_USER : DEMO_CITIZEN_USER;
    }
    return readStorage<UserProfile | null>(STORAGE_KEYS.user, null);
  });

  const [rememberedEmail, setRememberedEmail] = useState<string>(() =>
    readStorage<string>(STORAGE_KEYS.rememberedEmail, '')
  );

  const [complaints, setComplaints] = useState<Complaint[]>(() =>
    readStorage<Complaint[]>(STORAGE_KEYS.complaints, SEED_COMPLAINTS)
  );
  const [workers] = useState<Worker[]>(SEED_WORKERS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    readStorage<NotificationItem[]>(STORAGE_KEYS.notifications, SEED_NOTIFICATIONS)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    readStorage<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  );

  const [activePage, setActivePage] = useState<PageRoute>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [trackedComplaintId, setTrackedComplaintId] = useState<string | null>(
    SEED_COMPLAINTS[0]?.id ?? null
  );
  const [reportPrefill, setReportPrefill] = useState<{
    imageUrl?: string;
    category?: WasteCategory;
    confidence?: number;
    title?: string;
  } | null>(null);

  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    connected: false,
    mode: 'demo-local',
    lastCheckedAt: '--',
    message: 'Checking Flask API...',
  });

  // Persist non-sensitive demo state cleanly
  useEffect(() => {
    try {
      if (user) window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      else window.localStorage.removeItem(STORAGE_KEYS.user);
    } catch {
      // ignore quota errors
    }
  }, [user]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.complaints, JSON.stringify(complaints));
    } catch {
      // ignore
    }
  }, [complaints]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Probe Flask connectivity only when Live Flask API mode is enabled
  useEffect(() => {
    if (!settings.useLiveFlaskApi) {
      setBackendStatus({
        connected: false,
        mode: 'demo-local',
        lastCheckedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: 'Running in Demo Mode — enable Live Flask API in Settings when your Flask server is online.',
      });
      return;
    }
    let active = true;
    void checkFlaskHealth(settings.flaskApiBaseUrl).then((st) => {
      if (active) setBackendStatus(st);
    });
    return () => {
      active = false;
    };
  }, [settings.flaskApiBaseUrl, settings.useLiveFlaskApi]);

  const handleAuthenticated = (authenticatedUser: UserProfile, remember: boolean) => {
    setUser(authenticatedUser);
    setActivePage('dashboard');
    try {
      if (remember) {
        setRememberedEmail(authenticatedUser.email);
        window.localStorage.setItem(
          STORAGE_KEYS.rememberedEmail,
          JSON.stringify(authenticatedUser.email)
        );
      } else {
        setRememberedEmail('');
        window.localStorage.removeItem(STORAGE_KEYS.rememberedEmail);
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActivePage('dashboard');
    setMobileMenuOpen(false);
  };

  const handleSwitchRole = () => {
    if (!user) return;
    const nextUser = user.role === 'admin' ? DEMO_CITIZEN_USER : DEMO_ADMIN_USER;
    setUser(nextUser);
    setActivePage('dashboard');
  };

  const handleTrackComplaint = (complaintId: string) => {
    setTrackedComplaintId(complaintId);
    setActivePage('track-complaints');
  };

  const handleSubmitComplaint = async (draft: {
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
  }) => {
    const nowFormatted = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newId = generateNextComplaintId(complaints);

    const newComplaint: Complaint = {
      id: newId,
      citizenId: user?.id ?? 'cit-101',
      citizenName: user?.name ?? 'Citizen User',
      title: draft.title,
      description: draft.description,
      category: draft.category,
      aiDetected: draft.aiDetected,
      aiConfidence: draft.aiConfidence,
      status: 'Pending',
      severity: draft.severity,
      locationName: draft.locationName,
      ward: draft.ward,
      coordinates: draft.coordinates,
      imageUrl: draft.imageUrl,
      reportedAt: nowFormatted,
      updatedAt: nowFormatted,
      assignedWorkerId: null,
      assignedWorkerName: null,
      estimatedWeightKg: draft.estimatedWeightKg,
    };

    const { savedToFlask, complaint } = await submitComplaintToFlask(
      settings.flaskApiBaseUrl,
      newComplaint,
      settings.useLiveFlaskApi
    );

    setComplaints((prev) => [complaint, ...prev]);
    setTrackedComplaintId(complaint.id);
    setReportPrefill(null);

    setNotifications((prev) => [
      {
        id: `ntf-${Date.now()}`,
        title: `New Complaint ${complaint.id} Submitted`,
        message: `${complaint.category} waste reported at ${complaint.locationName}.`,
        timestamp: 'Just now',
        read: false,
        type: 'complaint',
        complaintId: complaint.id,
        audience: 'all',
      },
      ...prev,
    ]);

    return { complaint, savedToFlask };
  };

  const handleUpdateComplaint = (
    complaintId: string,
    patch: {
      status?: ComplaintStatus;
      assignedWorkerId?: string | null;
      assignedWorkerName?: string | null;
    }
  ) => {
    const nowFormatted = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        return {
          ...c,
          ...patch,
          updatedAt: nowFormatted,
          resolutionNotes:
            patch.status === 'Resolved'
              ? c.resolutionNotes || 'Site cleared and verified clean by municipal team.'
              : c.resolutionNotes,
        };
      })
    );

    void updateComplaintOnFlask(
      settings.flaskApiBaseUrl,
      complaintId,
      patch,
      settings.useLiveFlaskApi
    );

    const notifTitle =
      patch.status === 'Resolved'
        ? `Complaint ${complaintId} Resolved`
        : patch.assignedWorkerName
        ? `Worker Assigned to ${complaintId}`
        : `Complaint ${complaintId} Updated`;
    const notifMsg =
      patch.status === 'Resolved'
        ? 'Municipal team verified the location is clear and closed the complaint.'
        : patch.assignedWorkerName
        ? `${patch.assignedWorkerName} has been dispatched to handle ${complaintId}.`
        : `Complaint status changed to ${patch.status}.`;

    setNotifications((prev) => [
      {
        id: `ntf-${Date.now()}`,
        title: notifTitle,
        message: notifMsg,
        timestamp: 'Just now',
        read: false,
        type: patch.status === 'Resolved' ? 'resolved' : 'assignment',
        complaintId,
        audience: 'all',
      },
      ...prev,
    ]);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleUpdateProfile = (patch: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleUpdateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleTestBackend = async (url: string) => {
    const st = await checkFlaskHealth(url);
    setBackendStatus(st);
    return st;
  };

  const handleResetDemoData = () => {
    setComplaints(SEED_COMPLAINTS);
    setNotifications(SEED_NOTIFICATIONS);
    setTrackedComplaintId(SEED_COMPLAINTS[0]?.id ?? null);
  };

  if (!user) {
    return (
      <AuthPage
        flaskApiBaseUrl={settings.flaskApiBaseUrl}
        onAuthenticated={handleAuthenticated}
        initialRememberedEmail={rememberedEmail}
      />
    );
  }

  const visibleNotifications = notifications.filter(
    (n) => n.audience === 'all' || n.audience === user.role
  );
  const unreadNotificationsCount = visibleNotifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F5F8F6] text-[#1F2937]">
      <Sidebar
        role={user.role}
        activePage={activePage}
        unreadNotifications={unreadNotificationsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigate={(page) => setActivePage(page)}
        onLogout={handleLogout}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <TopHeader
          user={user}
          activePage={activePage}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onSearchSubmit={() => {
            setActivePage(user.role === 'admin' ? 'all-complaints' : 'my-complaints');
          }}
          notifications={visibleNotifications}
          backendStatus={backendStatus}
          onMarkNotificationRead={handleMarkNotificationRead}
          onNavigate={(page) => setActivePage(page)}
          onSwitchRole={handleSwitchRole}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setMobileMenuOpen((o) => !o)}
        />

        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {activePage === 'dashboard' && (
            <DashboardPage
              user={user}
              complaints={complaints}
              onNavigate={setActivePage}
              onTrackComplaint={handleTrackComplaint}
            />
          )}

          {activePage === 'report-garbage' && (
            <ReportGarbagePage
              user={user}
              flaskApiBaseUrl={settings.flaskApiBaseUrl}
              prefillData={reportPrefill}
              onSubmitComplaint={handleSubmitComplaint}
              onTrackComplaint={handleTrackComplaint}
            />
          )}

          {activePage === 'detect-waste' && (
            <DetectWastePage
              flaskApiBaseUrl={settings.flaskApiBaseUrl}
              onReportWithDetection={(payload) => {
                setReportPrefill(payload);
                setActivePage('report-garbage');
              }}
            />
          )}

          {activePage === 'my-complaints' && (
            <MyComplaintsPage
              user={user}
              complaints={complaints}
              globalSearch={globalSearch}
              onTrackComplaint={handleTrackComplaint}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'all-complaints' && (
            <AdminComplaintsPage
              complaints={complaints}
              workers={workers}
              globalSearch={globalSearch}
              compactTables={settings.compactTables}
              onUpdateComplaint={handleUpdateComplaint}
              onTrackComplaint={handleTrackComplaint}
            />
          )}

          {activePage === 'track-complaints' && (
            <TrackComplaintsPage
              complaints={complaints}
              selectedComplaintId={trackedComplaintId}
              onSelectComplaintId={setTrackedComplaintId}
              backendStatus={backendStatus}
            />
          )}

          {activePage === 'assign-workers' && (
            <AssignWorkersPage
              workers={workers}
              complaints={complaints}
              onAssignWorker={(complaintId, workerId, workerName, status) =>
                handleUpdateComplaint(complaintId, {
                  assignedWorkerId: workerId,
                  assignedWorkerName: workerName,
                  status,
                })
              }
            />
          )}

          {activePage === 'analytics' && <AnalyticsPage complaints={complaints} />}

          {activePage === 'reports' && <ReportsPage complaints={complaints} />}

          {activePage === 'notifications' && (
            <NotificationsPage
              notifications={visibleNotifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onTrackComplaint={handleTrackComplaint}
            />
          )}

          {activePage === 'profile' && (
            <ProfilePage
              user={user}
              complaints={complaints}
              onUpdateProfile={handleUpdateProfile}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              user={user}
              settings={settings}
              backendStatus={backendStatus}
              onUpdateProfile={handleUpdateProfile}
              onUpdateSettings={handleUpdateSettings}
              onTestBackend={handleTestBackend}
              onResetDemoData={handleResetDemoData}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>
    </div>
  );
}
