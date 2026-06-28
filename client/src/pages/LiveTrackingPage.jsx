import { useState, useEffect, useCallback } from 'react';
import { MapPin, Users, RefreshCw, Clock, Wifi, WifiOff, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { AdminLiveMap } from '../components/LiveMap';

const ROLE_COLORS = {
  employee: 'bg-purple-100 text-purple-700',
  it_intern: 'bg-blue-100 text-blue-700',
  bd_intern: 'bg-emerald-100 text-emerald-700',
  recruitment_intern: 'bg-amber-100 text-amber-700',
};

const ROLE_LABELS = {
  employee: 'Employee',
  it_intern: 'IT Intern',
  bd_intern: 'BD Intern',
  recruitment_intern: 'Recruitment Intern',
};

export default function LiveTrackingPage() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchLive = useCallback(async () => {
    try {
      const res = await api.get('/tracking/live');
      setTracks(res.data.tracks || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.warn('Failed to fetch live tracks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLive, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLive]);

  const timeAgo = (ts) => {
    if (!ts) return 'Unknown';
    const diff = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    return `${Math.round(diff / 3600)}h ago`;
  };

  const selectedTrack = tracks.find(t => t.user_id === selectedUser);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white flex items-center gap-2">
            <Navigation size={24} className="text-purple-500" />
            Live Location Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time employee tracking via HeiGIT Maps
            {lastRefresh && (
              <span className="ml-2 text-xs text-gray-400">
                · Refreshed {format(lastRefresh, 'hh:mm:ss a')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              autoRefresh
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            {autoRefresh ? <Wifi size={13} /> : <WifiOff size={13} />}
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={fetchLive}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Online Now', value: tracks.length, icon: Users, color: 'from-purple-500 to-violet-600' },
          { label: 'Field Workers', value: tracks.filter(t => t.user?.internship_mode === 'field_work').length, icon: MapPin, color: 'from-orange-500 to-red-500' },
          { label: 'Office Staff', value: tracks.filter(t => t.user?.internship_mode !== 'field_work' && t.user?.internship_mode !== 'online').length, icon: Navigation, color: 'from-blue-500 to-cyan-600' },
          { label: 'Last Updated', value: lastRefresh ? format(lastRefresh, 'hh:mm a') : '—', icon: Clock, color: 'from-emerald-500 to-teal-600' },
        ].map(s => (
          <div key={s.label} className={`stat-card bg-gradient-to-br ${s.color}`}>
            <div className="relative">
              <div className="p-2 rounded-xl bg-white/20 inline-flex mb-2">
                <s.icon size={16} className="text-white" />
              </div>
              <p className="text-xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-white/80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Employee list */}
        <div className="card lg:col-span-1 space-y-2">
          <h3 className="font-bold text-navy dark:text-white flex items-center gap-2 mb-3">
            <Users size={16} className="text-purple-500" />
            Active Employees
            <span className="ml-auto badge badge-green">{tracks.length} online</span>
          </h3>

          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
              <WifiOff size={28} />
              <p className="text-sm font-medium">No employees online</p>
              <p className="text-xs text-center">Employees will appear here once they check in with location tracking enabled</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {tracks.map(track => (
                <button
                  key={track.user_id}
                  onClick={() => setSelectedUser(track.user_id === selectedUser ? null : track.user_id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedUser === track.user_id
                      ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700'
                      : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                        {track.user?.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy dark:text-white truncate">
                        {track.user?.full_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {ROLE_LABELS[track.user?.role] || track.user?.role}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(track.timestamp)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 ml-11 truncate flex items-center gap-1">
                    <MapPin size={9} className="text-red-400 shrink-0" />
                    {track.address || `${track.latitude?.toFixed(4)}, ${track.longitude?.toFixed(4)}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Map */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-navy dark:text-white flex items-center gap-2">
              <MapPin size={16} className="text-red-500" />
              {selectedUser && selectedTrack
                ? `Tracking: ${selectedTrack.user?.full_name}`
                : 'All Employees — Live Map'}
            </h3>
            {selectedUser && (
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs text-purple-600 hover:underline"
              >
                View all
              </button>
            )}
          </div>

          <AdminLiveMap
            tracks={selectedUser && selectedTrack ? [selectedTrack] : tracks}
            height={420}
          />

          {/* Map legend */}
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <div key={role} className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected user details */}
      {selectedTrack && (
        <div className="card">
          <h3 className="font-bold text-navy dark:text-white mb-3 flex items-center gap-2">
            <Navigation size={16} className="text-purple-500" />
            {selectedTrack.user?.full_name} — Location Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Latitude</p>
              <p className="font-bold text-navy dark:text-white">{selectedTrack.latitude?.toFixed(6)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Longitude</p>
              <p className="font-bold text-navy dark:text-white">{selectedTrack.longitude?.toFixed(6)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Accuracy</p>
              <p className="font-bold text-navy dark:text-white">
                {selectedTrack.accuracy ? `±${Math.round(selectedTrack.accuracy)}m` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Last Ping</p>
              <p className="font-bold text-navy dark:text-white">{timeAgo(selectedTrack.timestamp)}</p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-800">
            <p className="text-xs text-gray-500 mb-0.5">📍 Current Address</p>
            <p className="text-sm font-medium text-navy dark:text-white">{selectedTrack.address || 'Address unavailable'}</p>
          </div>
          <div className="mt-2 flex gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedTrack.latitude},${selectedTrack.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <MapPin size={12} />
              Open in Google Maps
            </a>
            <a
              href={`https://maps.openrouteservice.org/#/${selectedTrack.longitude},${selectedTrack.latitude},15`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Navigation size={12} />
              Open in ORS Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
