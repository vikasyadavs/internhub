import { useState, useEffect } from 'react';
import { Megaphone, Plus, X, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

function AnnouncementCard({ announcement, onDelete, isAdmin }) {
  const isNew = new Date(announcement.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
  return (
    <div className="card hover:shadow-card-hover transition-all animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-purple-blue flex items-center justify-center shrink-0">
            <Megaphone size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-navy">{announcement.title}</h3>
              {isNew && <span className="badge badge-purple text-[10px]">NEW</span>}
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs text-gray-400">
                By {announcement.creator?.full_name || 'Admin'} · {formatDistanceToNow(parseISO(announcement.created_at), { addSuffix: true })}
              </p>
              {announcement.target_role && (
                <span className="badge badge-blue text-[10px]">{announcement.target_role.replace('_', ' ')}</span>
              )}
              {announcement.target_company && (
                <span className="badge badge-purple text-[10px]">{announcement.target_company.replace('_', ' ')}</span>
              )}
            </div>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => onDelete(announcement.id)}
            className="p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all shrink-0"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', content: '', target_role: '', target_company: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return toast.error('Title and content are required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        target_role: form.target_role || null,
        target_company: form.target_company || null,
      };
      const res = await api.post('/announcements', payload);
      onCreated(res.data.announcement);
      toast.success('Announcement posted! 📢');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">Post Announcement</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="Announcement title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Content *</label>
            <textarea className="input resize-none" rows={4} placeholder="What would you like to announce..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Role (optional)</label>
              <select className="input" value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}>
                <option value="">All Roles</option>
                <option value="it_intern">IT Interns</option>
                <option value="bd_intern">BD Interns</option>
                <option value="recruitment_intern">Recruitment Interns</option>
              </select>
            </div>
            <div>
              <label className="label">Target Company (optional)</label>
              <select className="input" value={form.target_company} onChange={e => setForm(f => ({ ...f, target_company: e.target.value }))}>
                <option value="">All Companies</option>
                <option value="site4people">Site4People</option>
                <option value="si_placements">SI Placements</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Megaphone size={15} />
              {saving ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.announcements || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleCreated = (ann) => setAnnouncements(prev => [ann, ...prev]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement deleted');
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
        {isAdmin() && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} />
            Post Announcement
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Megaphone size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-semibold">No announcements yet</p>
          <p className="text-sm text-gray-400 mt-1">Check back later for updates from admin</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onDelete={handleDelete}
              isAdmin={isAdmin()}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
