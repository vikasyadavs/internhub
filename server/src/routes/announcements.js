import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/announcements — Role + company filtered
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, creator:users!announcements_created_by_fkey(full_name)')
    .or(`target_role.is.null,target_role.eq.${req.user.role}`)
    .or(`target_company.is.null,target_company.eq.${req.user.company}`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, announcements: data });
});

// POST /api/announcements — Admin only
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { title, content, target_role, target_company } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, message: 'title and content required' });

  const { data, error } = await supabase.from('announcements').insert({
    title,
    content,
    target_role: target_role || null,
    target_company: target_company || null,
    created_by: req.user.id,
  }).select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, announcement: data });
});

// DELETE /api/announcements/:id — Admin
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Announcement deleted' });
});

export default router;
