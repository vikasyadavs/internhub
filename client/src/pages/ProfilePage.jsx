import { useState } from 'react';
import { User, Lock, Building2, Calendar, LogOut, Save, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays } from 'date-fns';

const ROLE_LABELS = {
  admin: 'Administrator',
  it_intern: 'IT Intern — Site4People',
  bd_intern: 'Business Development Intern',
  recruitment_intern: 'Recruitment Intern — SI Placements',
};

const COMPANY_LABELS = {
  site4people: 'Site4People (Powered by SI Placements Internationals)',
  si_placements: 'SI Placements Internationals',
};

export default function ProfilePage() {
  const { user, logout, isAdmin } = useAuth();
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const batchProgress = (() => {
    if (!user?.batch_start || !user?.batch_end) return null;
    const start = parseISO(user.batch_start);
    const end = parseISO(user.batch_end);
    const total = differenceInDays(end, start);
    const done = Math.min(differenceInDays(new Date(), start), total);
    const pct = Math.round((done / total) * 100);
    return { total, done: Math.max(0, done), pct: Math.max(0, Math.min(100, pct)), end };
  })();

  const daysLeft = batchProgress?.end
    ? Math.max(0, differenceInDays(batchProgress.end, new Date()))
    : null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passForm.currentPassword || !passForm.newPassword) return toast.error('All fields required');
    if (passForm.newPassword !== passForm.confirmPassword) return toast.error('New passwords do not match');
    if (passForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const togglePass = (field) => setShowPass(s => ({ ...s, [field]: !s[field] }));

  const companyColor = user?.company === 'site4people' ? 'from-blue-600 to-purple-600' : 'from-purple-700 to-violet-800';

  return (
    <div className="max-w-2xl space-y-6 animate-slide-up">
      {/* Profile card */}
      <div className="card overflow-hidden">
        {/* Header gradient */}
        <div className={`h-24 bg-gradient-to-r ${companyColor} rounded-xl mb-0 -mx-6 -mt-6 relative`}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-8 w-16 h-16 rounded-full bg-white/40" />
            <div className="absolute bottom-2 left-12 w-24 h-24 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Avatar + info */}
        <div className="-mt-10 px-2">
          <div className="flex items-end gap-4 mb-4">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${companyColor} flex items-center justify-center text-white text-3xl font-extrabold shadow-lg border-4 border-white`}>
              {user?.full_name?.charAt(0)}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-extrabold text-navy">{user?.full_name}</h2>
              <p className="text-sm text-gray-500">@{user?.username}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: User, label: 'Role', value: ROLE_LABELS[user?.role] || user?.role },
              { icon: Building2, label: 'Company', value: COMPANY_LABELS[user?.company] || user?.company },
              { icon: Zap, label: 'Department', value: user?.department || 'Not specified' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                  <item.icon size={15} className="text-purple-DEFAULT" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                  <p className="text-sm font-semibold text-navy">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Internship progress */}
      {batchProgress && !isAdmin() && (
        <div className="card">
          <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-blue-DEFAULT" />
            Internship Progress
          </h3>
          <div className="flex items-center justify-between text-sm mb-3">
            <div>
              <p className="text-xs text-gray-500">Batch Start</p>
              <p className="font-bold text-navy">{format(parseISO(user.batch_start), 'MMM d, yyyy')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold bg-gradient-purple-blue bg-clip-text text-transparent">{batchProgress.pct}%</p>
              <p className="text-xs text-gray-400">Complete</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Batch End</p>
              <p className="font-bold text-navy">{format(parseISO(user.batch_end), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
            <div
              className="bg-gradient-purple-blue h-3 rounded-full transition-all duration-700"
              style={{ width: `${batchProgress.pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{batchProgress.done} days completed</span>
            <span className="font-semibold text-purple-DEFAULT">{daysLeft} days remaining</span>
          </div>
        </div>
      )}

      {/* Change password */}
      <div className="card">
        <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
          <Lock size={16} className="text-purple-DEFAULT" />
          Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { key: 'currentPassword', label: 'Current Password', field: 'current' },
            { key: 'newPassword', label: 'New Password', field: 'new' },
            { key: 'confirmPassword', label: 'Confirm New Password', field: 'confirm' },
          ].map(({ key, label, field }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <input
                  type={showPass[field] ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={passForm[key]}
                  onChange={e => setPassForm(f => ({ ...f, [key]: e.target.value }))}
                />
                <button type="button" onClick={() => togglePass(field)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={15} />
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-navy">Sign Out</p>
            <p className="text-xs text-gray-500 mt-0.5">You'll need to sign in again to access InternHub</p>
          </div>
          <button onClick={logout} className="btn-danger flex items-center gap-2">
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
