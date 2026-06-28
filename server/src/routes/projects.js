import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const requireAdmin = requireRole('admin');

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

// GET /api/projects — List all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, message: error.message });

    const { data: users } = await supabase.from('users').select('id, full_name, role');

    // Merge users profiles with assigned_interns
    const withUsers = (projects || []).map(p => {
      let internIds = [];
      try {
        if (typeof p.assigned_interns === 'string') {
          internIds = JSON.parse(p.assigned_interns);
        } else if (Array.isArray(p.assigned_interns)) {
          internIds = p.assigned_interns;
        }
      } catch (e) {
        internIds = [];
      }

      const interns = (internIds || []).map(id => {
        const u = users?.find(x => x.id === id);
        return u ? { id: u.id, full_name: u.full_name, role: u.role } : null;
      }).filter(Boolean);

      return {
        ...p,
        assigned_interns: internIds,
        assigned_interns_profiles: interns
      };
    });

    if (req.user.role === 'admin') {
      return res.json({ success: true, projects: withUsers });
    } else {
      // Filter for IT intern's assigned projects
      const filtered = withUsers.filter(p => p.assigned_interns.includes(req.user.id));
      return res.json({ success: true, projects: filtered });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects — Create a project (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { client_name, project_type, description, assigned_interns, start_date, target_date, status, invoiced_amount, payment_status } = req.body;

  if (!client_name) return res.status(400).json({ success: false, message: 'Client name required' });

  const { data, error } = await supabase.from('projects').insert({
    client_name,
    project_type: project_type || 'website',
    description: description || '',
    assigned_interns: Array.isArray(assigned_interns) ? JSON.stringify(assigned_interns) : '[]',
    start_date: start_date || new Date().toISOString().split('T')[0],
    target_date: target_date || null,
    status: status || 'planning',
    invoiced_amount: parseFloat(invoiced_amount) || 0,
    payment_status: payment_status || 'pending',
    created_at: new Date().toISOString()
  }).select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAction('project_created', `IT Project for "${client_name}" created by ${req.user.full_name}`, req.user);

  res.status(201).json({ success: true, project: data });
});

// GET /api/projects/:id — Single project detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ success: false, message: 'Project not found' });

    let internIds = [];
    try {
      if (typeof project.assigned_interns === 'string') {
        internIds = JSON.parse(project.assigned_interns);
      } else if (Array.isArray(project.assigned_interns)) {
        internIds = project.assigned_interns;
      }
    } catch (e) {
      internIds = [];
    }

    const { data: users } = await supabase.from('users').select('id, full_name, role');
    const interns = (internIds || []).map(id => {
      const u = users?.find(x => x.id === id);
      return u ? { id: u.id, full_name: u.full_name, role: u.role } : null;
    }).filter(Boolean);

    project.assigned_interns = internIds;
    project.assigned_interns_profiles = interns;

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/projects/:id — Update project (Admin only)
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const updates = { ...req.body };
  delete updates.id;
  delete updates.created_at;

  if (updates.assigned_interns && Array.isArray(updates.assigned_interns)) {
    updates.assigned_interns = JSON.stringify(updates.assigned_interns);
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAction('project_updated', `IT Project for "${data.client_name}" updated by ${req.user.full_name}`, req.user);

  res.json({ success: true, project: data });
});

// DELETE /api/projects/:id — Delete project (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { data: oldProj } = await supabase.from('projects').select('client_name').eq('id', req.params.id).single();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ success: false, message: error.message });

  if (oldProj) {
    await logAction('project_deleted', `IT Project for "${oldProj.client_name}" deleted`, req.user);
  }

  res.json({ success: true, message: 'Project deleted' });
});

export default router;
