import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { logActivity } from './activity.js';

const router = express.Router();

// Helper: get today's local date string in YYYY-MM-DD format
const today = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// Helper: get current local time string in HH:MM format
const nowTime = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// Helper: get day of week
const getDayOfWeek = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

// POST /api/attendance/checkin
router.post('/checkin', authenticate, async (req, res) => {
  const date = today();
  const time = nowTime();
  const day = getDayOfWeek();
  const { latitude, longitude, address } = req.body;

  // Check if already checked in today
  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('date', date)
    .single();

  if (existing) {
    return res.status(400).json({ success: false, message: 'Already checked in today' });
  }

  // Late if after 10:15
  const status = time > '10:15' ? 'late' : 'present';

  const check_in_location = { latitude, longitude, address };

  const { data, error } = await supabase.from('attendance').insert({
    user_id: req.user.id,
    date,
    check_in: time,
    check_in_time: time,
    check_in_day: day,
    check_in_location: JSON.stringify(check_in_location),
    status,
    breaks: JSON.stringify([]),
    current_break: null,
    marked_by: req.user.id,
  }).select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  await logActivity(req.user.id, 'checkin', `Checked in at ${time}`, { time, location: address });
  res.json({ success: true, attendance: data });
});

// POST /api/attendance/break-start
router.post('/break-start', authenticate, async (req, res) => {
  const date = today();
  const time = nowTime();
  const { latitude, longitude, address } = req.body;

  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('date', date)
    .single();

  if (!existing) {
    return res.status(400).json({ success: false, message: 'You have not checked in yet today' });
  }

  if (existing.current_break) {
    return res.status(400).json({ success: false, message: 'Already on a break' });
  }

  const breakStartObj = {
    break_start: time,
    start_location: { latitude, longitude, address }
  };

  const { data, error } = await supabase
    .from('attendance')
    .update({
      current_break: JSON.stringify(breakStartObj)
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  await logActivity(req.user.id, 'break_start', `Started break at ${time}`, { time });
  res.json({ success: true, attendance: data });
});

// POST /api/attendance/break-end
router.post('/break-end', authenticate, async (req, res) => {
  const date = today();
  const time = nowTime();
  const { latitude, longitude, address } = req.body;

  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('date', date)
    .single();

  if (!existing || !existing.current_break) {
    return res.status(400).json({ success: false, message: 'You are not currently on a break' });
  }

  let currentBreak = {};
  try {
    currentBreak = typeof existing.current_break === 'string' ? JSON.parse(existing.current_break) : existing.current_break;
  } catch (e) {
    currentBreak = {};
  }

  let breaksList = [];
  try {
    breaksList = typeof existing.breaks === 'string' ? JSON.parse(existing.breaks) : (existing.breaks || []);
  } catch (e) {
    breaksList = [];
  }

  const completedBreak = {
    break_start: currentBreak.break_start,
    break_end: time,
    start_location: currentBreak.start_location,
    end_location: { latitude, longitude, address }
  };

  breaksList.push(completedBreak);

  const { data, error } = await supabase
    .from('attendance')
    .update({
      current_break: null,
      breaks: JSON.stringify(breaksList)
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  await logActivity(req.user.id, 'break_end', `Ended break at ${time}`, { time });
  res.json({ success: true, attendance: data });
});

// POST /api/attendance/checkout
router.post('/checkout', authenticate, async (req, res) => {
  const date = today();
  const time = nowTime();
  const day = getDayOfWeek();
  const { latitude, longitude, address } = req.body;

  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('date', date)
    .single();

  if (!existing) {
    return res.status(400).json({ success: false, message: 'You haven\'t checked in today' });
  }

  if (existing.check_out) {
    return res.status(400).json({ success: false, message: 'Already checked out today' });
  }

  const check_out_location = { latitude, longitude, address };

  // If user is currently on break, end the break automatically
  let currentBreak = null;
  let breaksList = [];
  try {
    breaksList = typeof existing.breaks === 'string' ? JSON.parse(existing.breaks) : (existing.breaks || []);
  } catch (e) {
    breaksList = [];
  }

  if (existing.current_break) {
    try {
      currentBreak = typeof existing.current_break === 'string' ? JSON.parse(existing.current_break) : existing.current_break;
      breaksList.push({
        break_start: currentBreak.break_start,
        break_end: time,
        start_location: currentBreak.start_location,
        end_location: check_out_location
      });
    } catch (e) {}
  }

  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out: time,
      check_out_time: time,
      check_out_day: day,
      check_out_location: JSON.stringify(check_out_location),
      current_break: null,
      breaks: JSON.stringify(breaksList)
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  await logActivity(req.user.id, 'checkout', `Checked out at ${time}`, { time, location: address });
  res.json({ success: true, attendance: data });
});

// GET /api/attendance/today — Get today's status for current user
router.get('/today', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('date', today())
    .single();

  res.json({ success: true, attendance: data || null });
});

// GET /api/attendance/my — Get own attendance history
router.get('/my', authenticate, async (req, res) => {
  const { from, to } = req.query;
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('user_id', req.user.id)
    .order('date', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, attendance: data });
});

// GET /api/attendance/all — Admin: all attendance
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  const { date, user_id } = req.query;
  let query = supabase
    .from('attendance')
    .select('*, users(full_name, role, company, internship_mode)')
    .order('date', { ascending: false })
    .limit(200);

  if (date) query = query.eq('date', date);
  if (user_id) query = query.eq('user_id', user_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, attendance: data });
});

// POST /api/attendance/mark — Admin marks attendance for a user manually
router.post('/mark', authenticate, requireAdmin, async (req, res) => {
  const { user_id, date, status, check_in, check_out } = req.body;

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('user_id', user_id)
    .eq('date', date)
    .single();

  let result;
  if (existing) {
    result = await supabase
      .from('attendance')
      .update({ status, check_in, check_out, marked_by: req.user.id })
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('attendance')
      .insert({ user_id, date, status, check_in, check_out, marked_by: req.user.id })
      .select()
      .single();
  }

  if (result.error) return res.status(500).json({ success: false, message: result.error.message });
  res.json({ success: true, attendance: result.data });
});

export default router;
