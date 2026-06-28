import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/documents — Admin: all, User: own
router.get('/', authenticate, async (req, res) => {
  let query = supabase
    .from('documents')
    .select('*, intern:users!documents_user_id_fkey(full_name, role, company, batch_start, batch_end), generated_by_user:users!documents_generated_by_fkey(full_name)')
    .order('generated_at', { ascending: false });

  if (req.user.role !== 'admin') {
    query = query.eq('user_id', req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, documents: data });
});

// POST /api/documents — Admin generates document record
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { user_id, type, metadata } = req.body;
  if (!user_id || !type) return res.status(400).json({ success: false, message: 'user_id and type required' });

  const { data, error } = await supabase.from('documents').insert({
    user_id,
    type,
    metadata: metadata || {},
    generated_by: req.user.id,
    generated_at: new Date().toISOString(),
  }).select('*, intern:users!documents_user_id_fkey(*)').single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, document: data });
});

export default router;
