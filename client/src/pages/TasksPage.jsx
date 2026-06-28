import { useState, useEffect } from 'react';
import { Plus, X, ChevronRight, AlertCircle, Clock, CheckCircle2, RotateCcw, Star, FileText, Send, MessageSquare, PlusCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, differenceInDays, parseISO } from 'date-fns';
import EmptyState from '../components/EmptyState';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-t-gray-400', dot: 'bg-gray-400', icon: AlertCircle },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-blue-500', dot: 'bg-blue-500', icon: RotateCcw },
  { id: 'review', label: 'Review', color: 'border-t-yellow-500', dot: 'bg-yellow-500', icon: Star },
  { id: 'done', label: 'Done', color: 'border-t-green-500', dot: 'bg-green-500', icon: CheckCircle2 },
];

const PRIORITY_CFG = {
  low: { cls: 'badge-gray', label: 'Low' },
  medium: { cls: 'badge-blue', label: 'Medium' },
  high: { cls: 'badge-yellow', label: 'High' },
  urgent: { cls: 'badge-red', label: 'Urgent' },
};

function LogWorkModal({ task, onClose, onLogged }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return toast.error('Please write a summary note.');
    if (note.length > 500) return toast.error('Note must be less than 500 characters.');

    setSaving(true);
    try {
      await api.post(`/tasks/${task.id}/work-log`, { note });
      toast.success('Work logged successfully! 📝');
      if (onLogged) onLogged();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save log');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-base">Log Today's Work</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Task: <span className="font-semibold text-gray-700">{task.title}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Daily Log Note (Max 500 chars) *</label>
            <textarea
              className="input resize-none"
              rows={4}
              maxLength={500}
              placeholder="What specific tasks did you work on today? Any outcomes or roadblocks?"
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] text-gray-400 text-right mt-1">{note.length}/500 chars</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Submit Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailDrawer({ task, onClose, onStatusChange }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    fetchLogsAndComments();
  }, [task.id]);

  const fetchLogsAndComments = async () => {
    try {
      const [logsRes, commsRes] = await Promise.all([
        api.get(`/tasks/${task.id}/work-logs`),
        api.get(`/tasks/${task.id}/comments`)
      ]);
      setLogs(logsRes.data.logs || []);
      setComments(commsRes.data.comments || []);
    } catch { /* ignored */ }
    finally { setLoading(false); }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.post(`/tasks/${task.id}/comments`, { message: newComment });
      setComments(prev => [...prev, {
        ...res.data.comment,
        user: { id: user.id, full_name: user.full_name, role: user.role }
      }]);
      setNewComment('');
    } catch { toast.error('Failed to post comment'); }
    finally { setPostingComment(false); }
  };

  const daysLeft = task.due_date ? differenceInDays(parseISO(task.due_date), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== 'done';

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-slide-left border-l border-gray-100">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Task Detail Scope</span>
          <h3 className="font-bold text-navy text-base line-clamp-1 mt-0.5">{task.title}</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Info panel */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          {task.client_name && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Client / Project</span>
              <span className="font-semibold text-gray-700 text-right">{task.client_name} {task.project_name ? `(${task.project_name})` : ''}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Deadline</span>
            <span className="font-semibold text-gray-700">
              {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : 'No Date Set'}
            </span>
          </div>
          {task.due_date && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Status Timeframe</span>
              {isOverdue ? (
                <span className="badge badge-red font-semibold">Overdue by {Math.abs(daysLeft)} days</span>
              ) : daysLeft !== null && task.status !== 'done' ? (
                <span className={`badge ${daysLeft <= 2 ? 'badge-orange' : 'badge-green'} font-semibold`}>
                  {daysLeft} days remaining
                </span>
              ) : (
                <span className="badge badge-green font-semibold">On Track</span>
              )}
            </div>
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Set Status</span>
            <select
              value={task.status}
              onChange={e => onStatusChange(task.id, e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600 focus:outline-none bg-white cursor-pointer"
            >
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Task description */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Description</h4>
          <p className="text-xs text-gray-600 bg-slate-50/50 p-3 rounded-xl border border-dashed border-gray-200 whitespace-pre-line leading-relaxed">
            {task.description || 'No detailed instructions provided.'}
          </p>
        </div>

        {/* Daily work logs history */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <FileText size={13} className="text-blue-500" />
            Daily Work Logs ({logs.length})
          </h4>
          {loading ? (
            <div className="space-y-2">
              <div className="skeleton h-12" />
              <div className="skeleton h-12" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-400 italic bg-gray-50/30 p-4 rounded-xl text-center">No daily logs written yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={log.id || index} className="work-log-card">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-gray-800">{log.user?.full_name || 'Developer'}</span>
                    <span className="text-[10px] text-gray-400">{log.date ? format(parseISO(log.date), 'MMM d, yyyy') : ''}</span>
                  </div>
                  <p className="text-xs text-gray-600 italic leading-relaxed">"{log.note}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <MessageSquare size={13} className="text-purple-500" />
            Intern ↔ Admin Thread ({comments.length})
          </h4>
          {loading ? (
            <div className="space-y-2">
              <div className="skeleton h-12" />
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto mb-3 bg-slate-50/50 p-3 rounded-2xl border border-gray-100">
              {comments.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">No comments posted yet.</p>
              )}
              {comments.map((c, i) => (
                <div key={c.id || i} className={`flex flex-col ${c.user_id === user.id ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                    c.user_id === user.id ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'
                  }`}>
                    {c.user_id !== user.id && (
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">{c.user?.full_name}</p>
                    )}
                    <p className="leading-normal">{c.message}</p>
                    <p className={`text-[8px] mt-1 text-right ${c.user_id === user.id ? 'text-white/60' : 'text-gray-400'}`}>
                      {c.created_at ? format(parseISO(c.created_at), 'h:mm a') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              className="input py-2 text-xs"
              placeholder="Ask admin or leave comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={postingComment || !newComment.trim()}
              className="bg-purple-600 hover:bg-black text-white px-3 rounded-xl transition-all"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onStatusChange, onDelete, onLogWork, onViewDetails }) {
  const p = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const { isAdmin } = useAuth();

  return (
    <div
      onClick={() => onViewDetails(task)}
      className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          {task.client_name && (
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5 truncate max-w-[180px]">
              {task.client_name} {task.project_name ? `(${task.project_name})` : ''}
            </p>
          )}
          <p className="text-sm font-semibold text-navy leading-tight">{task.title}</p>
        </div>
        {(isAdmin() || task.assigned_by === task.user_id) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-2.5 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
        <span className={`badge ${p.cls}`}>{p.label}</span>
        {isOverdue && <span className="badge badge-red">Overdue</span>}
        {task.due_date && (
          <span className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
            <Clock size={11} className="text-gray-400" />
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogWork(task);
          }}
          className="text-xs text-blue-600 hover:text-black font-semibold flex items-center gap-1 border border-blue-100 bg-blue-50/50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
        >
          <FileText size={12} />
          Log Work
        </button>

        <select
          value={task.status}
          onChange={e => {
            e.stopPropagation();
            onStatusChange(task.id, e.target.value);
          }}
          onClick={e => e.stopPropagation()}
          className="text-[11px] border border-gray-200 rounded-lg px-2 py-0.5 text-gray-600 focus:outline-none bg-white cursor-pointer font-medium"
        >
          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function CreateTaskModal({ onClose, onCreated, users }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: user?.id || '',
    priority: 'medium', due_date: '', company: user?.company || 'site4people',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Title required');
    setSaving(true);
    try {
      const res = await api.post('/tasks', form);
      onCreated(res.data.task);
      toast.success('Task created!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">New Task</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="Task title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="What needs to be done..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assign To</label>
              <select className="input" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
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
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [logWorkTask, setLogWorkTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [view, setView] = useState('kanban');
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.tasks || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/team');
      const all = [{ id: user.id, full_name: user.full_name }, ...(res.data.users || []).filter(u => u.id !== user.id)];
      setUsers(all);
    } catch { /* silent */ }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: res.data.task.status } : t));
      if (detailTask && detailTask.id === taskId) {
        setDetailTask(prev => ({ ...prev, status: res.data.task.status }));
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleCreated = (task) => setTasks(prev => [task, ...prev]);

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 animate-slide-up relative">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy">Task Board</h2>
          <p className="text-xs text-gray-500">{tasks.length} total tasks · {tasksByStatus['in_progress']?.length || 0} in progress</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            {['kanban', 'list'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3.5 py-2 text-xs font-semibold capitalize transition-colors ${view === v ? 'bg-navy text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3">
            <Plus size={14} />
            New Task
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="card">
          <EmptyState type="tasks" />
        </div>
      ) : (
        <>
          {/* Kanban View */}
          {view === 'kanban' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
              {COLUMNS.map(col => (
                <div key={col.id} className={`kanban-col border-t-4 ${col.color}`}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <col.icon size={14} className="text-gray-500" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{col.label}</span>
                    <span className="ml-auto bg-white text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full border">
                      {tasksByStatus[col.id]?.length || 0}
                    </span>
                  </div>
                  {tasksByStatus[col.id]?.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <p className="text-[11px] font-medium">No tasks here</p>
                    </div>
                  )}
                  <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                    {tasksByStatus[col.id]?.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onLogWork={(t) => setLogWorkTask(t)}
                        onViewDetails={(t) => setDetailTask(t)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {view === 'list' && (
            <div className="card">
              <div className="divide-y divide-gray-100">
            {tasks.map(task => {
              const p = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium;
              const col = COLUMNS.find(c => c.id === task.status);
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
              return (
                <div
                  key={task.id}
                  onClick={() => setDetailTask(task)}
                  className="flex items-center gap-3 py-3.5 hover:bg-gray-50 px-3 rounded-xl transition-colors group cursor-pointer"
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${col?.dot || 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{task.title}</p>
                    <p className="text-xs text-gray-400">
                      {task.client_name ? `${task.client_name} · ` : ''}Assigned to: {task.assigned_to_user?.full_name} · {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No deadline'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <span className={`badge ${p.cls} hidden sm:inline-flex`}>{p.label}</span>
                    {isOverdue && <span className="badge badge-red">Overdue</span>}
                    <button
                      onClick={() => setLogWorkTask(task)}
                      className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-2 py-1 rounded-lg transition-colors border border-blue-100 flex items-center gap-1"
                    >
                      <FileText size={12} />
                      Log Work
                    </button>
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none bg-white cursor-pointer"
                    >
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  )}

      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={handleCreated} users={users} />
      )}

      {logWorkTask && (
        <LogWorkModal
          task={logWorkTask}
          onClose={() => setLogWorkTask(null)}
          onLogged={fetchTasks}
        />
      )}

      {detailTask && (
        <TaskDetailDrawer
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
