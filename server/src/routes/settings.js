import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const requireAdmin = requireRole('admin');

// GET /api/settings — get settings (all authenticated users can read)
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('settings').select('*');
    const settings = (data || [])[0] || {};
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/settings — update settings (admin only)
router.patch('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;

    // Check if settings record exists
    const { data: existing } = await supabase.from('settings').select('id');

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', 'global')
        .select()
        .single();
      if (error) return res.status(500).json({ success: false, message: error.message });
      return res.json({ success: true, settings: data });
    } else {
      const { data, error } = await supabase
        .from('settings')
        .insert({ id: 'global', ...updates })
        .select()
        .single();
      if (error) return res.status(500).json({ success: false, message: error.message });
      return res.json({ success: true, settings: data });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
