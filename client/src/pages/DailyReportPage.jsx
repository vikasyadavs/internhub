import { useState, useEffect } from 'react';
import { FileText, Send, CheckCircle2, Clock, Calendar } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export default function DailyReportPage() {
  const { isAdmin } = useAuth();
  const [todayReport, setTodayReport] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [form, setForm] = useState({ work_done: '', plan_tomorrow: '', hours_worked: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submit');

  useEffect(() => {
    fetchToday();
    fetchMyReports();
    if (isAdmin()) fetchAllReports();
  }, []);

  const fetchToday = async () => {
    try {
      const res = await api.get('/reports/today');
      if (res.data.report) {
        setTodayReport(res.data.report);
        setForm({
          work_done: res.data.report.work_done,
          plan_tomorrow: res.data.report.plan_tomorrow || '',
          hours_worked: res.data.report.hours_worked || '',
        });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchMyReports = async () => {
    try {
      const res = await api.get('/reports/my');
      setMyReports(res.data.reports || []);
    } catch { /* silent */ }
  };

  const fetchAllReports = async () => {
    try {
      const res = await api.get('/reports/all');
      setAllReports(res.data.reports || []);
    } catch { /* silent */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.work_done.trim()) return toast.error('Please describe what you worked on');
    setSaving(true);
    try {
      const res = await api.post('/reports', form);
      setTodayReport(res.data.report);
      toast.success(todayReport ? 'Report updated! ✅' : 'Daily report submitted! 🎉');
      fetchMyReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 animate-slide-up max-w-4xl">
      {/* Status banner */}
      {todayReport ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
          <CheckCircle2 size={20} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Today's report submitted</p>
            <p className="text-xs text-green-600">Submitted at {format(parseISO(todayReport.submitted_at), 'h:mm a')} · You can update it any time before 7 PM</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <Clock size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Daily report pending</p>
            <p className="text-xs text-amber-600">Submit before 7:00 PM today · {format(new Date(), 'MMMM d, yyyy')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'submit', label: 'Submit Report', icon: Send },
          { key: 'history', label: 'My History', icon: Calendar },
          ...(isAdmin() ? [{ key: 'all', label: 'All Reports', icon: FileText }] : []),
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-gradient-purple-blue text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Submit form */}
      {activeTab === 'submit' && (
        <div className="card">
          <h2 className="text-lg font-bold text-navy mb-1">
            {todayReport ? 'Update' : 'Submit'} Daily Report
          </h2>
          <p className="text-xs text-gray-400 mb-5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">What did you work on today? *</label>
              <textarea
                className="input resize-none"
                rows={5}
                placeholder="Describe everything you worked on today — tasks completed, meetings attended, problems solved, calls made..."
                value={form.work_done}
                onChange={e => setForm(f => ({ ...f, work_done: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">{form.work_done.length} characters</p>
            </div>

            <div>
              <label className="label">Plan for tomorrow</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="What do you plan to do tomorrow?"
                value={form.plan_tomorrow}
                onChange={e => setForm(f => ({ ...f, plan_tomorrow: e.target.value }))}
              />
            </div>

            <div className="max-w-xs">
              <label className="label">Hours worked today</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="12"
                className="input"
                placeholder="e.g. 8.5"
                value={form.hours_worked}
                onChange={e => setForm(f => ({ ...f, hours_worked: e.target.value }))}
              />
            </div>

            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Send size={15} />
              {saving ? 'Submitting...' : todayReport ? 'Update Report' : 'Submit Report'}
            </button>
          </form>
        </div>
      )}

      {/* My history */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {myReports.length === 0 ? (
            <div className="card text-center py-10">
              <FileText size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 font-medium">No reports yet</p>
              <p className="text-sm text-gray-400">Submit your first daily report to track your progress</p>
            </div>
          ) : (
            myReports.map(r => (
              <div key={r.id} className="card hover:shadow-card-hover transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-navy">{format(parseISO(r.date), 'EEEE, MMMM d, yyyy')}</p>
                  <div className="flex items-center gap-2">
                    {r.hours_worked && (
                      <span className="badge badge-blue">{r.hours_worked}h</span>
                    )}
                    <span className="text-xs text-gray-400">{format(parseISO(r.submitted_at), 'h:mm a')}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Work Done</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.work_done}</p>
                  </div>
                  {r.plan_tomorrow && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Plan for Next Day</p>
                      <p className="text-sm text-gray-700">{r.plan_tomorrow}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* All reports — admin */}
      {activeTab === 'all' && isAdmin() && (
        <div className="space-y-3">
          {allReports.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400">No reports found</p>
            </div>
          ) : (
            allReports.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-purple-blue flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {r.users?.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-navy">{r.users?.full_name}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(r.submitted_at), 'h:mm a')}</p>
                    </div>
                    <p className="text-xs text-gray-400 capitalize">{r.users?.role?.replace('_', ' ')} · {format(parseISO(r.date), 'EEE, MMM d')}</p>
                  </div>
                  {r.hours_worked && <span className="badge badge-blue">{r.hours_worked}h</span>}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.work_done}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
