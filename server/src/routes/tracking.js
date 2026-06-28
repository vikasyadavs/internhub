import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const today = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// POST /api/tracking/ping — Employee sends live location update
router.post('/ping', authenticate, async (req, res) => {
  const { latitude, longitude, address, accuracy } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, message: 'latitude and longitude required' });
  }

  const timestamp = new Date().toISOString();

  // Upsert a live_tracking record: one row per user, constantly updated
  const { data: existing } = await supabase
    .from('live_tracking')
    .select('id')
    .eq('user_id', req.user.id)
    .single();

  let result;
  if (existing) {
    result = await supabase
      .from('live_tracking')
      .update({ latitude, longitude, address, accuracy, timestamp, date: today() })
      .eq('user_id', req.user.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('live_tracking')
      .insert({ user_id: req.user.id, latitude, longitude, address, accuracy, timestamp, date: today() })
      .select()
      .single();
  }

  if (result.error) return res.status(500).json({ success: false, message: result.error.message });
  res.json({ success: true, tracking: result.data });
});

// DELETE /api/tracking/ping — Employee goes offline (logout / checkout)
router.delete('/ping', authenticate, async (req, res) => {
  await supabase.from('live_tracking').delete().eq('user_id', req.user.id);
  res.json({ success: true });
});

// GET /api/tracking/live — Admin: get all currently live employees
router.get('/live', authenticate, requireAdmin, async (req, res) => {
  try {
    // Only return records updated in the last 10 minutes (active/online users)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: tracks } = await supabase
      .from('live_tracking')
      .select('*');

    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, role, company, internship_mode, employee_type');

    const activeTracks = (tracks || [])
      .filter(t => t.timestamp >= tenMinAgo)
      .map(t => {
        const u = users?.find(u => u.id === t.user_id);
        return {
          ...t,
          user: u || null,
        };
      })
      .filter(t => t.user);

    res.json({ success: true, tracks: activeTracks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tracking/history/:userId — Admin: get location history for a user today
router.get('/history/:userId', authenticate, requireAdmin, async (req, res) => {
  const { data } = await supabase
    .from('attendance')
    .select('check_in, check_out, check_in_location, check_out_location, breaks, date, status')
    .eq('user_id', req.params.userId)
    .order('date', { ascending: false })
    .limit(30);

  res.json({ success: true, history: data || [] });
});

export default router;
