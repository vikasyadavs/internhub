import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  Users, ClipboardCheck, CheckSquare, TrendingUp,
  UserSearch, Briefcase, DollarSign, Megaphone,
  Clock, AlertCircle, CheckCircle2, PlayCircle, ArrowRight,
  Monitor, Award, UserPlus, FileText, BarChart2,
  Phone, Activity, Calendar, Zap, Bell, ChevronRight,
  Star, Target
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getBrowserLocation } from '../lib/location';
import TodaysTasksWidget from '../components/TodaysTasksWidget';

// ─── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, gradient, sub, onClick, highlight }) {
  return (
    <div
      className={`kpi-card ${gradient} ${onClick ? 'cursor-pointer' : ''} ${highlight ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
      onClick={onClick}
    >
      {/* Decorative circles */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-6 -left-4 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-xl bg-white/20">
            <Icon size={20} className="text-white" />
          </div>
          {highlight && (
            <span className="text-[10px] font-bold bg-orange-400 text-white px-2 py-0.5 rounded-full">
              URGENT
            </span>
          )}
        </div>
        <p className="text-3xl font-extrabold text-white mb-0.5">{value ?? '—'}</p>
        <p className="text-sm text-white/80 font-medium">{label}</p>
        {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Attendance Widget ──────────────────────────────────────────────────────
function AttendanceWidget({ attendance, onCheckIn, onCheckOut, onBreakStart, onBreakEnd, loading, user }) {
  const now = new Date();
  const isWorkDay = now.getDay() !== 0;
  const hour = now.getHours();
  const isWorkHours = true;
  const isOnline = user?.internship_mode === 'online';

  let currentBreak = null;
  try {
    currentBreak = attendance?.current_break 
      ? (typeof attendance.current_break === 'string' ? JSON.parse(attendance.current_break) : attendance.current_break)
      : null;
  } catch (e) {}

  let checkInLoc = null;
  try {
    checkInLoc = attendance?.check_in_location
      ? (typeof attendance.check_in_location === 'string' ? JSON.parse(attendance.check_in_location) : attendance.check_in_location)
      : null;
  } catch (e) {}

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-navy dark:text-white">Today's Attendance</h3>
          <p className="text-xs text-gray-500">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {attendance?.status && (
          <span className={`badge ${
            attendance.status === 'present' ? 'badge-green' :
            attendance.status === 'late' ? 'badge-yellow' :
            attendance.status === 'absent' ? 'badge-red' : 'badge-gray'
          }`}>
            {attendance.status}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Check In</p>
          <p className="font-bold text-green-700 dark:text-green-400 text-lg">{attendance?.check_in || '—'}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Check Out</p>
          <p className="font-bold text-orange-700 dark:text-orange-400 text-lg">{attendance?.check_out || '—'}</p>
        </div>
      </div>

      {checkInLoc?.address && (
        <div className="mb-4 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Logged Location</p>
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5" title={checkInLoc.address}>
            📍 {checkInLoc.address}
          </p>
        </div>
      )}

      {!isWorkDay && (
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm text-slate-500 dark:text-slate-400">
          <AlertCircle size={16} />
          <span>Sunday is a day off — enjoy! 🌟</span>
        </div>
      )}

      {isWorkDay && (
        <div className="flex flex-col gap-2">
          {!attendance?.check_in ? (
            <button
              onClick={onCheckIn}
              disabled={loading || !isWorkHours}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <PlayCircle size={16} />
              {loading ? 'Processing...' : isOnline ? 'Check In (Flexible)' : 'Request Location & Check In'}
            </button>
          ) : !attendance?.check_out ? (
            <div className="flex flex-col gap-2 w-full">
              {/* Break action buttons */}
              {!currentBreak ? (
                <button
                  onClick={onBreakStart}
                  disabled={loading}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-xs py-2"
                >
                  <Clock size={14} />
                  Start Break (1h lunch)
                </button>
              ) : (
                <button
                  onClick={onBreakEnd}
                  disabled={loading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-xl transition-all w-full flex items-center justify-center gap-2 text-xs"
                >
                  <Clock size={14} />
                  Break Over (Resume work)
                </button>
              )}

              {/* Checkout action button */}
              <button
                onClick={onCheckOut}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all w-full flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle2 size={16} />
                Check Out / Logout
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 bg-green-50 dark:bg-green-950/20 rounded-xl px-4 py-2.5 text-green-700 dark:text-green-400">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">All done for today! 🎉</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quick Action Button ────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl ${color} hover:scale-105 transition-all duration-200 group`}
    >
      <div className="p-3 rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
        <Icon size={20} className="text-white" />
      </div>
      <span className="text-xs font-semibold text-white text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── Today's Activity Row ───────────────────────────────────────────────────
function ActivityRow({ icon: Icon, iconBg, title, sub, badge, badgeCls }) {
  return (
    <div className="activity-item">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy truncate">{title}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className={`badge text-xs shrink-0 ${badgeCls || 'badge-gray'}`}>{badge}</span>
      )}
    </div>
  );
}

