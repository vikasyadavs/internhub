import { useState, useEffect } from 'react';
import { Activity, Clock, User, Filter, AlertCircle, Play, LogOut, CheckSquare, PlusSquare, FileText, Calendar } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const LOG_TYPES = {
  login: { color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20', icon: Play, label: 'Login' },
  logout: { color: 'text-gray-500 bg-gray-50 dark:bg-slate-800', icon: LogOut, label: 'Logout' },
  checkin: { color: 'text-green-500 bg-green-50 dark:bg-green-950/20', icon: Play, label: 'Check In' },
  checkout: { color: 'text-red-500 bg-red-50 dark:bg-red-950/20', icon: LogOut, label: 'Check Out' },
  break_start: { color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20', icon: Clock, label: 'Break Start' },
  break_end: { color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20', icon: Clock, label: 'Break End' },
  task_created: { color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20', icon: PlusSquare, label: 'Task Created' },
  task_status_change: { color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20', icon: CheckSquare, label: 'Task Status' },
  call_logged: { color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20', icon: Calendar, label: 'Call Logged' },
  lead_added: { color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20', icon: PlusSquare, label: 'Lead Added' },
  lead_updated: { color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20', icon: CheckSquare, label: 'Lead Updated' },
  candidate_added: { color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/20', icon: PlusSquare, label: 'Candidate Added' },
  candidate_updated: { color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20', icon: CheckSquare, label: 'Candidate Updated' },
  work_note_added: { color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20', icon: FileText, label: 'Work Note Added' },
  report_submitted: { color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/20', icon: FileText, label: 'Report Submitted' },
};

export default function ActivityLogPage() {
  const [team, setTeam] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get('/users/team');
        setTeam(res.data.users || []);
        if (res.data.users?.length > 0) {
          setSelectedUser(res.data.users[0].id);
        }
      } catch (_) {}
    };
    fetchTeam();
  }, []);

  const fetchLogs = async (uid) => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await api.get(`/activity/${uid}`);
      setLogs(res.data.logs || []);
    } catch (_) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(selectedUser);
  }, [selectedUser]);

  const activeUser = team.find(u => u.id === selectedUser);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy dark:text-white flex items-center gap-2">
          <Activity size={24} className="text-purple-500" />
          Employee Activity Timelines
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Inspect real-time action logs and work updates</p>
      </div>

      {/* Select panel */}
      <div className="card bg-gray-50/50 dark:bg-slate-900/50 border-gray-205/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600">
            <User size={18} />
          </div>
          <div>
            <span className="text-xs text-gray-400 block">Select Employee to Track</span>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="input py-1 px-2 text-sm font-semibold w-64 bg-transparent border-0 ring-0 focus:ring-0 cursor-pointer"
            >
              <option value="">Select name...</option>
              {team.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role?.replace('_', ' ')})</option>
              ))}
            </select>
          </div>
        </div>

        {activeUser && (
          <div className="flex items-center gap-2.5 text-xs">
            <span className="badge badge-purple capitalize">{activeUser.role?.replace('_', ' ')}</span>
            <span className="text-gray-450 dark:text-gray-400">·</span>
            <span className="capitalize">{activeUser.company?.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Logs timeline */}
      {loading ? (
        <div className="skeleton h-60 rounded-2xl" />
      ) : logs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <AlertCircle size={28} className="text-gray-300" />
          <p className="text-sm font-semibold text-navy dark:text-white">No activity logs recorded yet</p>
          <p className="text-xs">Any actions taken by this user will appear here in real-time.</p>
        </div>
      ) : (
        <div className="card relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:sm:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-slate-800">
          {logs.map((log, index) => {
            const config = LOG_TYPES[log.type] || { color: 'text-gray-500 bg-gray-50 dark:bg-slate-800', icon: Activity, label: log.type };
            const Icon = config.icon;
            
            // Extract metadata if exists
            let metaObj = {};
            try {
              metaObj = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {};
            } catch (_) {}

            return (
              <div key={log.id} className="relative group animate-slide-up">
                {/* Timeline node */}
                <div className={`absolute -left-9 sm:-left-11 top-0.5 w-6.5 h-6.5 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm ${config.color} shrink-0 z-10`}>
                  <Icon size={11} />
                </div>

                {/* Content */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="font-bold text-navy dark:text-white text-xs sm:text-sm">
                      {log.description}
                    </h4>
                    <span className="text-[10px] text-gray-400 shrink-0 font-medium flex items-center gap-1">
                      <Clock size={10} />
                      {format(new Date(log.timestamp), 'MMM d, yyyy · hh:mm a')}
                    </span>
                  </div>

                  {/* Metadata display */}
                  {Object.keys(metaObj).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-950/40 rounded-lg text-[10px] text-gray-500 max-w-lg space-y-0.5">
                      {Object.entries(metaObj).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="font-semibold capitalize text-gray-450 dark:text-gray-450 mr-1.5">{k.replace('_', ' ')}:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
