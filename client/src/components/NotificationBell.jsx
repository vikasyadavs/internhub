import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Calendar, Clipboard, CheckSquare, Sparkles, Navigation, AlertTriangle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';

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

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (_) {}
  };

  const generateAlerts = async () => {
    try {
      await api.post('/notifications/generate');
      fetchNotifications();
    } catch (_) {}
  };

  useEffect(() => {
    generateAlerts(); // generate initial alerts
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked read');
    } catch (_) {}
  };

  const timeDistance = (isoStr) => {
    try {
      return formatDistanceToNow(parseISO(isoStr), { addSuffix: true });
    } catch (_) {
      return 'Just now';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative"
      >
        <Bell size={18} className="text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-30 animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850/50 flex items-center justify-between">
            <span className="text-sm font-bold text-navy dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const config = TYPE_ICONS[n.type] || { icon: Bell, color: 'text-gray-500 bg-gray-50 dark:bg-slate-800' };
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markAsRead(n.id)}
                    className={`p-3.5 flex items-start gap-3 transition-colors ${
                      n.read ? 'bg-white dark:bg-slate-900 opacity-75' : 'bg-purple-50/30 dark:bg-purple-950/10'
                    } hover:bg-gray-50/50 dark:hover:bg-slate-850/50 cursor-pointer`}
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
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => setOpen(false)}
                          className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold hover:underline mt-1 block"
                        >
                          View details
                        </Link>
                      )}
                      <p className="text-[9px] text-gray-400 mt-1">{timeDistance(n.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
