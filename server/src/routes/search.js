import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/search?q=query — global search
router.get('/', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ success: true, results: [] });
  }

  const query = q.toLowerCase().trim();

  try {
    const results = [];
    const isAdmin = req.user.role === 'admin';

    // Search users (admin only)
    if (isAdmin) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, role, company, department');
      (users || []).forEach(u => {
        if (u.full_name?.toLowerCase().includes(query)) {
          results.push({
            type: 'intern',
            id: u.id,
            title: u.full_name,
            sub: `${u.role?.replace('_', ' ')} · ${u.company?.replace('_', ' ')}`,
            link: '/team',
          });
        }
      });
    }

    // Search tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, assigned_to');
    (tasks || []).forEach(t => {
      if (req.user.role !== 'admin' && t.assigned_to !== req.user.id) return;
      if (t.title?.toLowerCase().includes(query)) {
        results.push({
          type: 'task',
          id: t.id,
          title: t.title,
          sub: `Task · Status: ${t.status}`,
          link: '/tasks',
        });
      }
    });

    // Search BD clients (admin or bd_intern)
    if (isAdmin || req.user.role === 'bd_intern') {
      const { data: clients } = await supabase
        .from('bd_clients')
        .select('id, company_name, contact_person, stage, managed_by');
      (clients || []).forEach(c => {
        if (req.user.role === 'bd_intern' && c.managed_by !== req.user.id) return;
        const searchStr = `${c.company_name} ${c.contact_person}`.toLowerCase();
        if (searchStr.includes(query)) {
          results.push({
            type: 'client',
            id: c.id,
            title: c.company_name,
            sub: `BD Client · ${c.stage?.replace('_', ' ')}`,
            link: '/clients',
          });
        }
      });
    }

    // Search recruitment candidates (admin or recruitment_intern)
    if (isAdmin || req.user.role === 'recruitment_intern') {
      const { data: candidates } = await supabase
        .from('recruitment_pipeline')
        .select('id, candidate_name, position_applied, stage, managed_by');
      (candidates || []).forEach(c => {
        if (req.user.role === 'recruitment_intern' && c.managed_by !== req.user.id) return;
        if (c.candidate_name?.toLowerCase().includes(query)) {
          results.push({
            type: 'candidate',
            id: c.id,
            title: c.candidate_name,
            sub: `Candidate · ${c.position_applied || 'No position'}`,
            link: '/recruitment',
          });
        }
      });
    }

    // Search projects (admin or it_intern)
    if (isAdmin || req.user.role === 'it_intern') {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, client_name, project_type, status');
      (projects || []).forEach(p => {
        if (p.client_name?.toLowerCase().includes(query)) {
          results.push({
            type: 'project',
            id: p.id,
            title: p.client_name,
            sub: `Project · ${p.project_type} · ${p.status}`,
            link: '/projects',
          });
        }
      });
    }

    res.json({ success: true, results: results.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
