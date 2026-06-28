import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { logActivity } from './activity.js';
import { createNotification } from './notifications.js';

const router = express.Router();

const today = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// Helper to log actions
const logAction = async (type, desc, user) => {
  try {
    await supabase.from('action_log').insert({
      action_type: type,
      description: desc,
      created_by: user.id
    });
  } catch (e) {
    console.error('Failed to write action log:', e);
  }
};

// GET /api/tasks — Get tasks relevant to user
router.get('/', authenticate, async (req, res) => {
  let query = supabase
    .from('tasks')
    .select('*, assigned_to_user:users!tasks_assigned_to_fkey(id, full_name, role), assigned_by_user:users!tasks_assigned_by_fkey(id, full_name, role)')
    .order('created_at', { ascending: false });

  if (req.user.role !== 'admin') {
    query = query.or(`assigned_to.eq.${req.user.id},assigned_by.eq.${req.user.id}`);
  }

  const { status, project_id } = req.query;
  if (status) query = query.eq('status', status);
  if (project_id) query = query.eq('project_id', project_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, tasks: data });
});

// GET /api/tasks/:id — Get details of a single task
router.get('/:id', authenticate, async (req, res) => {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*, assigned_to_user:users!tasks_assigned_to_fkey(id, full_name, role), assigned_by_user:users!tasks_assigned_by_fkey(id, full_name, role)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ success: false, message: 'Task not found' });
  res.json({ success: true, task });
});

// POST /api/tasks — Create task
router.post('/', authenticate, async (req, res) => {
  const { title, description, assigned_to, priority, due_date, company, project_id, client_name, project_name } = req.body;

  if (!title) return res.status(400).json({ success: false, message: 'Title required' });

  const { data, error } = await supabase.from('tasks').insert({
    title,
    description,
    assigned_to: assigned_to || req.user.id,
    assigned_by: req.user.id,
    priority: priority || 'medium',
    due_date: due_date || null,
    company: company || req.user.company,
    status: 'todo',
    project_id: project_id || null,
    client_name: client_name || null,
    project_name: project_name || null
  }).select('*, assigned_to_user:users!tasks_assigned_to_fkey(id, full_name), assigned_by_user:users!tasks_assigned_by_fkey(id, full_name)').single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAction('task_created', `Task "${title}" created and assigned by ${req.user.full_name}`, req.user);
  await logActivity(req.user.id, 'task_created', `Created task: "${title}"`, { taskId: data.id });

  if (assigned_to && assigned_to !== req.user.id) {
    await createNotification(
      assigned_to,
      'task_assigned',
      'New Task Assigned',
      `You have been assigned a new task: "${title}"`,
      '/tasks'
    );
  }

  res.status(201).json({ success: true, task: data });
});

// PATCH /api/tasks/:id/status — Update task status
router.patch('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['todo', 'in_progress', 'review', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const updates = { status, updated_at: new Date().toISOString() };
  if (status === 'done') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .select('*, assigned_to_user:users!tasks_assigned_to_fkey(id, full_name), assigned_by_user:users!tasks_assigned_by_fkey(id, full_name)')
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAction('task_status_updated', `Task "${data.title}" status changed to ${status}`, req.user);
  await logActivity(req.user.id, 'task_status_change', `Updated task status: "${data.title}" → ${status}`, { taskId: data.id, status });

  if (status === 'done') {
    const { data: users } = await supabase.from('users').select('id, role');
    const admins = (users || []).filter(u => u.role === 'admin');
    for (const adm of admins) {
      await createNotification(
        adm.id,
        'task_done_by_intern',
        'Task Completed by Intern',
        `"${data.title}" was marked Done by ${req.user.full_name}`,
        '/tasks'
      );
    }
  }

  res.json({ success: true, task: data });
});

// PATCH /api/tasks/:id — Update task (admin or creator)
router.patch('/:id', authenticate, async (req, res) => {
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  delete updates.id;
  delete updates.assigned_by;

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .select('*, assigned_to_user:users!tasks_assigned_to_fkey(id, full_name), assigned_by_user:users!tasks_assigned_by_fkey(id, full_name)')
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, task: data });
});

// DELETE /api/tasks/:id — Admin or creator
router.delete('/:id', authenticate, async (req, res) => {
  const { data: oldTask } = await supabase.from('tasks').select('title').eq('id', req.params.id).single();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ success: false, message: error.message });

  if (oldTask) {
    await logAction('task_deleted', `Task "${oldTask.title}" deleted`, req.user);
  }

  res.json({ success: true, message: 'Task deleted' });
});

// ─── Work Logs ───
// POST /api/tasks/:id/work-log — Log work for a task
router.post('/:id/work-log', authenticate, async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ success: false, message: 'Work note is required' });
  if (note.length > 500) return res.status(400).json({ success: false, message: 'Work note cannot exceed 500 characters' });

  const { data, error } = await supabase.from('work_logs').insert({
    task_id: req.params.id,
    user_id: req.user.id,
    note,
    date: today(),
    created_at: new Date().toISOString()
  }).select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  // Update task's updated_at timestamp
  await supabase.from('tasks').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id);
  await logActivity(req.user.id, 'work_note_added', `Added work note: "${note.substring(0, 30)}${note.length > 30 ? '...' : ''}"`, { taskId: req.params.id });

  res.status(201).json({ success: true, log: data });
});

// GET /api/tasks/:id/work-logs — Get work logs for a task
router.get('/:id/work-logs', authenticate, async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('work_logs')
      .select('*')
      .eq('task_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, message: error.message });

    const { data: users } = await supabase.from('users').select('id, full_name, role');
    const withUsers = (logs || []).map(l => {
      const u = users?.find(x => x.id === l.user_id);
      return {
        ...l,
        user: u ? { id: u.id, full_name: u.full_name, role: u.role } : null
      };
    });

    res.json({ success: true, logs: withUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Comments ───
// POST /api/tasks/:id/comments — Add a comment to task
router.post('/:id/comments', authenticate, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

  const { data, error } = await supabase.from('task_comments').insert({
    task_id: req.params.id,
    user_id: req.user.id,
    message,
    created_at: new Date().toISOString()
  }).select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  // Update task's updated_at timestamp
  await supabase.from('tasks').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id);

  res.status(201).json({ success: true, comment: data });
});

// GET /api/tasks/:id/comments — Get comments for a task
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const { data: comments, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ success: false, message: error.message });

    const { data: users } = await supabase.from('users').select('id, full_name, role');
    const withUsers = (comments || []).map(c => {
      const u = users?.find(x => x.id === c.user_id);
      return {
        ...c,
        user: u ? { id: u.id, full_name: u.full_name, role: u.role } : null
      };
    });

    res.json({ success: true, comments: withUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