// ─── Upcoming Endings Card ──────────────────────────────────────────────────
function EndingsCard({ interns, onGenerateCert }) {
  if (!interns || interns.length === 0) {
    return (
      <div className="card">
        <h3 className="font-bold text-navy flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-orange-500" />
          Upcoming Endings
        </h3>
        <p className="text-sm text-gray-400 text-center py-6">No internships ending in the next 14 days 🎉</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-bold text-navy flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-orange-500" />
        Internship Endings (Next 14 Days)
        <span className="ml-auto badge badge-orange">{interns.length}</span>
      </h3>
      <div className="space-y-3">
        {interns.map(intern => {
          const daysLeft = differenceInDays(parseISO(intern.batch_end), new Date());
          return (
            <div key={intern.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
              <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {intern.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy truncate">{intern.full_name}</p>
                <p className="text-xs text-gray-500">
                  Ends {format(parseISO(intern.batch_end), 'MMM d')} · <span className={`font-medium ${daysLeft <= 3 ? 'text-red-600' : 'text-orange-600'}`}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
                </p>
              </div>
              <button
                onClick={() => onGenerateCert(intern)}
                className="text-xs bg-orange-500 hover:bg-orange-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Award size={12} />
                Cert
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, isAdmin, isBD, isRecruitment } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [adminKpis, setAdminKpis] = useState(null);
  const [todayActivity, setTodayActivity] = useState(null);
  const [upcomingEndings, setUpcomingEndings] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [attendLoading, setAttendLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myFollowups, setMyFollowups] = useState([]);
  const [myDocuments, setMyDocuments] = useState([]);

  const fetchAll = useCallback(async (force = false) => {
    const cacheKey = 'internhub_dashboard_cache';
    const cacheTimeKey = 'internhub_dashboard_cache_time';
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheTimeKey);
    const now = Date.now();

    if (!force && cachedData && cachedTime && (now - parseInt(cachedTime)) < 5 * 60 * 1000) {
      try {
        const parsed = JSON.parse(cachedData);
        setStats(parsed.stats || {});
        setAttendance(parsed.attendance);
        setActivities(parsed.activities || []);
        setAnnouncements(parsed.announcements || []);
        if (isAdmin()) {
          setAdminKpis(parsed.adminKpis);
          setTodayActivity(parsed.todayActivity);
          setUpcomingEndings(parsed.upcomingEndings || []);
          setRecentActions(parsed.recentActions || []);
        }
        setLoading(false);
        return;
      } catch (_) {}
    }

    try {
      const baseRequests = [
        api.get('/dashboard/stats'),
        api.get('/attendance/today'),
        api.get('/dashboard/recent-activity'),
        api.get('/announcements'),
      ];

      // Fetch role-specific data
      if (user?.role === 'recruitment_intern') {
        api.get('/recruitment/my-followups').then(r => setMyFollowups(r.data.followups || [])).catch(() => {});
      }
      // Always try to load my documents (for certificate download)
      if (user?.role !== 'admin') {
        api.get('/documents').then(r => setMyDocuments(r.data.documents || [])).catch(() => {});
      }

      if (isAdmin()) {
        baseRequests.push(
          api.get('/dashboard/admin-kpis'),
          api.get('/dashboard/today-activity'),
          api.get('/dashboard/upcoming-endings'),
          api.get('/dashboard/recent-actions'),
        );
      }

      const results = await Promise.allSettled(baseRequests);
      if (results[0].status === 'fulfilled') setStats(results[0].value.data.stats || {});
      if (results[1].status === 'fulfilled') setAttendance(results[1].value.data.attendance);
      if (results[2].status === 'fulfilled') setActivities(results[2].value.data.activities || []);
      if (results[3].status === 'fulfilled') setAnnouncements(results[3].value.data.announcements?.slice(0, 3) || []);
      
      let finalAdminKpis = null;
      let finalTodayActivity = null;
      let finalUpcomingEndings = [];
      let finalRecentActions = [];

      if (isAdmin()) {
        if (results[4]?.status === 'fulfilled') {
          setAdminKpis(results[4].value.data);
          finalAdminKpis = results[4].value.data;
        }
        if (results[5]?.status === 'fulfilled') {
          setTodayActivity(results[5].value.data);
          finalTodayActivity = results[5].value.data;
        }
        if (results[6]?.status === 'fulfilled') {
          setUpcomingEndings(results[6].value.data.interns || []);
          finalUpcomingEndings = results[6].value.data.interns || [];
        }
        if (results[7]?.status === 'fulfilled') {
          setRecentActions(results[7].value.data.actions || []);
          finalRecentActions = results[7].value.data.actions || [];
        }
      }

      // Save to cache
      const cacheObj = {
        stats: results[0].status === 'fulfilled' ? results[0].value.data.stats : {},
        attendance: results[1].status === 'fulfilled' ? results[1].value.data.attendance : null,
        activities: results[2].status === 'fulfilled' ? results[2].value.data.activities : [],
        announcements: results[3].status === 'fulfilled' ? results[3].value.data.announcements?.slice(0, 3) : [],
        adminKpis: finalAdminKpis,
        todayActivity: finalTodayActivity,
        upcomingEndings: finalUpcomingEndings,
        recentActions: finalRecentActions
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheObj));
      sessionStorage.setItem(cacheTimeKey, now.toString());

    } catch { /* handled per-request */ } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCheckIn = async () => {
    setAttendLoading(true);
    let locationPayload = { latitude: null, longitude: null, address: null };

    if (user?.internship_mode !== 'online') {
      try {
        toast.loading('Fetching geolocation...', { id: 'geo' });
        const loc = await getBrowserLocation();
        locationPayload = loc;
        toast.success('Location verified!', { id: 'geo' });
      } catch (err) {
        toast.error(err.message || 'Failed to verify location. Access denied.', { id: 'geo' });
        setAttendLoading(false);
        return;
      }
    }

    try {
      const res = await api.post('/attendance/checkin', locationPayload);
      setAttendance(res.data.attendance);
      toast.success('Checked in successfully! 🎯');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in');
    } finally { setAttendLoading(false); }
  };

  const handleBreakStart = async () => {
    setAttendLoading(true);
    let locationPayload = { latitude: null, longitude: null, address: null };

    if (user?.internship_mode !== 'online') {
      try {
        toast.loading('Fetching location for break start...', { id: 'geo' });
        locationPayload = await getBrowserLocation();
        toast.dismiss('geo');
      } catch (err) {
        toast.error(err.message || 'Failed to verify location', { id: 'geo' });
        setAttendLoading(false);
        return;
      }
    }

    try {
      const res = await api.post('/attendance/break-start', locationPayload);
      setAttendance(res.data.attendance);
      toast.success('Break started! Have a good break ☕');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start break');
    } finally { setAttendLoading(false); }
  };

  const handleBreakEnd = async () => {
    setAttendLoading(true);
    let locationPayload = { latitude: null, longitude: null, address: null };

    if (user?.internship_mode !== 'online') {
      try {
        toast.loading('Fetching location for break end...', { id: 'geo' });
        locationPayload = await getBrowserLocation();
        toast.dismiss('geo');
      } catch (err) {
        toast.error(err.message || 'Failed to verify location', { id: 'geo' });
        setAttendLoading(false);
        return;
      }
    }

    try {
      const res = await api.post('/attendance/break-end', locationPayload);
      setAttendance(res.data.attendance);
      toast.success('Break ended! Welcome back to work 💪');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end break');
    } finally { setAttendLoading(false); }
  };

  const handleCheckOut = async () => {
    setAttendLoading(true);
    let locationPayload = { latitude: null, longitude: null, address: null };

    if (user?.internship_mode !== 'online') {
      try {
        toast.loading('Fetching location for checkout...', { id: 'geo' });
        locationPayload = await getBrowserLocation();
        toast.success('Location verified!', { id: 'geo' });
      } catch (err) {
        toast.error(err.message || 'Failed to verify location', { id: 'geo' });
        setAttendLoading(false);
        return;
      }
    }

    try {
      const res = await api.post('/attendance/checkout', locationPayload);
      setAttendance(res.data.attendance);
      toast.success('Checked out! Great work today 💪');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check out');
    } finally { setAttendLoading(false); }
  };

  const handleGenerateCert = (intern) => {
    navigate('/documents', { state: { generateCert: intern } });
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Admin KPI cards (7 cards)
  const adminKpiCards = [
    {
      icon: Users,
      label: 'Total Active Interns',
      value: stats.totalUsers,
      gradient: 'bg-gradient-purple-blue',
      sub: 'Across both companies',
      onClick: () => navigate('/team'),
    },
    {
      icon: Monitor,
      label: 'IT Interns',
      value: adminKpis?.itInterns ?? 0,
      gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      sub: 'Site4People',
    },
    {
      icon: TrendingUp,
      label: 'BD Interns',
      value: adminKpis?.bdInterns ?? '—',
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      sub: 'Site4People',
    },
    {
      icon: UserSearch,
      label: 'Recruitment Interns',
      value: adminKpis?.recruitmentInterns ?? '—',
      gradient: 'bg-gradient-to-br from-violet-500 to-purple-700',
      sub: 'SI Placements',
    },
    {
      icon: Briefcase,
      label: 'Full-Time Staff',
      value: adminKpis?.totalEmployees ?? '—',
      gradient: 'bg-gradient-to-br from-orange-500 to-red-600',
      sub: 'Office/Field',
      onClick: () => navigate('/team'),
    },
    {
      icon: Clock,
      label: 'Ending This Week',
      value: adminKpis?.completingThisWeek ?? upcomingEndings.filter(i => {
        const d = differenceInDays(parseISO(i.batch_end), new Date());
        return d >= 0 && d <= 7;
      }).length,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
      sub: 'Need attention',
      highlight: (adminKpis?.completingThisWeek || 0) > 0,
    },
    {
      icon: Award,
      label: 'Certs Ready',
      value: adminKpis?.certsReady ?? 0,
      gradient: 'bg-gradient-to-br from-yellow-500 to-amber-600',
      sub: 'Generated',
      onClick: () => navigate('/documents'),
    },
  ];

  if (loading) return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy">
            {getGreeting()}, {user?.full_name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Working hours: 10:00 AM – 7:00 PM
          </p>
        </div>
        {isAdmin() && (
          <Link to="/team" className="btn-secondary flex items-center gap-1.5 shrink-0">
            <UserPlus size={15} />
            <span className="hidden sm:inline">Add Member</span>
          </Link>
        )}
      </div>

      {/* ── ADMIN VIEW ── */}
      {isAdmin() && (
        <>
          {/* 7 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {adminKpiCards.map(c => <KpiCard key={c.label} {...c} />)}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
              <Zap size={16} className="text-purple-600" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickAction icon={UserPlus} label="New Intern" color="bg-gradient-purple-blue" onClick={() => navigate('/team')} />
              <QuickAction icon={FileText} label="Offer Letter" color="bg-gradient-to-br from-emerald-500 to-teal-600" onClick={() => navigate('/documents')} />
              <QuickAction icon={CheckSquare} label="View All Tasks" color="bg-gradient-to-br from-blue-500 to-cyan-600" onClick={() => navigate('/tasks')} />
              <QuickAction icon={BarChart2} label="Export Reports" color="bg-gradient-to-br from-orange-500 to-red-500" onClick={() => navigate('/reports')} />
            </div>
          </div>

          {/* Today's Activity + Upcoming Endings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Activity */}
            <div className="card">
              <h3 className="font-bold text-navy flex items-center gap-2 mb-4">
                <Activity size={16} className="text-blue-500" />
                Today's Activity
                <span className="ml-auto text-xs text-gray-400">{format(new Date(), 'MMM d')}</span>
              </h3>

              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Checked In', value: todayActivity?.checkIns?.length ?? stats.presentToday ?? 0, color: 'bg-green-50 text-green-700' },
                  { label: 'Tasks Done', value: todayActivity?.tasksCompletedToday ?? 0, color: 'bg-blue-50 text-blue-700' },
                  { label: 'New Leads', value: todayActivity?.newLeadsToday ?? 0, color: 'bg-purple-50 text-purple-700' },
                  { label: 'Candidates', value: todayActivity?.candidatesCalledToday ?? 0, color: 'bg-orange-50 text-orange-700' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl p-3 ${item.color}`}>
                    <p className="text-2xl font-extrabold">{item.value}</p>
                    <p className="text-xs font-medium opacity-80">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Check-in list */}
              {todayActivity?.checkIns && todayActivity.checkIns.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Who's In Today</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {todayActivity.checkIns.map((ci, i) => (
                      <ActivityRow
                        key={i}
                        icon={ClipboardCheck}
                        iconBg="bg-green-500"
                        title={ci.full_name || `User ${i + 1}`}
                        sub={`Checked in at ${ci.check_in || '—'} · ${(ci.role || '').replace('_', ' ')}`}
                        badge={ci.status}
                        badgeCls={ci.status === 'late' ? 'badge-yellow' : 'badge-green'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(!todayActivity?.checkIns || todayActivity.checkIns.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">No check-ins yet today</p>
              )}
            </div>

            {/* Upcoming Endings */}
            <EndingsCard interns={upcomingEndings} onGenerateCert={handleGenerateCert} />
          </div>

          {/* Recent Actions Feed */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy flex items-center gap-2">
                <Bell size={16} className="text-purple-600" />
                Recent Admin Actions
              </h3>
              <span className="text-xs text-gray-400">Last 20 actions</span>
            </div>
            {recentActions.length === 0 ? (
              <div className="text-center py-8">
                <Star size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No admin actions recorded yet</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {recentActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy">{action.description || action.action_type}</p>
                      <p className="text-xs text-gray-400">
                        {action.created_at ? format(new Date(action.created_at), 'MMM d, h:mm a') : ''}
                      </p>
                    </div>
                    {action.action_type && (
                      <span className="tag shrink-0">{action.action_type.replace('_', ' ')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── INTERN VIEW ── */}
      {!isAdmin() && (
        <>
          {/* Certificate Download Banner (if completed) */}
          {myDocuments.some(d => d.type === 'completion_certificate') && (
            <div className="card bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-amber-900">Your Completion Certificate is Ready!</p>
                  <p className="text-xs text-amber-700 mt-0.5">Congratulations on completing your internship. Download your certificate now.</p>
                </div>
                <Link to="/documents" className="btn-primary shrink-0 text-sm py-2">
                  Download Certificate
                </Link>
              </div>
            </div>
          )}

          {/* Today's Follow-ups for Recruitment Intern */}
          {user?.role === 'recruitment_intern' && myFollowups.length > 0 && (
            <div className="card border-l-4 border-l-orange-500">
              <h3 className="font-bold text-navy mb-3 flex items-center gap-2">
                <Clock size={16} className="text-orange-500" />
                Today's Follow-ups
                <span className="ml-auto badge badge-orange">{myFollowups.length}</span>
              </h3>
              <div className="space-y-2">
                {myFollowups.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {c.candidate_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy">{c.candidate_name}</p>
                      <p className="text-xs text-gray-500">{c.followup_note || 'Follow-up due'} · {c.position_applied}</p>
                    </div>
                    <Link to="/recruitment" className="text-xs px-2.5 py-1 bg-white border border-orange-200 text-orange-700 rounded-lg font-medium hover:bg-orange-50 shrink-0">
                      Go to Pipeline
                    </Link>
                  </div>
                ))}
                {myFollowups.length > 5 && (
                  <Link to="/recruitment" className="text-xs text-orange-600 font-semibold hover:underline text-center block mt-1">
                    +{myFollowups.length - 5} more follow-ups →
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              icon={CheckSquare}
              label="My Tasks"
              value={stats.myPendingTasks}
              gradient="bg-gradient-purple-blue"
              sub="In progress"
              onClick={() => navigate('/tasks')}
            />
            {isRecruitment() && (
              <KpiCard
                icon={UserSearch}
                label="Active Candidates"
                value={stats.myActiveCandidates}
                gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                sub="In pipeline"
                onClick={() => navigate('/recruitment')}
              />
            )}
            {isBD() && (
              <>
                <KpiCard
                  icon={Briefcase}
                  label="Active Clients"
                  value={stats.myActiveClients}
                  gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                  sub="In pipeline"
                  onClick={() => navigate('/clients')}
                />
                <KpiCard
                  icon={DollarSign}
                  label="Pending Invoices"
                  value={stats.myPendingInvoices}
                  gradient="bg-gradient-to-br from-orange-500 to-red-500"
                  sub="Awaiting payment"
                  onClick={() => navigate('/invoices')}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ── SHARED — Main 2-col grid ── */}
      <div className={`grid grid-cols-1 ${isAdmin() ? '' : 'lg:grid-cols-3'} gap-6`}>
        {!isAdmin() && (
          <div className="lg:col-span-1">
            <AttendanceWidget
              attendance={attendance}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onBreakStart={handleBreakStart}
              onBreakEnd={handleBreakEnd}
              loading={attendLoading}
              user={user}
            />
            {!stats.todayReportSubmitted && (
              <div className="mt-4 card border-l-4 border-l-purple-DEFAULT">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-purple-DEFAULT shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-navy">Daily report pending</p>
                    <p className="text-xs text-gray-500 mt-0.5">Submit your end-of-day report before 7 PM</p>
                    <Link to="/reports" className="text-xs text-purple-DEFAULT font-semibold hover:underline mt-2 inline-flex items-center gap-1">
                      Submit now <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4">
              <TodaysTasksWidget />
            </div>
          </div>
        )}

        <div className={`${isAdmin() ? '' : 'lg:col-span-2'} space-y-4`}>
          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-navy flex items-center gap-2">
                  <Megaphone size={16} className="text-purple-DEFAULT" />
                  Announcements
                </h3>
                <Link to="/announcements" className="text-xs text-purple-DEFAULT hover:underline font-medium flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {announcements.map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-gradient-card border border-purple-100">
                    <p className="text-sm font-semibold text-navy">{a.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{a.content}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{format(new Date(a.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-navy flex items-center gap-2">
                <Clock size={16} className="text-blue-DEFAULT" />
                Recent Activity
              </h3>
            </div>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {activities.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'task' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {item.type === 'task' ? <CheckSquare size={14} /> : <Megaphone size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy truncate">{item.title}</p>
                      <p className="text-xs text-gray-400">{format(new Date(item.time), 'MMM d, h:mm a')}</p>
                    </div>
                    {item.status && (
                      <span className={`badge text-xs ${
                        item.status === 'done' ? 'badge-green' :
                        item.status === 'in_progress' ? 'badge-blue' : 'badge-gray'
                      }`}>{item.status?.replace('_', ' ')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin attendance widget (at bottom in compact form) */}
      {isAdmin() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <AttendanceWidget
            attendance={attendance}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onBreakStart={handleBreakStart}
            onBreakEnd={handleBreakEnd}
            loading={attendLoading}
            user={user}
          />
          {!stats.todayReportSubmitted && (
            <div className="card border-l-4 border-l-purple-DEFAULT flex items-start gap-3">
              <AlertCircle size={18} className="text-purple-DEFAULT shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-navy">Daily report pending</p>
                <p className="text-xs text-gray-500 mt-0.5">Submit your end-of-day report before 7 PM</p>
                <Link to="/reports" className="text-xs text-purple-DEFAULT font-semibold hover:underline mt-2 inline-flex items-center gap-1">
                  Submit now <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
