import { useState, useEffect } from 'react';
import { Plus, X, Search, Clock, DollarSign, Briefcase, Filter, Calendar, CheckSquare, Award, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PROJECT_TYPES = [
  { id: 'website', label: 'Website Development' },
  { id: 'custom_software', label: 'Custom Software' },
  { id: 'ai_tool', label: 'AI Tools / automation' },
  { id: 'other', label: 'Other Digital Product' },
];

const STATUS_OPTS = [
  { id: 'planning', label: 'Planning', color: 'bg-slate-100 text-slate-700' },
  { id: 'active', label: 'Active / Building', color: 'bg-blue-100 text-blue-700' },
  { id: 'review', label: 'In Review', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
];

function CreateProjectModal({ onClose, onCreated, interns }) {
  const [form, setForm] = useState({
    client_name: '',
    project_type: 'website',
    description: '',
    assigned_interns: [],
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    status: 'planning',
    invoiced_amount: '',
    payment_status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name) return toast.error('Client name required');
    setSaving(true);
    try {
      const res = await api.post('/projects', form);
      onCreated(res.data.project);
      toast.success('Project created!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally { setSaving(false); }
  };

  const handleToggleIntern = (id) => {
    setForm(prev => {
      const exists = prev.assigned_interns.includes(id);
      return {
        ...prev,
        assigned_interns: exists
          ? prev.assigned_interns.filter(i => i !== id)
          : [...prev.assigned_interns, id]
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">New IT Project</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Client Name *</label>
            <input className="input" placeholder="Client business name..." value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Project Type</label>
              <select className="input" value={form.project_type} onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}>
                {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Initial Invoiced Value (₹)</label>
              <input type="number" className="input" placeholder="Value in INR" value={form.invoiced_amount} onChange={e => setForm(f => ({ ...f, invoiced_amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Description / Features Needed</label>
            <textarea className="input resize-none" rows={3} placeholder="Requirements summary..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Select Assigned IT Interns (Multi-select)</label>
            <div className="grid grid-cols-2 gap-2 border border-gray-100 p-3 rounded-xl max-h-32 overflow-y-auto">
              {interns.map(i => {
                const active = form.assigned_interns.includes(i.id);
                return (
                  <button
                    type="button"
                    key={i.id}
                    onClick={() => handleToggleIntern(i.id)}
                    className={`text-left text-xs px-2.5 py-2 rounded-lg transition-colors border ${active ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {i.full_name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Target Completion Date</label>
              <input type="date" className="input" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Initial Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment Status</label>
              <select className="input" value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="received">Received / Paid</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignTaskModal({ onClose, project, interns }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
    project_id: project?.id || '',
    project_name: project?.client_name || '',
    client_name: project?.client_name || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Default to first intern
    if (interns && interns.length > 0 && !form.assigned_to) {
      setForm(f => ({ ...f, assigned_to: interns[0].id }));
    }
  }, [interns, form.assigned_to]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Title required');
    setSaving(true);
    try {
      await api.post('/tasks', form);
      toast.success('Task assigned successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">Assign Project Task</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={18} /></button>
        </div>
        <div className="bg-purple-50 text-purple-700 px-3 py-2 rounded-xl text-xs font-semibold mb-4">
          Client: {project?.client_name} ({project?.project_type})
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Task Title *</label>
            <input className="input" placeholder="e.g. Design Landing Page draft..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Description / Instructions</label>
            <textarea className="input resize-none" rows={3} placeholder="Provide details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assign To</label>
              <select className="input" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                {interns.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Deadline Date</label>
            <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Assigning...' : 'Assign Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { isAdmin, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [assignProject, setAssignProject] = useState(null);

  useEffect(() => {
    fetchProjects();
    if (isAdmin()) fetchITInterns();
  }, [isAdmin]);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  const fetchITInterns = async () => {
    try {
      const res = await api.get('/users/team');
      const filtered = (res.data.users || []).filter(u => u.role === 'it_intern');
      setInterns(filtered);
    } catch { /* handled */ }
  };

  const updateProjectStatus = async (id, status) => {
    try {
      await api.patch(`/projects/${id}`, { status });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      toast.success('Project status updated!');
    } catch { toast.error('Failed to update status'); }
  };

  const updatePaymentStatus = async (id, payment_status) => {
    try {
      await api.patch(`/projects/${id}`, { payment_status });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, payment_status } : p));
      toast.success('Payment status updated!');
    } catch { toast.error('Failed to update payment status'); }
  };

  const handleCreated = (proj) => {
    setProjects(prev => [proj, ...prev]);
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.client_name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || p.project_type === filterType;
    return matchSearch && matchType;
  });

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-navy">Site4People IT Projects</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage digital products development, client deliveries, and invoices</p>
        </div>
        {isAdmin() && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 shrink-0">
            <Plus size={16} />
            New IT Project
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search client name or description..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input border border-gray-200 text-gray-600 bg-white">
            <option value="all">All Types</option>
            {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Project Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Briefcase className="text-gray-300 mx-auto mb-3" size={36} />
          <p className="text-sm text-gray-500">No active projects found. Let's start building!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(proj => {
            const st = STATUS_OPTS.find(s => s.id === proj.status) || STATUS_OPTS[0];
            return (
              <div key={proj.id} className="card hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md">
                        {PROJECT_TYPES.find(t => t.id === proj.project_type)?.label || proj.project_type}
                      </span>
                      <h3 className="font-bold text-navy text-lg mt-1">{proj.client_name}</h3>
                    </div>
                    <select
                      value={proj.status}
                      disabled={!isAdmin()}
                      onChange={e => updateProjectStatus(proj.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border border-transparent cursor-pointer outline-none ${st.color}`}
                    >
                      {STATUS_OPTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-3 mb-4 mt-2">
                    {proj.description || 'No project scope description provided yet.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl mb-4 text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Start Date</span>
                      <span className="font-semibold text-gray-700 flex items-center gap-1">
                        <Calendar size={12} className="text-blue-500" />
                        {proj.start_date ? format(new Date(proj.start_date), 'MMM d, yyyy') : 'Not Set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Target Completion</span>
                      <span className="font-semibold text-gray-700 flex items-center gap-1">
                        <Clock size={12} className="text-orange-500" />
                        {proj.target_date ? format(new Date(proj.target_date), 'MMM d, yyyy') : 'Flexible'}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Interns Row */}
                  <div className="mb-4">
                    <span className="text-xs text-gray-400 block mb-1.5 font-medium">Assigned Developers</span>
                    <div className="flex flex-wrap gap-1">
                      {proj.assigned_interns_profiles && proj.assigned_interns_profiles.length > 0 ? (
                        proj.assigned_interns_profiles.map(i => (
                          <span key={i.id} className="badge bg-purple-50 text-purple-700 border border-purple-100 text-[10px]">
                            {i.full_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">No developer assigned yet.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Info & Actions */}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-3 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="text-xs">
                      <span className="text-gray-400 block">Total Invoice</span>
                      <span className="font-bold text-gray-800">₹{Number(proj.invoiced_amount).toLocaleString()}</span>
                    </div>
                    <select
                      value={proj.payment_status}
                      disabled={!isAdmin()}
                      onChange={e => updatePaymentStatus(proj.id, e.target.value)}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        proj.payment_status === 'received' ? 'bg-green-100 text-green-700' :
                        proj.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="received">Paid</option>
                    </select>
                  </div>

                  {isAdmin() && (
                    <button
                      onClick={() => setAssignProject(proj)}
                      className="bg-navy hover:bg-black text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                    >
                      <CheckSquare size={13} />
                      Assign Task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          interns={interns}
        />
      )}

      {assignProject && (
        <AssignTaskModal
          onClose={() => setAssignProject(null)}
          project={assignProject}
          interns={assignProject.assigned_interns_profiles || interns}
        />
      )}
    </div>
  );
}
