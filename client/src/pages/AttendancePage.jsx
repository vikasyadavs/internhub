import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, AlertTriangle, CalendarDays,
  Users, PlayCircle, MapPin, Coffee, LogOut, Navigation
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getBrowserLocation } from '../lib/location';
import { LiveMap } from '../components/LiveMap';
import { useTracking } from '../contexts/TrackingContext';

const STATUS_CONFIG = {
  present: { label: 'Present', cls: 'badge-green', dot: 'bg-green-500' },
  late: { label: 'Late', cls: 'badge-yellow', dot: 'bg-yellow-500' },
  absent: { label: 'Absent', cls: 'badge-red', dot: 'bg-red-500' },
  half_day: { label: 'Half Day', cls: 'badge-orange', dot: 'bg-orange-500' },
};

function LocationPill({ title, locString }) {
  if (!locString) return null;
  let parsed = null;
  try {
    parsed = typeof locString === 'string' ? JSON.parse(locString) : locString;
  } catch (e) {}

  if (!parsed || (!parsed.latitude && !parsed.address)) return null;

  const mapUrl = parsed.latitude && parsed.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${parsed.latitude},${parsed.longitude}`
    : null;

  return (
    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1">
      <MapPin size={10} className="shrink-0 text-red-500 mt-0.5" />
      <span className="truncate max-w-[200px]">{title}: </span>
      {mapUrl ? (
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline font-medium truncate" title={parsed.address}>
          {parsed.address || `${parsed.latitude.toFixed(4)}, ${parsed.longitude.toFixed(4)}`}
        </a>
      ) : (
        <span className="truncate">{parsed.address}</span>
      )}
    </div>
  );
}

function AttendanceRow({ record }) {
  const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.present;

  let breaksList = [];
  try {
    breaksList = record.breaks 
      ? (typeof record.breaks === 'string' ? JSON.parse(record.breaks) : record.breaks)
      : [];
  } catch (e) {}

  return (
    <div className="py-4 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy dark:text-white">{format(parseISO(record.date), 'EEEE, MMM d, yyyy')}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Check-In: <span className="font-semibold text-gray-700 dark:text-gray-300">{record.check_in || '—'}</span> · 
            Check-Out: <span className="font-semibold text-gray-700 dark:text-gray-300">{record.check_out || '—'}</span>
          </p>
        </div>
        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
      </div>

      {/* Locations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-5 mt-1.5 border-l-2 border-gray-100 dark:border-slate-800 pl-3">
        <LocationPill title="In" locString={record.check_in_location} />
        <LocationPill title="Out" locString={record.check_out_location} />
      </div>

      {/* Breaks details */}
      {breaksList.length > 0 && (
        <div className="ml-5 mt-2 text-[10px] text-gray-400">
          <p className="font-medium text-gray-500 uppercase tracking-wider mb-1">☕ Breaks taken ({breaksList.length})</p>
          <div className="space-y-1">
            {breaksList.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span>• {b.break_start} to {b.break_end}</span>
                {b.start_location?.address && (
                  <span className="text-gray-500 truncate max-w-xs">(From: {b.start_location.address})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const { user, isAdmin } = useAuth();
  const [myHistory, setMyHistory] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [markForm, setMarkForm] = useState({ user_id: '', status: 'present', check_in: '10:00', check_out: '' });
  const [marking, setMarking] = useState(false);
  const [activeTab, setActiveTab] = useState('my');
  const [todayRecord, setTodayRecord] = useState(null);
  const [attendLoading, setAttendLoading] = useState(false);

  // Global persistent tracking context — persists even when navigating away from this page
  const { currentLocation, isTracking, syncTrackingState } = useTracking();

  useEffect(() => {
    fetchMyHistory();
    fetchTodayRecord();
    if (isAdmin()) {
      fetchAllUsers();
      fetchAllAttendance();
    }
  }, []);

  useEffect(() => {
    if (isAdmin()) fetchAllAttendance();
  }, [selectedDate]);

  const fetchMyHistory = async () => {
    try {
      const res = await api.get('/attendance/my');
      setMyHistory(res.data.attendance || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchTodayRecord = async () => {
    try {
      const res = await api.get('/attendance/today');
      setTodayRecord(res.data.attendance || null);
    } catch {}
  };

  const fetchAllAttendance = async () => {
    try {
      const res = await api.get(`/attendance/all?date=${selectedDate}`);
      setAllAttendance(res.data.attendance || []);
    } catch { /* silent */ }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/users/team');
      setAllUsers(res.data.users || []);
    } catch { /* silent */ }
  };

  const handleMark = async (e) => {
    e.preventDefault();
    if (!markForm.user_id) return toast.error('Select a user');
    setMarking(true);
    try {
      await api.post('/attendance/mark', { ...markForm, date: selectedDate });
      toast.success('Attendance marked!');
      fetchAllAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setMarking(false); }
  };

  const handleCheckIn = async () => {
    setAttendLoading(true);
    let locationPayload = { latitude: null, longitude: null, address: null };

    if (user?.internship_mode !== 'online') {
      try {
        toast.loading('Fetching location...', { id: 'geo' });
        locationPayload = await getBrowserLocation();
        toast.success('Location verified!', { id: 'geo' });
      } catch (err) {
        toast.error(err.message || 'Failed to verify location. Access denied.', { id: 'geo' });
        setAttendLoading(false);
        return;
      }
    }

    try {
      const res = await api.post('/attendance/checkin', locationPayload);
      setTodayRecord(res.data.attendance);
      toast.success('Checked in successfully! 🎯');
      fetchMyHistory();
      // Notify global tracker to start running
      syncTrackingState();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in');
    } finally { setAttendLoading(false); }
  };

  const handleBreakStart = async () => {
    setAttendLoading(true);
    let locationPayload = { latitude: null, longitude: null, address: null };

    if (user?.internship_mode !== 'online') {
      try {
        toast.loading('Fetching location...', { id: 'geo' });
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
      setTodayRecord(res.data.attendance);
      toast.success('Break started! ☕');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start break');
    } finally { setAttendLoading(false); }
  };

  const handleBreakEnd = async () => {
    setAttendLoading(true);
    let locationPayload = { latitude: null, longitude: null, address: null };

    if (user?.internship_mode !== 'online') {
      try {
        toast.loading('Fetching location...', { id: 'geo' });
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
      setTodayRecord(res.data.attendance);
      toast.success('Break ended! Welcome back 💪');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end break');
    } finally { setAttendLoading(false); }
  };

  const handleCheckOut = async () => {
    setAttendLoading(true);
    let locationPayload = { latitude: null, longitude: null, address: null };

    if (user?.internship_mode !== 'online') {
      try {
        toast.loading('Fetching location...', { id: 'geo' });
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
      setTodayRecord(res.data.attendance);
      toast.success('Checked out! Great work today 💪');
      fetchMyHistory();
      // Notify global tracker to stop
      syncTrackingState();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check out');
    } finally { setAttendLoading(false); }
  };

  // Stats from history
  const presentCount = myHistory.filter(r => r.status === 'present').length;
  const lateCount = myHistory.filter(r => r.status === 'late').length;
  const absentCount = myHistory.filter(r => r.status === 'absent').length;
  const total = myHistory.length;
  const attendancePct = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  let currentBreak = null;
  try {
    currentBreak = todayRecord?.current_break 
      ? (typeof todayRecord.current_break === 'string' ? JSON.parse(todayRecord.current_break) : todayRecord.current_break)
      : null;
  } catch (e) {}

  return (
    <div className="space-y-6 animate-slide-up">
      {/* GPS Accuracy Banner — shown when IP fallback is active */}
      {user?.role !== 'admin' && currentLocation?.address?.includes('(IP Geolocation)') && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <span className="text-xl shrink-0">📡</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Using approximate city-level location</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              For precise street-level GPS tracking, click the 🔒 lock icon in your browser's address bar and <strong>Allow Location</strong>, then refresh.
            </p>
          </div>
        </div>
      )}

      {/* Attendance Control Action Card (Shared for non-admin check-in) */}
      {user?.role !== 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="card md:col-span-1 bg-gradient-to-br from-indigo-900 to-purple-950 text-white border-0 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-white text-base mb-3 flex items-center gap-1.5">
                <ClipboardCheck size={18} className="text-purple-400" />
                Duty Check-In Panel
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4 text-slate-200">
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center">
                  <span className="text-[10px] block opacity-85 uppercase font-medium">Logged Check In</span>
                  <span className="font-extrabold text-lg block">{todayRecord?.check_in || '—'}</span>
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center">
                  <span className="text-[10px] block opacity-85 uppercase font-medium">Logged Check Out</span>
                  <span className="font-extrabold text-lg block">{todayRecord?.check_out || '—'}</span>
                </div>
              </div>
            </div>

            <div>
              {!todayRecord?.check_in ? (
                <button
                  onClick={handleCheckIn}
                  disabled={attendLoading}
                  className="btn-primary bg-white text-navy hover:bg-slate-100 w-full flex items-center justify-center gap-2 font-bold py-3 text-sm shadow-md"
                >
                  <PlayCircle size={18} className="text-purple-700 animate-pulse" />
                  {attendLoading ? 'Verifying location...' : user?.internship_mode === 'online' ? 'Flexible Check In' : 'Fetch Location & Check In'}
                </button>
              ) : !todayRecord?.check_out ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {!currentBreak ? (
                      <button
                        onClick={handleBreakStart}
                        disabled={attendLoading}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors"
                      >
                        <Coffee size={14} />
                        Lunch Break
                      </button>
                    ) : (
                      <button
                        onClick={handleBreakEnd}
                        disabled={attendLoading}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors"
                      >
                        <Coffee size={14} />
                        Break Over
                      </button>
                    )}
                    <button
                      onClick={handleCheckOut}
                      disabled={attendLoading}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors"
                    >
                      <LogOut size={14} />
                      Check Out
                    </button>
                  </div>
                  <div className="text-[10px] text-center text-purple-300 animate-pulse flex items-center justify-center gap-1">
                    <Navigation size={10} className="spin" />
                    Real-time location tracking active
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30 text-center text-green-300 font-semibold text-sm">
                  🎉 Attendance completed for today!
                </div>
              )}
            </div>
          </div>

          {/* Interactive self map for checked-in employees */}
          <div className="card md:col-span-2 space-y-3">
            <h4 className="font-bold text-navy dark:text-white flex items-center gap-2">
              <MapPin size={16} className="text-red-500" />
              {isTracking ? '🟢 Live Location' : 'Check-In Location'}
              {currentLocation?.accuracy && isTracking && (
                <span className="text-[10px] font-normal text-green-400 ml-auto">
                  ±{Math.round(currentLocation.accuracy)}m accuracy
                </span>
              )}
            </h4>
            {(() => {
              // Safely parse check-in location
              let checkinLoc = null;
              try {
                checkinLoc = todayRecord?.check_in_location
                  ? (typeof todayRecord.check_in_location === 'string'
                      ? JSON.parse(todayRecord.check_in_location)
                      : todayRecord.check_in_location)
                  : null;
              } catch (_) {}
              // Prefer live GPS over stored check-in location
              const mapLat = currentLocation?.latitude ?? checkinLoc?.latitude ?? null;
              const mapLon = currentLocation?.longitude ?? checkinLoc?.longitude ?? null;
              const mapAddr = currentLocation?.address ?? checkinLoc?.address ?? '';
              return (
                <LiveMap
                  latitude={mapLat}
                  longitude={mapLon}
                  address={mapAddr}
                  label={user?.full_name}
                  height={220}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ClipboardCheck, label: 'Total Days', value: total, cls: 'from-purple-500 to-blue-600' },
          { icon: CheckCircle2, label: 'Present', value: presentCount, cls: 'from-emerald-500 to-teal-600' },
          { icon: Clock, label: 'Late', value: lateCount, cls: 'from-yellow-500 to-orange-500' },
          { icon: XCircle, label: 'Absent', value: absentCount, cls: 'from-red-500 to-rose-600' },
        ].map(s => (
          <div key={s.label} className={`stat-card bg-gradient-to-br ${s.cls}`}>
            <div className="relative">
              <div className="p-2 rounded-xl bg-white/20 inline-flex mb-2">
                <s.icon size={18} className="text-white" />
              </div>
              <p className="text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-white/80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance rate bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-navy">Overall Attendance Rate</span>
          <span className="text-sm font-bold text-purple-DEFAULT">{attendancePct}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3">
          <div
            className="bg-gradient-purple-blue h-3 rounded-full transition-all duration-700"
            style={{ width: `${attendancePct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{presentCount + lateCount} of {total} days attended</p>
      </div>

      {/* Tabs for admin */}
      {isAdmin() && (
        <div className="flex gap-2">
          {[
            { key: 'my', label: 'My Attendance', icon: ClipboardCheck },
            { key: 'team', label: 'Team View', icon: Users },
            { key: 'mark', label: 'Mark Attendance', icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-purple-blue text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-350 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* My history */}
      {(!isAdmin() || activeTab === 'my') && (
        <div className="card">
          <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-purple-DEFAULT" />
            Attendance History
          </h3>
          {myHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No attendance records yet</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {myHistory.map(r => <AttendanceRow key={r.id} record={r} />)}
            </div>
          )}
        </div>
      )}

      {/* Team view — admin */}
      {isAdmin() && activeTab === 'team' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy flex items-center gap-2">
              <Users size={16} className="text-blue-DEFAULT" />
              Team Attendance
            </h3>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="input w-auto text-sm"
            />
          </div>
          {allAttendance.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No records for this date</p>
          ) : (
            <div className="space-y-3">
              {allAttendance.map(r => {
                let breaksList = [];
                try {
                  breaksList = r.breaks 
                    ? (typeof r.breaks === 'string' ? JSON.parse(r.breaks) : r.breaks)
                    : [];
                } catch (e) {}

                return (
                  <div key={r.id} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-purple-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {r.users?.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy">{r.users?.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">
                          {r.users?.role?.replace('_', ' ')} · {r.users?.company?.replace('_', ' ')} · Mode: <span className="font-semibold text-purple-600">{r.users?.internship_mode || 'Office'}</span>
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500 dark:text-gray-400 mr-2">
                        <p>In: <span className="font-semibold text-gray-700 dark:text-gray-300">{r.check_in || '—'}</span></p>
                        <p>Out: <span className="font-semibold text-gray-700 dark:text-gray-300">{r.check_out || '—'}</span></p>
                      </div>
                      <span className={`badge ${STATUS_CONFIG[r.status]?.cls || 'badge-gray'}`}>
                        {STATUS_CONFIG[r.status]?.label || r.status}
                      </span>
                    </div>

                    {/* Geolocation Details for Admin */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 ml-11 pt-2 border-t border-gray-200/50 dark:border-slate-800">
                      <LocationPill title="Check-In Location" locString={r.check_in_location} />
                      <LocationPill title="Check-Out Location" locString={r.check_out_location} />
                    </div>

                    {/* Breaks details for Admin */}
                    {breaksList.length > 0 && (
                      <div className="ml-11 mt-2 text-[10px] text-gray-400">
                        <p className="font-bold text-gray-500 uppercase">☕ Breaks logged ({breaksList.length})</p>
                        <div className="space-y-1">
                          {breaksList.map((b, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span>• {b.break_start} to {b.break_end}</span>
                              {b.start_location?.address && (
                                <span className="text-slate-500">({b.start_location.address})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mark attendance — admin */}
      {isAdmin() && activeTab === 'mark' && (
        <div className="card max-w-md">
          <h3 className="font-bold text-navy mb-4">Mark Attendance</h3>
          <form onSubmit={handleMark} className="space-y-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Intern / Employee</label>
              <select className="input" value={markForm.user_id} onChange={e => setMarkForm(f => ({ ...f, user_id: e.target.value }))}>
                <option value="">Select intern...</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role?.replace('_', ' ')})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={markForm.status} onChange={e => setMarkForm(f => ({ ...f, status: e.target.value }))}>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Check In</label>
                <input type="time" className="input" value={markForm.check_in} onChange={e => setMarkForm(f => ({ ...f, check_in: e.target.value }))} />
              </div>
              <div>
                <label className="label">Check Out</label>
                <input type="time" className="input" value={markForm.check_out} onChange={e => setMarkForm(f => ({ ...f, check_out: e.target.value }))} />
              </div>
            </div>
            <button type="submit" disabled={marking} className="btn-primary w-full">
              {marking ? 'Marking...' : 'Mark Attendance'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
