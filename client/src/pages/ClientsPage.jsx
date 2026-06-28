import { useState, useEffect } from 'react';
import {
  Plus, X, Search, Phone, Mail, DollarSign, Briefcase, Calendar, Clock,
  MessageSquare, FileText, CheckCircle2, Send, Copy, BookOpen, AlertCircle, BarChart2
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import EmptyState from '../components/EmptyState';

const BD_STAGES = [
  { id: 'prospect', label: 'Prospect', color: 'border-t-slate-400', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700' },
  { id: 'contacted', label: 'Contacted', color: 'border-t-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  { id: 'interested', label: 'Interested', color: 'border-t-indigo-500', dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'border-t-yellow-500', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  { id: 'deal_closed', label: 'Deal Closed 🤝', color: 'border-t-teal-500', dot: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700' },
  { id: 'payment_received', label: 'Payment Received 💰', color: 'border-t-green-500', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  { id: 'work_assigned', label: 'Work Assigned to IT 🚀', color: 'border-t-purple-500', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
];

const SOURCES = [
  { id: 'google', label: 'Google Search' },
  { id: 'referral', label: 'Referral' },
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'other', label: 'Other' },
];

const TEMPLATE_PRESETS = [
  {
    id: 'intro',
    name: 'Introduction Pitch',
    subject: 'Boost Your Online Business - Site4People Development Services',
    body: 'Hi [Name],\n\nI noticed your business [Company] listed on Google and wanted to reach out. At Site4People, we specialize in helping local businesses grow online by building modern websites, custom mobile apps, and automated AI tools.\n\nCould we jump on a brief 5-minute call this week to discuss how we can help you attract more customers?\n\nBest regards,\n[MyName]\nBusiness Development Team\nSite4People'
  },
  {
    id: 'proposal',
    name: 'Custom Web Proposal',
    subject: 'Project Proposal: Website & Software Development',
    body: 'Hi [Name],\n\nThank you for taking the time to speak with me. Based on our discussion, here is our proposal for [Company]:\n\n- Custom Responsive Website Design\n- Integrated Contact Forms & SEO Optimization\n- 1 Year Domain & Hosting Support\n\nTotal Investment: ₹[Amount] (Payment terms: [Terms])\n\nPlease let me know if you have any questions. We are ready to start immediately!\n\nBest regards,\n[MyName]\nSite4People'
  },
  {
    id: 'followup',
    name: 'Quick Follow-up',
    subject: 'Follow up regarding Site4People Proposal',
    body: 'Hi [Name],\n\nHope you are doing well!\n\nJust following up on the website proposal I sent over last week for [Company]. Have you had a chance to review it with your team?\n\nWe have slots open this month to assign to our IT developers if we lock the project in.\n\nBest regards,\n[MyName]\nSite4People'
  }
];

// ─── Modal: Add/Edit Lead ───
function ClientModal({ client, onClose, onSaved }) {
  const isEdit = !!client?.id;
  const [form, setForm] = useState({
    company_name: client?.company_name || '',
    contact_person: client?.contact_person || '',
    phone: client?.phone || '',
    email: client?.email || '',
    city: client?.city || '',
    source: client?.source || 'google',
    service_interest: client?.service_interest || '',
    deal_value: client?.deal_value || '',
    notes: client?.notes || '',
    next_followup: client?.next_followup || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name) return toast.error('Company/Business name required');
    setSaving(true);
    try {
      let res;
      if (isEdit) {
        res = await api.patch(`/clients/${client.id}`, form);
        onSaved(res.data.client, 'update');
      } else {
        res = await api.post('/clients', form);
        onSaved(res.data.client, 'create');
      }
      toast.success(isEdit ? 'Lead updated!' : 'Lead added to pipeline!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lead');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">{isEdit ? 'Edit Pipeline Lead' : 'Add New Pipeline Lead'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Business Name *</label>
            <input className="input" placeholder="e.g. Apollo Pharmacy, Dental Clinic..." value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Owner / Contact Name</label>
              <input className="input" placeholder="e.g. Dr. Amit Shah" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input className="input" placeholder="+91..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="owner@business.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" placeholder="e.g. Ahmedabad" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Lead Source</label>
              <select className="input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Service Interested In</label>
              <input className="input" placeholder="e.g. Custom Website, Web App" value={form.service_interest} onChange={e => setForm(f => ({ ...f, service_interest: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estimated Deal Value (₹)</label>
              <input type="number" className="input" placeholder="Agreed/Expected amount" value={form.deal_value} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))} />
            </div>
            <div>
              <label className="label">Next Follow-up Date</label>
              <input type="date" className="input" value={form.next_followup} onChange={e => setForm(f => ({ ...f, next_followup: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes / Discussion Details</label>
            <textarea className="input resize-none" rows={3} placeholder="Cold call response, specific tech needs..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : isEdit ? 'Update Lead' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Log Call ───
function LogCallModal({ client, onClose }) {
  const [outcome, setOutcome] = useState('answered');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/clients/${client.id}/call-log`, { outcome, notes });
      toast.success('Call log saved!');
      onClose();
    } catch {
      toast.error('Failed to log call');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-base flex items-center gap-1">
            <Phone size={16} className="text-blue-600 animate-pulse" />
            Log Client Call
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Call with: <span className="font-semibold text-gray-700">{client.company_name}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Call Outcome</label>
            <select className="input" value={outcome} onChange={e => setOutcome(e.target.value)}>
              <option value="answered">Answered / Pitched</option>
              <option value="no_answer">No Answer / Switched Off</option>
              <option value="callback">Callback Scheduled</option>
              <option value="interested">Very Interested</option>
              <option value="not_interested">Not Interested / Rejected</option>
            </select>
          </div>
          <div>
            <label className="label">Quick Call Notes</label>
            <textarea className="input resize-none" rows={3} placeholder="What did the client say? Next steps..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Logging...' : 'Log Call'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Deal Closure ───
function DealClosedModal({ client, onClose, onCompleted }) {
  const [form, setForm] = useState({
    deal_value: client.deal_value || '',
    payment_terms: 'full_advance',
    expected_payment_date: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.deal_value) return toast.error('Deal value/Agreed amount required');
    setSaving(true);
    try {
      const res = await api.patch(`/clients/${client.id}`, {
        stage: 'deal_closed',
        deal_value: parseFloat(form.deal_value),
        payment_terms: form.payment_terms,
        expected_payment_date: form.expected_payment_date,
        payment_status: 'pending',
        notes: `${client.notes || ''}\n\nDeal Closed Terms: ${form.payment_terms}. Expected payment: ${form.expected_payment_date}. Notes: ${form.notes}`
      });
      toast.success('Deal cracked! Lead moved to Deal Closed 🤝');
      onCompleted(res.data.client);
      onClose();
    } catch {
      toast.error('Failed to close deal');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-base">Crack Deal Closure Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Final Agreed Deal Amount (₹) *</label>
            <input type="number" className="input" value={form.deal_value} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Payment Terms</label>
            <select className="input" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
              <option value="full_advance">100% Full Advance</option>
              <option value="50_50">50% Advance - 50% Delivery</option>
              <option value="custom">Custom Milestone Split</option>
            </select>
          </div>
          <div>
            <label className="label">Expected Payment Date</label>
            <input type="date" className="input" value={form.expected_payment_date} onChange={e => setForm(f => ({ ...f, expected_payment_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Add Closure notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Add requirements, packages chosen..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">Crack Deal 🎉</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Payment Tracker ───
function MarkPaymentModal({ client, onClose, onCompleted }) {
  const [amount, setAmount] = useState(client.deal_value || '');
  const [mode, setMode] = useState('UPI');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) return toast.error('Amount received is required');
    setSaving(true);
    try {
      const res = await api.patch(`/clients/${client.id}`, {
        stage: 'payment_received',
        payment_status: 'received',
        payment_mode: mode,
        payment_amount: parseFloat(amount),
        payment_date: date
      });
      toast.success('Payment recorded! Lead moved to Payment Received.');
      onCompleted(res.data.client);
      onClose();
    } catch {
      toast.error('Failed to log payment');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-base">Record Payment Log</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Amount Received (₹) *</label>
            <input type="number" className="input" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Payment Mode</label>
              <select className="input" value={mode} onChange={e => setMode(e.target.value)}>
                <option value="UPI">UPI (QR Code)</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer / Online</option>
              </select>
            </div>
            <div>
              <label className="label">Received Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">Record Paid Status</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Assign to IT ───
function AssignToItModal({ client, onClose, onCompleted }) {
  const [form, setForm] = useState({
    project_type: 'website',
    description: '',
    reference_links: '',
    deadline_preference: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/clients/${client.id}/assign-to-it`, form);
      toast.success('Project details sent! Admin notified to assign developer. 🚀');
      const res = await api.get(`/clients/${client.id}`);
      onCompleted(res.data.client);
      onClose();
    } catch {
      toast.error('Failed to dispatch project scope');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-base">IT Assignment Requirement Form</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-semibold mb-4">
          Client: {client.company_name} · Revenue: ₹{client.deal_value}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Project Type</label>
            <select className="input" value={form.project_type} onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}>
              <option value="website">Website Development</option>
              <option value="custom_software">Custom Software</option>
              <option value="ai_tool">AI Tool / automation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Scope / Requirements Description</label>
            <textarea className="input resize-none" rows={4} placeholder="Summarize features needed..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Reference Links (e.g. competitor sites)</label>
            <input className="input" placeholder="e.g. www.competitor.com" value={form.reference_links} onChange={e => setForm(f => ({ ...f, reference_links: e.target.value }))} />
          </div>
          <div>
            <label className="label">Preferred Deadline Timeframe</label>
            <input className="input" placeholder="e.g. 2 weeks, by end of month..." value={form.deadline_preference} onChange={e => setForm(f => ({ ...f, deadline_preference: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">Submit to Dev Queue</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Email Templates Preset Panel ───
function EmailTemplatesModal({ client, onClose }) {
  const { user } = useAuth();
  const [selectedPreset, setSelectedPreset] = useState(TEMPLATE_PRESETS[0]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (selectedPreset) {
      const parsedSubject = selectedPreset.subject
        .replace('[Company]', client.company_name);
      const parsedBody = selectedPreset.body
        .replace('[Name]', client.contact_person || 'Client')
        .replace('[Company]', client.company_name)
        .replace('[Amount]', client.deal_value || 'Negotiable')
        .replace('[Terms]', client.payment_terms || '100% advance')
        .replace('[MyName]', user.full_name);
      setSubject(parsedSubject);
      setBody(parsedBody);
    }
  }, [selectedPreset, client, user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.success('Email copy copied to clipboard! 📋');
  };

  const handleSendMail = () => {
    const mailto = `mailto:${client.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-base flex items-center gap-1.5">
            <BookOpen size={16} className="text-purple-600" />
            BD Pitch Email Templates
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {TEMPLATE_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${selectedPreset.id === preset.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Subject Line</label>
            <input className="input py-2 text-xs" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="label">Email Body Content</label>
            <textarea className="input resize-none text-xs" rows={9} value={body} onChange={e => setBody(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
              <Copy size={14} />
              Copy Content
            </button>
            <button onClick={handleSendMail} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
              <Send size={14} />
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function ClientsPage() {
  const { isAdmin, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' or 'performance'
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [callLead, setCallLead] = useState(null);
  const [closeLead, setCloseLead] = useState(null);
  const [payLead, setPayLead] = useState(null);
  const [assignLead, setAssignLead] = useState(null);
  const [emailLead, setEmailLead] = useState(null);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data.clients || []);
    } catch { /* ignored */ }
    finally { setLoading(false); }
  };

  const handleSaved = (client, action) => {
    if (action === 'create') setClients(prev => [client, ...prev]);
    else setClients(prev => prev.map(c => c.id === client.id ? client : c));
  };

  const handleStageChange = async (id, stage) => {
    try {
      const res = await api.patch(`/clients/${id}`, { stage });
      setClients(prev => prev.map(c => c.id === id ? res.data.client : c));
      toast.success(`Moved lead to ${stage.replace('_', ' ')}!`);
    } catch { toast.error('Failed to change stage'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this lead from pipeline permanently?')) return;
    try {
      await api.delete(`/clients/${id}`);
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Lead removed');
    } catch { toast.error('Failed to delete lead'); }
  };

  const filtered = clients.filter(c => {
    const matchStage = filterStage === 'all' || c.stage === filterStage;
    const matchSearch = !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || c.contact_person?.toLowerCase().includes(search.toLowerCase());
    return matchStage && matchSearch;
  });

  const byStage = BD_STAGES.reduce((acc, s) => {
    acc[s.id] = clients.filter(c => c.stage === s.id);
    return acc;
  }, {});

  // Metrics summary
  const totalLeads = clients.length;
  const dealsClosedCount = clients.filter(c => ['deal_closed', 'payment_received', 'work_assigned'].includes(c.stage)).length;
  const totalAgreedRevenue = clients.filter(c => ['deal_closed', 'payment_received', 'work_assigned'].includes(c.stage)).reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0);
  const totalCollectedRevenue = clients.filter(c => ['payment_received', 'work_assigned'].includes(c.stage)).reduce((sum, c) => sum + (parseFloat(c.payment_amount) || parseFloat(c.deal_value) || 0), 0);

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 animate-slide-up relative">
      
      {/* Performance Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-3 bg-slate-50 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Pipeline Leads</span>
          <span className="text-xl font-extrabold text-navy mt-0.5 block">{totalLeads}</span>
        </div>
        <div className="p-3 bg-blue-50 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-blue-500 block">Deals Won / Closed</span>
          <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">{dealsClosedCount}</span>
        </div>
        <div className="p-3 bg-indigo-50 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-indigo-500 block">Agreed Book Value</span>
          <span className="text-xl font-extrabold text-indigo-700 mt-0.5 block">₹{totalAgreedRevenue.toLocaleString()}</span>
        </div>
        <div className="p-3 bg-green-50 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-green-500 block">Revenue Collected</span>
          <span className="text-xl font-extrabold text-green-700 mt-0.5 block">₹{totalCollectedRevenue.toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${activeTab === 'pipeline' ? 'bg-navy text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-950'}`}
          >
            <Briefcase size={14} />
            Pipeline Board
          </button>
          {isAdmin() && (
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${activeTab === 'performance' ? 'bg-navy text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-950'}`}
            >
              <BarChart2 size={14} />
              Intern Performance Report
            </button>
          )}
        </div>
        <button
          onClick={() => { setEditLead(null); setShowAddModal(true); }}
          className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
        >
          <Plus size={14} />
          New Lead
        </button>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {clients.length === 0 ? (
            <div className="card">
              <EmptyState type="leads" onAction={() => { setEditLead(null); setShowAddModal(true); }} />
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-9 text-xs py-2.5" placeholder="Search business name, contact owner..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select
                  value={filterStage}
                  onChange={e => setFilterStage(e.target.value)}
                  className="input border border-gray-200 text-xs py-2.5 text-gray-600 bg-white sm:w-48"
                >
                  <option value="all">All Stages</option>
                  {BD_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              {/* Kanban pipeline columns */}
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
                {BD_STAGES.map(stage => {
              const stageClients = filtered.filter(c => c.stage === stage.id);
              return (
                <div key={stage.id} className="pipeline-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{stage.label}</span>
                    <span className="bg-white text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full border">
                      {stageClients.length}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {stageClients.length === 0 && (
                      <p className="text-[10px] text-gray-400 text-center py-6">Empty Stage</p>
                    )}
                    {stageClients.map(c => (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 group relative hover:shadow-md transition-shadow cursor-default"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="text-xs font-extrabold text-navy truncate max-w-[140px]">{c.company_name}</h4>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {c.contact_person && (
                          <p className="text-[10px] text-gray-400 font-semibold mb-2">{c.contact_person} {c.city ? `(${c.city})` : ''}</p>
                        )}

                        <div className="space-y-1.5 text-[10px] text-gray-500 mb-3 border-t border-gray-50 pt-2">
                          <div className="flex items-center gap-1">
                            <Phone size={10} />
                            <span>{c.phone || 'No phone'}</span>
                          </div>
                          {c.service_interest && (
                            <div className="flex items-center gap-1 text-purple-600 font-semibold">
                              <Briefcase size={10} />
                              <span className="truncate">{c.service_interest}</span>
                            </div>
                          )}
                          {c.deal_value && (
                            <div className="flex items-center gap-1 text-green-600 font-bold">
                              <DollarSign size={10} />
                              <span>₹{Number(c.deal_value).toLocaleString()}</span>
                            </div>
                          )}
                          {c.next_followup && (
                            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
                              <Clock size={10} />
                              <span>Followup: {format(parseISO(c.next_followup), 'MMM d')}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick action triggers */}
                        <div className="flex items-center gap-1 border-t border-gray-50 pt-2 flex-wrap">
                          <button
                            onClick={() => setCallLead(c)}
                            title="Log Call Outcome"
                            className="p-1.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <Phone size={11} />
                          </button>
                          <button
                            onClick={() => setEmailLead(c)}
                            title="Email Pitch Templates"
                            className="p-1.5 rounded-lg border border-purple-100 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                          >
                            <Mail size={11} />
                          </button>
                          
                          {/* Closure Actions */}
                          {c.stage === 'proposal_sent' && (
                            <button
                              onClick={() => setCloseLead(c)}
                              className="text-[9px] bg-teal-600 hover:bg-black text-white px-2 py-1 rounded-lg font-bold ml-auto transition-colors"
                            >
                              Crack Deal
                            </button>
                          )}
                          {c.stage === 'deal_closed' && (
                            <button
                              onClick={() => setPayLead(c)}
                              className="text-[9px] bg-green-600 hover:bg-black text-white px-2 py-1 rounded-lg font-bold ml-auto transition-colors animate-pulse"
                            >
                              Recv Payment
                            </button>
                          )}
                          {c.stage === 'payment_received' && (
                            <button
                              onClick={() => setAssignLead(c)}
                              className="text-[9px] bg-purple-600 hover:bg-black text-white px-2 py-1 rounded-lg font-bold ml-auto transition-colors"
                            >
                              Assign IT
                            </button>
                          )}
                          
                          <select
                            value={c.stage}
                            onChange={(e) => handleStageChange(c.id, e.target.value)}
                            className="text-[9px] border border-gray-100 rounded bg-white py-0.5 ml-auto text-gray-500 max-w-[100px] outline-none"
                          >
                            {BD_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  ) : (
        /* Performance metrics view (Admin only) */
        <div className="card space-y-4">
          <h3 className="font-bold text-navy">Business Development Intern Leaderboard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Intern Name</th>
                  <th className="px-6 py-3">Total Leads Managed</th>
                  <th className="px-6 py-3">Deals Won</th>
                  <th className="px-6 py-3">Closing Rate</th>
                  <th className="px-6 py-3">Total Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Dynamically calculate per-intern performance */}
                {Object.entries(
                  clients.reduce((acc, lead) => {
                    const name = lead.managed_by_user?.full_name || 'Unassigned';
                    if (!acc[name]) acc[name] = { total: 0, won: 0, revenue: 0 };
                    acc[name].total += 1;
                    if (['deal_closed', 'payment_received', 'work_assigned'].includes(lead.stage)) {
                      acc[name].won += 1;
                      acc[name].revenue += parseFloat(lead.deal_value) || 0;
                    }
                    return acc;
                  }, {})
                ).map(([name, data]) => (
                  <tr key={name} className="bg-white hover:bg-gray-50 font-medium">
                    <td className="px-6 py-4 text-navy font-semibold">{name}</td>
                    <td className="px-6 py-4">{data.total}</td>
                    <td className="px-6 py-4 text-green-600 font-bold">{data.won}</td>
                    <td className="px-6 py-4">
                      {((data.won / data.total) * 100 || 0).toFixed(0)}%
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-bold">₹{data.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showAddModal && (
        <ClientModal
          client={editLead}
          onClose={() => { setShowAddModal(false); setEditLead(null); }}
          onSaved={handleSaved}
        />
      )}
      {callLead && (
        <LogCallModal
          client={callLead}
          onClose={() => setCallLead(null)}
        />
      )}
      {closeLead && (
        <DealClosedModal
          client={closeLead}
          onClose={() => setCloseLead(null)}
          onCompleted={(c) => handleSaved(c, 'update')}
        />
      )}
      {payLead && (
        <MarkPaymentModal
          client={payLead}
          onClose={() => setPayLead(null)}
          onCompleted={(c) => handleSaved(c, 'update')}
        />
      )}
      {assignLead && (
        <AssignToItModal
          client={assignLead}
          onClose={() => setAssignLead(null)}
          onCompleted={(c) => handleSaved(c, 'update')}
        />
      )}
      {emailLead && (
        <EmailTemplatesModal
          client={emailLead}
          onClose={() => setEmailLead(null)}
        />
      )}
    </div>
  );
}
