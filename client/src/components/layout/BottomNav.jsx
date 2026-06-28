import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CheckSquare, Plus, Bell, User, Briefcase, 
  UserSearch, X, Check, Clipboard, AlertTriangle, AlertCircle, Navigation, Calendar, Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import api from '../../lib/api';

const TYPE_ICONS = {
  task_assigned: { icon: Clipboard, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  task_due_today: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  task_due_soon: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30' },
  deal_closed: { icon: Sparkles, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
  payment_received: { icon: Sparkles, color: 'text-green-500 bg-green-50 dark:bg-green-950/30' },
  internship_ending_7d: { icon: AlertCircle, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' },
  internship_ending_3d: { icon: AlertCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30' },
  attendance_warning: { icon: Navigation, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
  followup_due: { icon: Calendar, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/30' },
  interview_reminder: { icon: Calendar, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30' },
  certificate_ready: { icon: Sparkles, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
  new_candidate: { icon: Clipboard, color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/30' },
  task_done_by_intern: { icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
};

export default function BottomNav() {
  const { user, isAdmin, isBD, isRecruitment } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      const list = res.data.notifications || [];
      setNotifications(list);
      setUnread(list.filter(n => !n.read).length);
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch (_) {}
  };

  // Determine the second "main" tab based on role
  const mainTab = isBD()
    ? { to: '/clients', icon: Briefcase, label: 'Pipeline' }
    : isRecruitment()
    ? { to: '/recruitment', icon: UserSearch, label: 'Candidates' }
    : { to: '/tasks', icon: CheckSquare, label: 'Tasks' };

  // Add action based on role
  const addAction = isBD()
    ? '/clients'
    : isRecruitment()
    ? '/recruitment'
    : '/tasks';

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-navy-light border-t border-gray-200 dark:border-navy-lighter px-2 py-1 safe-area-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Home */}
          <NavLink
            to="/"
            end
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-semibold">Home</span>
          </NavLink>

          {/* Role-based second tab */}
          <NavLink
            to={mainTab.to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <mainTab.icon size={20} />
            <span className="text-[10px] font-semibold">{mainTab.label}</span>
          </NavLink>

          {/* Add FAB */}
          <NavLink
            to={addAction}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-purple-blue text-white shadow-glow-purple -mt-5 transition-transform active:scale-95 no-min-tap"
          >
            <Plus size={24} />
          </NavLink>

          {/* Notifications */}
          <button
            onClick={() => setShowAlerts(true)}
            className={`bottom-nav-item relative ${showAlerts ? 'active' : ''}`}
          >
            <div className="relative">
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center no-min-tap">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">Alerts</span>
          </button>

          {/* Profile */}
          <NavLink
            to="/profile"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-purple-blue flex items-center justify-center text-white text-[10px] font-bold no-min-tap">
              {user?.full_name?.charAt(0)}
            </div>
            <span className="text-[10px] font-semibold">Profile</span>
          </NavLink>
        </div>
      </nav>

      {/* Alerts Slide-up Modal Panel */}
      {showAlerts && (
        <div className="fixed inset-0 z-45 bg-black/50 backdrop-blur-sm animate-fade-in flex items-end justify-center lg:hidden" onClick={() => setShowAlerts(false)}>
          <div className="bg-white dark:bg-navy-light w-full max-h-[80vh] rounded-t-2xl p-5 shadow-2xl flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-navy mb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-purple-600" />
                <h3 className="font-bold text-navy dark:text-white text-base">Notifications</h3>
              </div>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-purple-600 font-semibold flex items-center gap-1 hover:underline">
                    <Check size={12} /> Mark all read
                  </button>
                )}
                <button onClick={() => setShowAlerts(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-navy">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50 dark:divide-navy pb-8">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => {
                  const config = TYPE_ICONS[n.type] || { icon: Bell, color: 'text-gray-500 bg-gray-50' };
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                      }}
                      className={`p-3 flex items-start gap-3 transition-colors ${
                        n.read ? 'opacity-60 bg-transparent' : 'bg-purple-50/20 dark:bg-purple-950/5'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${config.color}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-xs truncate ${n.read ? 'font-medium text-gray-700 dark:text-gray-300' : 'font-bold text-navy dark:text-white'}`}>
                            {n.title}
                          </p>
                          {!n.read && <span className="w-1.5 h-1.5 bg-purple-600 rounded-full shrink-0" />}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                          {n.message}
                        </p>
                        {n.link && (
                          <NavLink
                            to={n.link}
                            onClick={() => setShowAlerts(false)}
                            className="text-[10px] text-purple-600 font-semibold hover:underline mt-1.5 block"
                          >
                            View details &rarr;
                          </NavLink>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
