import { useState } from 'react';
import { Calendar, CheckCircle2, Mail, MapPin, Phone, Shield } from 'lucide-react';
import type { Complaint, PageRoute, UserProfile } from '../types/waste';

interface ProfilePageProps {
  user: UserProfile;
  complaints: Complaint[];
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onNavigate: (page: PageRoute) => void;
}

export function ProfilePage({
  user,
  complaints,
  onUpdateProfile,
  onNavigate,
}: ProfilePageProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [ward, setWard] = useState(user.ward);
  const [saved, setSaved] = useState(false);

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const userComplaints = complaints.filter((c) => c.citizenId === user.id);
  const resolved = userComplaints.filter((c) => c.status === 'Resolved').length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateProfile({
      name: name.trim(),
      phone: phone.trim(),
      ward: ward.trim(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-[#022C22]">My Profile</h2>
        <p className="mt-1 text-sm text-[#4B5563]">
          Manage your WasteSmart civic identity and contact details for municipal updates.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Identity Summary Card */}
        <section className="rounded-2xl border border-[#E2EAE5] bg-white p-6 lg:col-span-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#064E3B] font-display text-2xl font-extrabold text-[#A7F3D0]">
              {initials}
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-[#022C22]">
              {user.name}
            </h3>
            <p className="text-xs font-semibold text-[#059669] capitalize">
              {user.role === 'admin' ? 'Municipal Administrator' : 'Registered Citizen'}
            </p>
          </div>

          <dl className="mt-6 space-y-3 border-t border-[#EEF3F0] pt-5 text-xs text-[#374151]">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-[#059669]" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-[#059669]" />
              <span className="font-mono tabular-nums">{user.phone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-[#059669]" />
              <span>{user.ward}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-[#059669]" />
              <span>Joined {user.joinedAt}</span>
            </div>
          </dl>

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-[#F5F8F6] p-3.5 text-center">
            <div>
              <p className="font-mono text-xl font-extrabold text-[#022C22] tabular-nums">
                {user.role === 'admin' ? complaints.length : userComplaints.length}
              </p>
              <p className="text-[11px] text-[#6B7280]">
                {user.role === 'admin' ? 'Total Managed' : 'My Reports'}
              </p>
            </div>
            <div>
              <p className="font-mono text-xl font-extrabold text-[#059669] tabular-nums">
                {user.role === 'admin'
                  ? complaints.filter((c) => c.status === 'Resolved').length
                  : resolved}
              </p>
              <p className="text-[11px] text-[#6B7280]">Resolved</p>
            </div>
          </div>
        </section>

        {/* Edit Form */}
        <section className="rounded-2xl border border-[#E2EAE5] bg-white p-6 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[#022C22]">
              Personal Information
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:text-[#064E3B]"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Security &amp; API Settings</span>
            </button>
          </div>

          {saved && (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-xs font-semibold text-[#064E3B]"
            >
              <CheckCircle2 className="h-4 w-4 text-[#059669]" />
              <span>Profile updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="prof-name"
                  className="block text-xs font-semibold text-[#374151]"
                >
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] px-4 py-2.5 text-sm text-[#1F2937] focus:border-[#059669] focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="prof-phone"
                  className="block text-xs font-semibold text-[#374151]"
                >
                  Phone Number
                </label>
                <input
                  id="prof-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] px-4 py-2.5 text-sm text-[#1F2937] focus:border-[#059669] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="prof-ward"
                className="block text-xs font-semibold text-[#374151]"
              >
                Residential Ward / Municipal Office
              </label>
              <input
                id="prof-ward"
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#DCE6E0] bg-[#F9FBFA] px-4 py-2.5 text-sm text-[#1F2937] focus:border-[#059669] focus:bg-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="rounded-xl bg-[#064E3B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#022C22]"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
