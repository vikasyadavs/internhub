import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const today = () => new Date().toISOString().split('T')[0];

// GET /api/reports/my
router.get('/my', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', req.user.id)
    .order('date', { ascending: false })
    .limit(30);

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, reports: data });
});

// GET /api/reports/today
router.get('/today', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('date', today())
    .single();

  res.json({ success: true, report: data || null });
});

// POST /api/reports — Submit daily report
router.post('/', authenticate, async (req, res) => {
  const { work_done, plan_tomorrow, hours_worked } = req.body;
  const date = today();

  if (!work_done) return res.status(400).json({ success: false, message: 'work_done is required' });

  // Upsert: if already submitted today, update it
  const { data: existing } = await supabase
    .from('daily_reports')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('date', date)
    .single();

  let result;
  if (existing) {
    result = await supabase
      .from('daily_reports')
      .update({ work_done, plan_tomorrow, hours_worked, submitted_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('daily_reports')
      .insert({ user_id: req.user.id, date, work_done, plan_tomorrow, hours_worked, submitted_at: new Date().toISOString() })
      .select()
      .single();
  }

  if (result.error) return res.status(500).json({ success: false, message: result.error.message });

  // Import locally or at top
  const { logActivity } = await import('./activity.js');
  await logActivity(req.user.id, 'report_submitted', `Submitted daily report for ${date}`, { date });

  res.json({ success: true, report: result.data });
});

// GET /api/reports/all — Admin: all reports
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  const { date, user_id } = req.query;
  let query = supabase
    .from('daily_reports')
    .select('*, users(full_name, role, company)')
    .order('submitted_at', { ascending: false })
    .limit(100);

  if (date) query = query.eq('date', date);
  if (user_id) query = query.eq('user_id', user_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, reports: data });
});

export default router;
