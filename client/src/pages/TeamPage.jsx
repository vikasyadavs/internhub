import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Users, UserCheck, UserX, Search, Briefcase, CheckCircle2, Award } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const ROLE_LABELS = {
  admin: { label: 'Admin', cls: 'badge-purple' },
  it_intern: { label: 'IT Intern', cls: 'badge-blue' },
  bd_intern: { label: 'BD Intern', cls: 'badge-green' },
  recruitment_intern: { label: 'Rec Intern', cls: 'badge-yellow' },
  employee: { label: 'Employee', cls: 'badge-orange' },
};

const COMPANY_LABELS = {
  site4people: 'Site4People',
  si_placements: 'SI Placements',
};

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    username: user?.username || '',
    full_name: user?.full_name || '',
    password: '',
    role: user?.role || 'it_intern',
    company: user?.company || 'site4people',
    department: user?.department || '',
    batch_start: user?.batch_start || '',
    batch_end: user?.batch_end || '',
    stipend: user?.stipend || 'N/A',
    internship_mode: user?.internship_mode || 'full_time',
    custom_timing: user?.custom_timing || '10:00 AM – 7:00 PM, Mon–Sat',
    travel_allowance: user?.travel_allowance || 'N/A',
    custom_position: user?.custom_position || '',
    employee_type: user?.employee_type || '',
    daily_target: user?.daily_target || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.username) return toast.error('Name and username required');
    if (!isEdit && !form.password) return toast.error('Password required for new user');
    setSaving(true);
    try {
      const payload = {
        ...form,
        stipend: form.stipend.trim() || 'N/A',
        travel_allowance: form.travel_allowance.trim() || 'N/A',
        daily_target: form.daily_target || null,
        employee_type: form.employee_type || null,
      };
      if (!payload.password) delete payload.password;
      let res;
      if (isEdit) {
        res = await api.patch(`/users/${user.id}`, payload);
        onSaved(res.data.user, 'update');
      } else {
        res = await api.post('/users', payload);
        onSaved(res.data.user, 'create');
      }
      toast.success(isEdit ? 'User updated!' : 'User created!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleModeChange = (mode) => {
    let timing = form.custom_timing;
    if (mode === 'online') timing = 'Flexible Hours (Online), Mon–Sat';
    else if (mode === 'part_time') timing = '10:00 AM – 2:00 PM, Mon–Sat';
    else timing = '10:00 AM – 7:00 PM, Mon–Sat';
    setForm(f => ({ ...f, internship_mode: mode, custom_timing: timing }));
  };

  const isEmployee = form.role === 'employee';
  const isFieldWorker = form.internship_mode === 'field_work';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-navy dark:text-white">
              {isEdit ? 'Edit Team Member' : 'Add Team Member'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Interns or full-time employees</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="Full name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Username *</label>
              <input className="input" placeholder="username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} />
            </div>
          </div>

          <div>
            <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" className="input" placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 characters'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>

          {/* Role & Company */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role / Type</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <optgroup label="Interns">
                  <option value="it_intern">IT Intern</option>
                  <option value="bd_intern">BD Intern</option>
                  <option value="recruitment_intern">Recruitment Intern</option>
                </optgroup>
                <optgroup label="Full-Time Staff">
                  <option value="employee">Full-Time Employee</option>
                  <option value="admin">Admin</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="label">Company</label>
              <select className="input" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}>
                <option value="site4people">Site4People</option>
                <option value="si_placements">SI Placements</option>
              </select>
            </div>
          </div>

          {/* Employee Type (only for employees) */}
          {isEmployee && (
            <div>
              <label className="label">Employee Type</label>
              <select className="input" value={form.employee_type} onChange={e => setForm(f => ({ ...f, employee_type: e.target.value }))}>
                <option value="">Select employee type...</option>
                <option value="office_executive">Office Executive</option>
                <option value="field_sales_executive">Field Sales Executive</option>
                <option value="it_developer">IT Developer</option>
                <option value="hr_manager">HR Manager</option>
                <option value="accounts">Accounts / Finance</option>
              </select>
            </div>
          )}

          {/* Position & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Custom Position / Title</label>
              <input className="input" placeholder="e.g. Software Developer" value={form.custom_position} onChange={e => setForm(f => ({ ...f, custom_position: e.target.value }))} />
              <p className="text-[10px] text-gray-400 mt-0.5">Used in offer letters & certificates</p>
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" placeholder="e.g. Web Dev, HR, Sales" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
          </div>

          {/* Work Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Work Mode</label>
              <select className="input" value={form.internship_mode} onChange={e => handleModeChange(e.target.value)}>
                <option value="full_time">Full Time (Office)</option>
                <option value="part_time">Part Time (Office)</option>
                <option value="hybrid">Hybrid</option>
                <option value="online">Online / Remote</option>
                <option value="field_work">Field Work</option>
              </select>
            </div>
            <div>
              <label className="label">Working Hours / Timings</label>
              <input className="input" placeholder="10:00 AM – 7:00 PM" value={form.custom_timing} onChange={e => setForm(f => ({ ...f, custom_timing: e.target.value }))} />
            </div>
          </div>

          {/* Field Sales Target — only for field workers */}
          {isFieldWorker && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
              <label className="label text-orange-700 dark:text-orange-400">📍 Daily Client Visit Target</label>
              <input
                className="input mt-1"
                type="number"
                min="0"
                placeholder="e.g. 5 (visits required per day)"
                value={form.daily_target}
                onChange={e => setForm(f => ({ ...f, daily_target: e.target.value }))}
              />
              <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">
                If actual client visits fall short, up to 20% of that day's pay will be deducted.
              </p>
            </div>
          )}

          {/* Salary / Stipend */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{isEmployee ? 'Monthly Salary (₹)' : 'Stipend Amount'}</label>
              <input className="input" placeholder={isEmployee ? 'e.g. 25000' : 'e.g. ₹5,000/month or N/A'} value={form.stipend} onChange={e => setForm(f => ({ ...f, stipend: e.target.value }))} />
            </div>
            <div>
              <label className="label">Travel Allowance / Vehicle Policy</label>
              <input className="input" placeholder="Own Vehicle / Company Provided / N/A" value={form.travel_allowance} onChange={e => setForm(f => ({ ...f, travel_allowance: e.target.value }))} />
            </div>
          </div>

          {/* Batch / Employment Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{isEmployee ? 'Joining Date' : 'Batch / Internship Start'}</label>
              <input type="date" className="input" value={form.batch_start} onChange={e => setForm(f => ({ ...f, batch_start: e.target.value }))} />
            </div>
            <div>
              <label className="label">{isEmployee ? 'End Date (leave blank = permanent)' : 'Batch / Internship End'}</label>
              <input type="date" className="input" value={form.batch_end} onChange={e => setForm(f => ({ ...f, batch_end: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : isEdit ? 'Update Details' : isEmployee ? 'Add Employee' : 'Create Intern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleSaved = (user, action) => {
    if (action === 'create') setUsers(prev => [user, ...prev]);
    else setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this user? They will lose access.')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u));
      toast.success('User deactivated');
    } catch { toast.error('Failed'); }
  };

  const handleMarkComplete = async (u) => {
    if (!confirm(`Mark ${u.full_name}'s internship as complete? This will deactivate their account and generate a certificate notification.`)) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      // Deactivate and mark completed on user profile
      await api.patch(`/users/${u.id}`, { is_active: false, completed_at: todayStr });
      // Create certificate record
      await api.post('/documents', {
        user_id: u.id,
        type: 'completion_certificate',
        metadata: { performance: 'Excellent', completed_at: todayStr }
      });
      setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, is_active: false, completed_at: todayStr } : usr));
      toast.success(`${u.full_name}'s internship marked complete! Certificate generated.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark complete');
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchCompany = filterCompany === 'all' || u.company === filterCompany;
    return matchSearch && matchRole && matchCompany;
  });

  const activeInterns = users.filter(u => u.is_active && ['it_intern', 'bd_intern', 'recruitment_intern'].includes(u.role)).length;
  const activeEmployees = users.filter(u => u.is_active && u.role === 'employee').length;
  const byCompany = {
    site4people: users.filter(u => u.company === 'site4people' && u.is_active).length,
    si_placements: users.filter(u => u.company === 'si_placements' && u.is_active).length,
  };

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card bg-gradient-purple-blue">
          <div className="relative">
            <Users size={20} className="text-white/60 mb-2" />
            <p className="text-2xl font-extrabold text-white">{activeInterns}</p>
            <p className="text-xs text-white/80">Active Interns</p>
          </div>
        </div>
        <div className="stat-card bg-gradient-to-br from-orange-500 to-red-600">
          <div className="relative">
            <Briefcase size={20} className="text-white/60 mb-2" />
            <p className="text-2xl font-extrabold text-white">{activeEmployees}</p>
            <p className="text-xs text-white/80">Full-Time Employees</p>
          </div>
        </div>
        <div className="stat-card bg-gradient-to-br from-blue-500 to-cyan-600">
          <div className="relative">
            <UserCheck size={20} className="text-white/60 mb-2" />
            <p className="text-2xl font-extrabold text-white">{byCompany.site4people}</p>
            <p className="text-xs text-white/80">Site4People</p>
          </div>
        </div>
        <div className="stat-card bg-gradient-to-br from-purple-600 to-violet-700">
          <div className="relative">
            <UserCheck size={20} className="text-white/60 mb-2" />
            <p className="text-2xl font-extrabold text-white">{byCompany.si_placements}</p>
            <p className="text-xs text-white/80">SI Placements</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="it_intern">IT Intern</option>
          <option value="bd_intern">BD Intern</option>
          <option value="recruitment_intern">Recruitment Intern</option>
          <option value="employee">Full-Time Employee</option>
          <option value="admin">Admin</option>
        </select>
        <select className="input w-auto" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
          <option value="all">All Companies</option>
          <option value="site4people">Site4People</option>
          <option value="si_placements">SI Placements</option>
        </select>
        <button onClick={() => { setEditUser(null); setShowModal(true); }} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {/* Users list */}
      <div className="card">
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            filtered.map(u => {
              const roleCfg = ROLE_LABELS[u.role] || ROLE_LABELS.it_intern;
              const isFieldWorker = u.internship_mode === 'field_work';
              return (
                <div key={u.id} className={`flex items-center gap-3 py-3.5 px-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors group ${!u.is_active ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-gradient-purple-blue flex items-center justify-center text-white font-bold shrink-0">
                    {u.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-navy dark:text-white">{u.full_name}</p>
                      {!u.is_active && <span className="badge badge-red text-[10px]">Inactive</span>}
                      {u.role === 'employee' && <span className="badge badge-orange text-[10px]">Staff</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      @{u.username} · {COMPANY_LABELS[u.company]} · {u.department || '—'}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      Mode: <span className="font-semibold text-gray-600 dark:text-gray-300">{u.internship_mode ? u.internship_mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Full Time'}</span>
                      {u.stipend && u.stipend !== 'N/A' && ` · Salary/Stipend: ${u.stipend}`}
                      {isFieldWorker && u.daily_target && ` · Target: ${u.daily_target} visits/day`}
                      {u.travel_allowance && u.travel_allowance !== 'N/A' && ` · Travel: ${u.travel_allowance}`}
                      {u.custom_position && ` · Title: ${u.custom_position}`}
                    </p>
                    {u.batch_start && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {u.role === 'employee' ? 'Joined:' : 'Batch:'} {format(parseISO(u.batch_start), 'MMM d, yyyy')}
                        {u.batch_end ? ` → ${format(parseISO(u.batch_end), 'MMM d, yyyy')}` : (u.role === 'employee' ? ' (Permanent)' : ' → —')}
                      </p>
                    )}
                  </div>
                  <span className={`badge ${roleCfg.cls} hidden sm:inline-flex`}>{roleCfg.label}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditUser(u); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600">
                      <Edit2 size={14} />
                    </button>
                    {u.is_active && u.role !== 'admin' && ['it_intern','bd_intern','recruitment_intern'].includes(u.role) && (
                      <button
                        onClick={() => handleMarkComplete(u)}
                        title="Mark internship complete & generate certificate"
                        className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600"
                      >
                        <Award size={14} />
                      </button>
                    )}
                    {u.is_active && u.role !== 'admin' && (
                      <button onClick={() => handleDeactivate(u.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600">
                        <UserX size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
