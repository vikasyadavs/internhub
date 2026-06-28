import { useState, useEffect } from 'react';
import {
  Plus, X, Phone, Mail, User, Search, Edit2, Upload, FileSpreadsheet,
  Calendar, MessageSquare, Video, Users, ChevronRight, AlertCircle,
  Clock, CheckCircle2, Copy, Clipboard, BarChart2
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO, isPast, isToday } from 'date-fns';
import * as XLSX from 'xlsx';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';

const STAGES = [
  { id: 'called', label: 'Called', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { id: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'english_test', label: 'English Test', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'interview_scheduled', label: 'Interview', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'selected', label: 'Selected', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-300' },
];

// ─── WhatsApp Templates ───────────────────────────────────────────────────────
function fillTemplate(template, vars) {
  if (!template) return '';
  return template
    .replace(/\{name\}/g, vars.name || '')
    .replace(/\{position\}/g, vars.position || '')
    .replace(/\{date\}/g, vars.date || '')
    .replace(/\{time\}/g, vars.time || '')
    .replace(/\{employer\}/g, vars.employer || '')
    .replace(/\{link\}/g, vars.link || '');
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors font-medium"
    >
      {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Schedule Interview Modal ─────────────────────────────────────────────────
function ScheduleInterviewModal({ candidate, settings, onClose, onScheduled }) {
  const [form, setForm] = useState({
    interview_date: '',
    interview_time: '',
    mode: 'in_person',
    employer_name: '',
    job_role: candidate?.position_applied || '',
    interviewer_name: '',
    interview_link: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const whatsappText = fillTemplate(
    settings?.whatsapp_templates?.interview_confirmation ||
    `Dear {name},\n\nYour interview has been scheduled!\n\n📋 Role: {position}\n🏢 Employer: {employer}\n📅 Date: {date}\n⏰ Time: {time}\n\nPlease be on time and carry your resume.\n\nBest wishes,\nSI Placements Internationals`,
    {
      name: candidate?.candidate_name || '',
      position: form.job_role,
      employer: form.employer_name,
      date: form.interview_date,
      time: form.interview_time,
      link: form.interview_link,
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.interview_date) return toast.error('Interview date is required');
    setSaving(true);
    try {
      const res = await api.post(`/recruitment/${candidate.id}/schedule-interview`, form);
      toast.success('Interview scheduled! Follow-up set for the next day.');
      onScheduled(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule interview');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-navy">Schedule Interview</h2>
            <p className="text-xs text-gray-400 mt-0.5">For: {candidate?.candidate_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Interview Date *</label>
              <input type="date" className="input" value={form.interview_date} onChange={e => setForm(f => ({ ...f, interview_date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" className="input" value={form.interview_time} onChange={e => setForm(f => ({ ...f, interview_time: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Interview Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'in_person', label: 'In-Person', icon: Users },
                { id: 'video', label: 'Video Call', icon: Video },
                { id: 'phone', label: 'Phone', icon: Phone },
              ].map(m => (
                <button key={m.id} type="button" onClick={() => setForm(f => ({ ...f, mode: m.id }))}
                  className={`p-2 rounded-xl border-2 text-xs font-medium flex flex-col items-center gap-1 transition-all ${form.mode === m.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <m.icon size={16} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Employer / Client Name</label>
              <input className="input" placeholder="Company name" value={form.employer_name} onChange={e => setForm(f => ({ ...f, employer_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Job Role</label>
              <input className="input" placeholder="Role applied for" value={form.job_role} onChange={e => setForm(f => ({ ...f, job_role: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Interviewer Name</label>
              <input className="input" placeholder="HR / Manager name" value={form.interviewer_name} onChange={e => setForm(f => ({ ...f, interviewer_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Interview Link {form.mode === 'video' && <span className="text-red-500">*</span>}</label>
              <input className="input" placeholder="Zoom / Meet URL" value={form.interview_link} onChange={e => setForm(f => ({ ...f, interview_link: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Preparation tips or instructions..." />
          </div>

          {/* WhatsApp Template */}
          <div className="border border-green-200 rounded-xl bg-green-50/50">
            <button type="button" onClick={() => setShowTemplate(t => !t)}
              className="w-full flex items-center justify-between p-3 text-sm font-semibold text-green-800">
              <span className="flex items-center gap-2"><MessageSquare size={15} /> WhatsApp Confirmation Template</span>
              <ChevronRight size={14} className={`transition-transform ${showTemplate ? 'rotate-90' : ''}`} />
            </button>
            {showTemplate && (
              <div className="px-3 pb-3">
                <div className="bg-white rounded-xl border border-green-200 p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {whatsappText}
                </div>
                <div className="flex gap-2 mt-2">
                  <CopyButton text={whatsappText} />
                  <p className="text-xs text-gray-400 mt-1">Copy and send manually via WhatsApp</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            <p className="font-semibold mb-1">ℹ️ Auto Follow-up Set</p>
            <p>A follow-up reminder "Did candidate appear for interview?" will be set for the day after the interview date.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Scheduling...' : 'Schedule Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Follow-up Modal ──────────────────────────────────────────────────────────
function FollowupModal({ candidate, settings, onClose, onSaved }) {
  const [date, setDate] = useState('');
  const [note, setNote] = useState(candidate?.followup_note || '');
  const [saving, setSaving] = useState(false);

  const followupTemplate = fillTemplate(
    settings?.whatsapp_templates?.follow_up ||
    `Hi {name},\n\nThis is a follow-up regarding the {position} opportunity we discussed.\n\nAre you still interested? Please let us know your availability.\n\nRegards,\nSI Placements Internationals`,
    { name: candidate?.candidate_name, position: candidate?.position_applied }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch(`/recruitment/${candidate.id}/followup`, {
        next_followup: date || null,
        followup_note: note,
        mark_done: true,
      });
      toast.success('Follow-up updated!');
      onSaved(res.data.candidate);
      onClose();
    } catch (err) {
      toast.error('Failed to update follow-up');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-navy">Update Follow-up</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Next Follow-up Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Leave blank to clear follow-up</p>
          </div>
          <div>
            <label className="label">Notes / Reminder</label>
            <textarea className="input resize-none" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What to discuss in next follow-up..." />
          </div>

          {/* WhatsApp Follow-up Template */}
          <div className="border border-green-100 rounded-xl p-3 bg-green-50/40">
            <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1"><MessageSquare size={12} /> Follow-up WhatsApp Template</p>
            <div className="bg-white rounded-lg border border-green-200 p-2 text-xs text-gray-700 whitespace-pre-wrap max-h-24 overflow-y-auto font-mono">
              {followupTemplate}
            </div>
            <CopyButton text={followupTemplate} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Mark Done & Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Candidate Modal ──────────────────────────────────────────────────────────
function CandidateModal({ candidate, onClose, onSaved }) {
  const isEdit = !!candidate?.id;
  const [form, setForm] = useState({
    candidate_name: candidate?.candidate_name || '',
    phone: candidate?.phone || '',
    email: candidate?.email || '',
    position_applied: candidate?.position_applied || '',
    stage: candidate?.stage || 'called',
    notes: candidate?.notes || '',
    next_followup: candidate?.next_followup || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.candidate_name) return toast.error('Candidate name required');
    setSaving(true);
    try {
      let res;
      if (isEdit) {
        res = await api.patch(`/recruitment/${candidate.id}`, form);
        onSaved(res.data.candidate, 'update');
      } else {
        res = await api.post('/recruitment', form);
        onSaved(res.data.candidate, 'create');
      }
      toast.success(isEdit ? 'Candidate updated!' : 'Candidate added!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">{isEdit ? 'Edit Candidate' : 'Add Candidate'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" placeholder="Candidate name" value={form.candidate_name} onChange={e => setForm(f => ({ ...f, candidate_name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Position Applied</label>
              <input className="input" placeholder="e.g. HR Intern, Sales Intern" value={form.position_applied} onChange={e => setForm(f => ({ ...f, position_applied: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pipeline Stage</label>
              <select className="input" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Next Follow-up Date</label>
            <input type="date" className="input" value={form.next_followup} onChange={e => setForm(f => ({ ...f, next_followup: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={3} placeholder="Communication notes, test scores..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : isEdit ? 'Update' : 'Add to Pipeline'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Weekly Summary Card ──────────────────────────────────────────────────────
function WeeklySummary({ summary }) {
  if (!summary) return null;
  const items = [
    { label: "This Week's Calls", value: summary.callsMade, color: 'text-blue-600 bg-blue-50' },
    { label: 'Qualified', value: summary.qualified, color: 'text-purple-600 bg-purple-50' },
    { label: 'Interviews Set', value: summary.interviewsScheduled, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Selected', value: summary.offersExtended, color: 'text-green-600 bg-green-50' },
  ];
  return (
    <div className="card">
      <h3 className="font-bold text-navy mb-3 flex items-center gap-2">
        <BarChart2 size={16} className="text-purple-500" /> Weekly Summary
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(item => (
          <div key={item.label} className={`rounded-xl p-3 ${item.color}`}>
            <p className="text-2xl font-extrabold">{item.value ?? 0}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Today's Follow-ups Widget ────────────────────────────────────────────────
function TodaysFollowups({ followups, onAction }) {
  if (!followups || followups.length === 0) return null;
  return (
    <div className="card border-l-4 border-l-orange-500">
      <h3 className="font-bold text-navy mb-3 flex items-center gap-2">
        <Clock size={16} className="text-orange-500" />
        Today's Follow-ups
        <span className="ml-auto badge badge-orange">{followups.length}</span>
      </h3>
      <div className="space-y-2">
        {followups.map(c => {
          const isOverdue = c.next_followup && isPast(parseISO(c.next_followup)) && !isToday(parseISO(c.next_followup));
          return (
            <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-100'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-orange-500'}`}>
                {c.candidate_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isOverdue ? 'text-red-800' : 'text-navy'}`}>{c.candidate_name}</p>
                <p className="text-xs text-gray-500">
                  {c.followup_note || 'Follow-up due'} · {c.next_followup ? format(parseISO(c.next_followup), 'MMM d') : ''}
                  {isOverdue && <span className="ml-1 font-semibold text-red-600"> (Overdue)</span>}
                </p>
              </div>
              <button
                onClick={() => onAction(c)}
                className="text-xs px-2.5 py-1.5 bg-white border border-orange-200 text-orange-700 rounded-lg font-medium hover:bg-orange-50 shrink-0"
              >
                Update
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RecruitmentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [candidates, setCandidates] = useState([]);
  const [recruitmentInterns, setRecruitmentInterns] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCandidate, setEditCandidate] = useState(null);
  const [filterStage, setFilterStage] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('pipeline');
  const [showImport, setShowImport] = useState(false);
  const [scheduleCandidate, setScheduleCandidate] = useState(null);
  const [followupCandidate, setFollowupCandidate] = useState(null);

  // Excel import state
  const [excelFile, setExcelFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [assignTo, setAssignTo] = useState('');
  const [mapping, setMapping] = useState({ candidate_name: '', phone: '', email: '', position_applied: '', notes: '' });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchCandidates();
    fetchFollowups();
    fetchWeeklySummary();
    api.get('/settings').then(r => setSettings(r.data.settings || {})).catch(() => {});
    if (isAdmin) {
      api.get('/users/team').then(r => {
        setRecruitmentInterns((r.data.users || []).filter(u => u.role === 'recruitment_intern'));
      }).catch(() => {});
    }
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/recruitment');
      setCandidates(res.data.candidates || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchFollowups = async () => {
    try {
      const res = await api.get('/recruitment/my-followups');
      setFollowups(res.data.followups || []);
    } catch { /* silent */ }
  };

  const handleInlineEdit = async (id, field, value) => {
    try {
      const res = await api.patch(`/recruitment/${id}`, { [field]: value });
      setCandidates(prev => prev.map(c => c.id === id ? res.data.candidate : c));
      fetchFollowups();
      fetchWeeklySummary();
    } catch {
      toast.error('Failed to update field');
    }
  };

  const fetchWeeklySummary = async () => {
    try {
      const res = await api.get('/recruitment/weekly-summary');
      setWeeklySummary(res.data.summary);
    } catch { /* silent */ }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (data.length > 0) {
        const fileHeaders = data[0].map(h => String(h).trim());
        setHeaders(fileHeaders);
        const rows = data.slice(1).map(row => {
          const obj = {};
          fileHeaders.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : ''; });
          return obj;
        });
        setRawData(rows);
        const maps = { candidate_name: '', phone: '', email: '', position_applied: '', notes: '' };
        fileHeaders.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('name')) maps.candidate_name = h;
          else if (lower.includes('phone') || lower.includes('mobile')) maps.phone = h;
          else if (lower.includes('email')) maps.email = h;
          else if (lower.includes('position') || lower.includes('role')) maps.position_applied = h;
          else if (lower.includes('note') || lower.includes('remark')) maps.notes = h;
        });
        setMapping(maps);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!mapping.candidate_name) return toast.error('Please map Candidate Name field');
    setImporting(true);
    try {
      const formatted = rawData.map(row => ({
        candidate_name: row[mapping.candidate_name] || 'Unknown',
        phone: row[mapping.phone] || '',
        email: row[mapping.email] || '',
        position_applied: row[mapping.position_applied] || '',
        notes: row[mapping.notes] || '',
      }));
      const res = await api.post('/recruitment/bulk-import', { candidates: formatted, assigned_to: assignTo || undefined });
      toast.success(`Imported ${res.data.imported} candidates!`);
      setShowImport(false);
      setExcelFile(null);
      setRawData([]);
      setHeaders([]);
      fetchCandidates();
    } catch { toast.error('Bulk import failed'); }
    finally { setImporting(false); }
  };

  const handleSaved = (candidate, action) => {
    if (action === 'create') setCandidates(prev => [candidate, ...prev]);
    else setCandidates(prev => prev.map(c => c.id === candidate.id ? candidate : c));
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this candidate?')) return;
    try {
      await api.delete(`/recruitment/${id}`);
      setCandidates(prev => prev.filter(c => c.id !== id));
      toast.success('Candidate removed');
    } catch { toast.error('Failed to delete'); }
  };

  const handleStageChange = async (id, stage) => {
    try {
      const res = await api.patch(`/recruitment/${id}`, { stage });
      setCandidates(prev => prev.map(c => c.id === id ? res.data.candidate : c));
    } catch { toast.error('Failed to update stage'); }
  };

  const handleFollowupUpdated = (updated) => {
    setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
    fetchFollowups();
  };

  const handleInterviewScheduled = () => {
    fetchCandidates();
    fetchFollowups();
    fetchWeeklySummary();
  };

  const filtered = candidates.filter(c => {
    const matchStage = filterStage === 'all' || c.stage === filterStage;
    const matchSearch = !search ||
      c.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    return matchStage && matchSearch;
  });

  const byStage = STAGES.reduce((acc, s) => { acc[s.id] = candidates.filter(c => c.stage === s.id); return acc; }, {});

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  return (
    <>
      <div className="space-y-5 animate-slide-up">
        {/* Weekly Summary */}
        <WeeklySummary summary={weeklySummary} />

        {/* Today's Follow-ups */}
        <TodaysFollowups
          followups={followups}
          onAction={(c) => setFollowupCandidate(c)}
        />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search candidates by name, phone, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {['pipeline', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${view === v ? 'bg-navy text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => setShowImport(true)} className="btn-outline flex items-center gap-1.5">
              <Upload size={16} />
              <span className="hidden sm:inline">Import Excel</span>
            </button>
            <button onClick={() => { setEditCandidate(null); setShowModal(true); }} className="btn-primary flex items-center gap-1.5">
              <Plus size={16} />
              <span className="hidden sm:inline">Add Candidate</span>
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="card">
            <EmptyState type="candidates" onAction={() => { setEditCandidate(null); setShowModal(true); }} />
          </div>
        ) : (
          <>
            {/* Stage filter pills */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterStage('all')} className={`stage-pill ${filterStage === 'all' ? 'border-navy bg-navy text-white' : 'border-gray-200 text-gray-600'}`}>
                All ({candidates.length})
              </button>
              {STAGES.map(s => (
                <button key={s.id} onClick={() => setFilterStage(s.id)}
                  className={`stage-pill ${filterStage === s.id ? `${s.color} border-2` : 'border-gray-200 text-gray-500'}`}>
                  {s.label} ({byStage[s.id]?.length || 0})
                </button>
              ))}
            </div>

            {/* Pipeline View */}
            {view === 'pipeline' && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {STAGES.map(stage => {
                  const stageCandidates = filtered.filter(c => c.stage === stage.id);
                  return (
                    <div key={stage.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`badge ${stage.color} text-xs font-bold`}>{stage.label}</span>
                        <span className="text-xs font-bold text-gray-400">{stageCandidates.length}</span>
                      </div>
                      <div className="space-y-2">
                        {stageCandidates.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Empty</p>}
                        {stageCandidates.map(c => {
                          const needsFollowup = c.next_followup && (isToday(parseISO(c.next_followup)) || isPast(parseISO(c.next_followup)));
                          return (
                            <div key={c.id} className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all group"
                              onClick={() => { setEditCandidate(c); setShowModal(true); }}>
                              <p className="text-xs font-bold text-navy truncate">{c.candidate_name}</p>
                              {c.phone && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{c.phone}</p>}
                              {c.position_applied && <p className="text-[11px] text-purple-600 mt-0.5 truncate">{c.position_applied}</p>}
                              {needsFollowup && <p className="text-[10px] text-orange-600 font-semibold mt-1">⏰ Follow-up due</p>}
                              {stage.id !== 'rejected' && stage.id !== 'selected' && (
                                <div className="opacity-0 group-hover:opacity-100 flex gap-1 mt-1.5">
                                  <button onClick={ev => { ev.stopPropagation(); setScheduleCandidate(c); }}
                                    className="flex-1 text-[10px] px-1 py-0.5 bg-yellow-50 text-yellow-700 rounded font-medium">
                                    📅 Interview
                                  </button>
                                  <button onClick={ev => { ev.stopPropagation(); setFollowupCandidate(c); }}
                                    className="flex-1 text-[10px] px-1 py-0.5 bg-orange-50 text-orange-700 rounded font-medium">
                                    📞 Follow-up
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {view === 'list' && (
              <div className="card overflow-x-auto">
                {filtered.length === 0 ? (
                  <div className="text-center py-10">
                    <User size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">No candidates found</p>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate Name</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Position Applied</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Follow-up</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map(c => {
                        const isOverdue = c.next_followup && isPast(parseISO(c.next_followup)) && !isToday(parseISO(c.next_followup));
                        const isDueToday = c.next_followup && isToday(parseISO(c.next_followup));
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/70 group transition-colors">
                            {/* Candidate Name */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-purple-500 focus:ring-0 font-semibold text-navy py-1 px-1 rounded hover:bg-white focus:bg-white text-sm"
                                defaultValue={c.candidate_name}
                                onBlur={e => {
                                  if (e.target.value !== c.candidate_name) {
                                    handleInlineEdit(c.id, 'candidate_name', e.target.value);
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                              />
                            </td>

                            {/* Phone */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-purple-500 focus:ring-0 py-1 px-1 rounded hover:bg-white focus:bg-white text-xs text-gray-600 font-mono"
                                defaultValue={c.phone || ''}
                                placeholder="Add phone..."
                                onBlur={e => {
                                  if (e.target.value !== (c.phone || '')) {
                                    handleInlineEdit(c.id, 'phone', e.target.value);
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                              />
                            </td>

                            {/* Email */}
                            <td className="py-2 px-3">
                              <input
                                type="email"
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-purple-500 focus:ring-0 py-1 px-1 rounded hover:bg-white focus:bg-white text-xs text-gray-600"
                                defaultValue={c.email || ''}
                                placeholder="Add email..."
                                onBlur={e => {
                                  if (e.target.value !== (c.email || '')) {
                                    handleInlineEdit(c.id, 'email', e.target.value);
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                              />
                            </td>

                            {/* Position */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-purple-500 focus:ring-0 py-1 px-1 rounded hover:bg-white focus:bg-white text-xs text-gray-600"
                                defaultValue={c.position_applied || ''}
                                placeholder="Add position..."
                                onBlur={e => {
                                  if (e.target.value !== (c.position_applied || '')) {
                                    handleInlineEdit(c.id, 'position_applied', e.target.value);
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                              />
                            </td>

                            {/* Stage */}
                            <td className="py-2 px-3">
                              <select
                                value={c.stage}
                                onChange={e => handleStageChange(c.id, e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white cursor-pointer"
                              >
                                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                              </select>
                            </td>

                            {/* Next Follow-up */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="date"
                                  className={`text-xs border-0 border-b border-transparent focus:ring-0 focus:border-purple-500 py-1 px-1 rounded hover:bg-white focus:bg-white font-medium ${isOverdue ? 'text-red-600 bg-red-50' : isDueToday ? 'text-orange-600 bg-orange-50' : 'text-gray-600 bg-transparent'}`}
                                  value={c.next_followup || ''}
                                  onChange={e => handleInlineEdit(c.id, 'next_followup', e.target.value || null)}
                                />
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-2 px-3 text-right">
                              <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => setScheduleCandidate(c)} title="Schedule Interview"
                                  className="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600">
                                  <Calendar size={14} />
                                </button>
                                <button onClick={() => setFollowupCandidate(c)} title="Follow-up Notes / WhatsApp Templates"
                                  className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-600">
                                  <Phone size={14} />
                                </button>
                                <button onClick={() => { setEditCandidate(c); setShowModal(true); }}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500">
                                  <Edit2 size={14} />
                                </button>
                                {isAdmin && (
                                  <button onClick={() => handleDelete(c.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <CandidateModal
          candidate={editCandidate}
          onClose={() => { setShowModal(false); setEditCandidate(null); }}
          onSaved={handleSaved}
        />
      )}

      {scheduleCandidate && (
        <ScheduleInterviewModal
          candidate={scheduleCandidate}
          settings={settings}
          onClose={() => setScheduleCandidate(null)}
          onScheduled={handleInterviewScheduled}
        />
      )}

      {followupCandidate && (
        <FollowupModal
          candidate={followupCandidate}
          settings={settings}
          onClose={() => setFollowupCandidate(null)}
          onSaved={handleFollowupUpdated}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy text-base flex items-center gap-2">
                <Upload size={18} className="text-purple-600" />
                Import Candidates Spreadsheet
              </h3>
              <button onClick={() => { setShowImport(false); setExcelFile(null); setRawData([]); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {!excelFile ? (
              <div className="border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center space-y-4 bg-purple-50/10">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-purple-600">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Choose Excel/CSV Candidate List</p>
                  <p className="text-[10px] text-gray-400 mt-1">Accepts .xlsx, .xls, .csv files</p>
                </div>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="candidates-list-upload" />
                <label htmlFor="candidates-list-upload" className="btn-outline inline-flex items-center gap-2 cursor-pointer py-1.5 px-4 text-xs">
                  <Upload size={12} /> Select File
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50/30 rounded-xl border flex justify-between items-center text-xs">
                  <span className="font-semibold text-purple-700 truncate">{excelFile.name}</span>
                  <span className="badge bg-purple-100 text-purple-800 font-bold shrink-0">{rawData.length} rows</span>
                </div>

                {isAdmin && (
                  <div>
                    <label className="label text-[10px]">Assign All To Intern (Optional)</label>
                    <select className="input text-xs" value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                      <option value="">Auto-assign to uploader</option>
                      {recruitmentInterns.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-500">Column Mapping</h4>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {[
                      { key: 'candidate_name', label: 'Candidate Name *' },
                      { key: 'phone', label: 'Phone Number' },
                      { key: 'email', label: 'Email Address' },
                      { key: 'position_applied', label: 'Position Applied' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="label text-[10px]">{f.label}</label>
                        <select className="input text-xs py-1.5" value={mapping[f.key]} onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}>
                          <option value="">-- Select Column --</option>
                          {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="label text-[10px]">Remarks / Notes</label>
                      <select className="input text-xs py-1.5" value={mapping.notes} onChange={e => setMapping(m => ({ ...m, notes: e.target.value }))}>
                        <option value="">-- Select Column --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t mt-4">
                  <button type="button" onClick={() => { setExcelFile(null); setRawData([]); }} className="btn-secondary flex-1 py-2 text-xs">
                    Clear / Reset
                  </button>
                  <button type="button" onClick={handleImport} disabled={importing} className="btn-primary flex-1 py-2 text-xs">
                    {importing ? 'Importing...' : `Import ${rawData.length} Candidates`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
