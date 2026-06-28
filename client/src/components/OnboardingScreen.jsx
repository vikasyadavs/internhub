import { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle, ArrowRight, Zap, ClipboardCheck, CheckSquare, Users, Briefcase, UserSearch } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ROLE_SECTIONS = {
  it_intern: [
    { icon: CheckSquare, label: 'Tasks', desc: 'View and update your assigned development tasks', path: '/tasks' },
    { icon: ClipboardCheck, label: 'Attendance', desc: 'Mark your daily attendance and track your hours', path: '/attendance' },
  ],
  bd_intern: [
    { icon: Briefcase, label: 'BD Pipeline', desc: 'Add leads, log calls, and track your deals', path: '/clients' },
    { icon: ClipboardCheck, label: 'Attendance', desc: 'Mark your daily attendance and track field visits', path: '/attendance' },
  ],
  recruitment_intern: [
    { icon: UserSearch, label: 'Recruitment', desc: 'Manage candidates through your hiring pipeline', path: '/recruitment' },
    { icon: ClipboardCheck, label: 'Attendance', desc: 'Mark your daily attendance', path: '/attendance' },
  ],
  employee: [
    { icon: CheckSquare, label: 'Tasks', desc: 'Your assigned tasks and project work', path: '/tasks' },
    { icon: ClipboardCheck, label: 'Attendance', desc: 'Mark your daily attendance', path: '/attendance' },
  ],
};

export default function OnboardingScreen({ onComplete }) {
  const { user, login } = useAuth();
  const [step, setStep] = useState('password'); // 'password' | 'welcome'
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]     = useState(false);
  const [showC, setShowC]   = useState(false);
  const [loading, setLoading] = useState(false);

  const sections = ROLE_SECTIONS[user?.role] || ROLE_SECTIONS.it_intern;

  const companyName = user?.company === 'site4people' ? 'Site4People' : 'SI Placements Internationals';
  const roleLabel   = (user?.role || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirm)  { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      await api.post('/auth/complete-first-login', { newPassword: password });
      toast.success('Password updated!');
      setStep('welcome');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  /* ── Step 1: Force password change ── */
  if (step === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-bounce-in">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-purple-blue flex items-center justify-center shadow-glow-purple">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">InternHub</h1>
              <p className="text-xs text-slate-400">{companyName}</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-modal">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <Lock size={24} className="text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Set Your Password</h2>
              <p className="text-sm text-slate-400 mt-1">
                Welcome, <span className="text-purple-400 font-semibold">{user?.full_name}</span>! Please set a secure password before continuing.
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="input bg-white/10 border-white/20 text-white placeholder-slate-500 pr-12"
                    required
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white no-min-tap">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showC ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="input bg-white/10 border-white/20 text-white placeholder-slate-500 pr-12"
                    required
                  />
                  <button type="button" onClick={() => setShowC(!showC)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white no-min-tap">
                    {showC ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password strength */}
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= i * 3 ? 'bg-purple-500' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {password.length < 6 ? 'Too short' : password.length < 10 ? 'Good' : password.length < 14 ? 'Strong' : 'Very strong'}
                  </p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Set Password <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 2: Welcome / Onboarding Screen ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-bounce-in">
        {/* Confetti-like header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-purple-blue flex items-center justify-center mx-auto mb-4 shadow-glow-purple">
            <CheckCircle size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            Welcome to InternHub!
          </h1>
          <p className="text-slate-300 mt-2">
            Hello, <span className="text-purple-400 font-bold">{user?.full_name}</span> 👋
          </p>
        </div>

        {/* Internship info card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Company</p>
              <p className="text-white font-semibold">{companyName}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Your Role</p>
              <p className="text-white font-semibold capitalize">{roleLabel}</p>
            </div>
            {user?.batch_start && (
              <div>
                <p className="text-slate-500 text-xs">Start Date</p>
                <p className="text-white font-semibold">{user.batch_start}</p>
              </div>
            )}
            {user?.batch_end && (
              <div>
                <p className="text-slate-500 text-xs">End Date</p>
                <p className="text-white font-semibold">{user.batch_end}</p>
              </div>
            )}
          </div>
        </div>

        {/* What you can do */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your Key Areas</p>
          <div className="space-y-3">
            {sections.map((sec) => (
              <div key={sec.path} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-purple-blue flex items-center justify-center shrink-0 no-min-tap">
                  <sec.icon size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{sec.label}</p>
                  <p className="text-slate-400 text-xs">{sec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleFinish} className="btn-primary w-full text-base py-3">
          Let's Get Started <ArrowRight size={18} />
        </button>
        <p className="text-center text-xs text-slate-500 mt-3">
          Office hours: 10 AM – 7 PM, Mon–Sat (Sunday Off)
        </p>
      </div>
    </div>
  );
}
