import { useMemo, useState } from 'react';
import { Eye, MapPin, Search, X } from 'lucide-react';
import { ComplaintStatusLabel, WasteCategoryText } from '../components/StatusText';
import type {
  Complaint,
  ComplaintStatus,
  WasteCategory,
  Worker,
} from '../types/waste';
import { filterComplaints } from '../utils/wasteLogic';

interface AdminComplaintsPageProps {
  complaints: Complaint[];
  workers: Worker[];
  globalSearch: string;
  compactTables: boolean;
  onUpdateComplaint: (
    complaintId: string,
    patch: {
      status?: ComplaintStatus;
      assignedWorkerId?: string | null;
      assignedWorkerName?: string | null;
    }
  ) => void;
  onTrackComplaint: (complaintId: string) => void;
}

export function AdminComplaintsPage({
  complaints,
  workers,
  globalSearch,
  compactTables,
  onUpdateComplaint,
  onTrackComplaint,
}: AdminComplaintsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<WasteCategory | 'All'>('All');
  const [previewComplaint, setPreviewComplaint] = useState<Complaint | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return filterComplaints(complaints, {
      search: search.trim() || globalSearch,
      status: statusFilter,
      category: categoryFilter,
    });
  }, [complaints, search, globalSearch, statusFilter, categoryFilter]);

  const showFeedback = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3200);
  };

  const handleWorkerChange = (complaintId: string, workerId: string) => {
    if (!workerId) {
      onUpdateComplaint(complaintId, {
        assignedWorkerId: null,
        assignedWorkerName: null,
        status: 'Pending',
      });
      showFeedback(`Unassigned worker from ${complaintId}.`);
      return;
    }
    const found = workers.find((w) => w.id === workerId);
    if (!found) return;
    onUpdateComplaint(complaintId, {
      assignedWorkerId: found.id,
      assignedWorkerName: found.name,
      status: 'Assigned',
    });
    showFeedback(`Assigned ${found.name} to ${complaintId}.`);
  };

  const handleStatusChange = (complaintId: string, status: ComplaintStatus) => {
    onUpdateComplaint(complaintId, { status });
    showFeedback(`Updated ${complaintId} status to ${status}.`);
  };

  const rowPad = compactTables ? 'py-2' : 'py-3.5';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-[#022C22]">
            All Complaints
          </h2>
          <p className="mt-1 text-sm text-[#4B5563]">
            Review citizen garbage photos, assign municipal field workers, and update live ticket
            statuses.
          </p>
        </div>
        {toastMessage && (
          <div
            role="status"
            className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2 text-xs font-semibold text-[#064E3B]"
          >
            {toastMessage}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#E2EAE5] bg-white p-4 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, citizen, street, or worker..."
            aria-label="Search all complaints"
            className="w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] py-2 pl-9 pr-3 text-xs text-[#1F2937] focus:border-[#059669] focus:bg-white"
          />
        </div>

        <div className="md:col-span-4">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | 'All')}
            className="w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] px-3 py-2 text-xs font-medium text-[#1F2937] focus:border-[#059669]"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            aria-label="Filter by waste category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as WasteCategory | 'All')}
            className="w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] px-3 py-2 text-xs font-medium text-[#1F2937] focus:border-[#059669]"
          >
            <option value="All">All Categories</option>
            <option value="Organic">Organic</option>
            <option value="Plastic">Plastic</option>
            <option value="Metal">Metal</option>
            <option value="Others">Others</option>
          </select>
        </div>
      </div>

      {/* Management Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E2EAE5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EEF3F0] bg-[#F8FAF9] font-semibold text-[#4B5563]">
                <th className="px-5 py-3">Photo &amp; ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location &amp; Citizen</th>
                <th className="px-4 py-3">Assign Worker</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF3F0]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[#F9FBFA]">
                  <td className={`px-5 ${rowPad}`}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewComplaint(c)}
                        aria-label={`Preview photo for ${c.id}`}
                        className="group relative h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-[#DCE6E0] bg-[#EEF3F0]"
                      >
                        <img
                          src={c.imageUrl}
                          alt={c.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </button>
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-[#064E3B]">{c.id}</p>
                        <p className="max-w-[200px] truncate font-medium text-[#1F2937]">
                          {c.title}
                        </p>
                        <p className="font-mono text-[11px] text-[#6B7280] tabular-nums">
                          {c.reportedAt}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className={`px-4 ${rowPad}`}>
                    <WasteCategoryText category={c.category} />
                    {c.aiDetected && (
                      <p className="mt-0.5 font-mono text-[11px] text-[#6B7280] tabular-nums">
                        AI {c.aiConfidence}%
                      </p>
                    )}
                  </td>

                  <td className={`px-4 ${rowPad}`}>
                    <p className="max-w-[210px] truncate font-medium text-[#1F2937]">
                      {c.locationName}
                    </p>
                    <p className="text-[11px] text-[#6B7280]">
                      {c.ward} · {c.citizenName}
                    </p>
                  </td>

                  <td className={`px-4 ${rowPad}`}>
                    <select
                      aria-label={`Assign worker for ${c.id}`}
                      value={c.assignedWorkerId ?? ''}
                      onChange={(e) => handleWorkerChange(c.id, e.target.value)}
                      className="w-44 rounded-lg border border-[#DCE6E0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1F2937] focus:border-[#059669]"
                    >
                      <option value="">Unassigned</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.availability})
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className={`px-4 ${rowPad}`}>
                    <select
                      aria-label={`Update status for ${c.id}`}
                      value={c.status}
                      onChange={(e) =>
                        handleStatusChange(c.id, e.target.value as ComplaintStatus)
                      }
                      className="w-34 rounded-lg border border-[#DCE6E0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#022C22] focus:border-[#059669]"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>

                  <td className={`px-5 ${rowPad} text-right`}>
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewComplaint(c)}
                        aria-label={`Inspect ${c.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE6E0] text-[#064E3B] hover:bg-[#ECFDF5]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onTrackComplaint(c.id)}
                        aria-label={`View ${c.id} on map`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE6E0] text-[#064E3B] hover:bg-[#ECFDF5]"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#6B7280]">
                    No complaints match your current search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image & Ticket Inspection Modal */}
      {previewComplaint && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Complaint ${previewComplaint.id} details`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#022C22]/65 p-4 backdrop-blur-xs"
          onClick={() => setPreviewComplaint(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#DCE6E0] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EEF3F0] px-5 py-4">
              <div>
                <p className="font-mono text-xs font-bold text-[#064E3B]">
                  {previewComplaint.id}
                </p>
                <h3 className="font-display text-base font-bold text-[#022C22]">
                  {previewComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewComplaint(null)}
                aria-label="Close complaint preview"
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F5F8F6] hover:text-[#022C22]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={previewComplaint.imageUrl}
              alt={previewComplaint.title}
              referrerPolicy="no-referrer"
              className="max-h-72 w-full bg-[#F5F8F6] object-cover"
            />
            <div className="space-y-3 p-5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <WasteCategoryText category={previewComplaint.category} />
                <ComplaintStatusLabel status={previewComplaint.status} />
              </div>
              <p className="leading-relaxed text-[#374151]">
                {previewComplaint.description}
              </p>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F5F8F6] p-3.5">
                <div>
                  <span className="text-[#6B7280]">Location</span>
                  <p className="mt-0.5 font-semibold text-[#1F2937]">
                    {previewComplaint.locationName}
                  </p>
                </div>
                <div>
                  <span className="text-[#6B7280]">GPS Coordinates</span>
                  <p className="mt-0.5 font-mono text-[#1F2937] tabular-nums">
                    {previewComplaint.coordinates.lat.toFixed(5)},{' '}
                    {previewComplaint.coordinates.lng.toFixed(5)}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = previewComplaint.id;
                    setPreviewComplaint(null);
                    onTrackComplaint(id);
                  }}
                  className="rounded-xl bg-[#064E3B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#022C22]"
                >
                  Open on Map &amp; Timeline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
