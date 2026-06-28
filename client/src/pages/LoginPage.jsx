import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Clock, Building2, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Welcome back! 👋');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* ── Left panel – branding with background image ── */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between relative overflow-hidden">
        {/* Background image with high quality visual overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.85)), url(/login_bg.png)',
          }}
        />

        {/* Glowing orb decorations */}
        <div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-purple-600 opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-blue-600 opacity-10 blur-3xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-14 justify-between">
          {/* Logo + App name */}
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SI Placements Logo" className="w-14 h-14 object-contain drop-shadow-lg" />
            <div>
              <span className="text-2xl font-extrabold text-white tracking-tight">InternHub</span>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">by SI Placements Internationals</p>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-md my-auto">
            <h2 className="text-5xl font-extrabold text-white leading-tight mb-5">
              Your daily ops<br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                command center
              </span>
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-10">
              Attendance, tasks, pipeline, reports — everything you need to crush your internship, in one place.
            </p>

            {/* Feature pills */}
            <div className="space-y-3">
              {[
                { icon: Clock, label: 'Working Hours', value: 'Mon–Sat, 10:00 AM – 7:00 PM' },
                { icon: Building2, label: 'Companies', value: 'SI Placements Internationals & Site4People' },
                { icon: Users, label: 'Duration', value: '2-month internship batches · 60 working days' },
              ].map(item => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <item.icon size={18} className="text-purple-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                    <p className="text-sm text-white font-semibold">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company branding footer */}
          <div className="mt-auto pt-4 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">SI Placements Internationals &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      {/* ── Right panel – login form ── */}
      <div className="w-full lg:w-[460px] flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <span className="text-xl font-bold text-navy">InternHub</span>
              <p className="text-xs text-gray-400">by SI Placements Internationals</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-7">
            {/* Logo header inside card (desktop) */}
            <div className="hidden lg:flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
              <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
              <div>
                <p className="text-xs font-bold text-navy leading-none">SI Placements Internationals</p>
                <p className="text-xs text-gray-400 mt-0.5">& Site4People</p>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-navy mb-1">Welcome back 👋</h1>
            <p className="text-gray-500 text-sm mb-6">Sign in to your InternHub account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all duration-200"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all duration-200"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-md mt-2"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #2563EB)' }}
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Signing in...' : 'Sign in →'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            InternHub · Built for SI Placements Internationals & Site4People
          </p>
        </div>
      </div>
    </div>
  );
}
