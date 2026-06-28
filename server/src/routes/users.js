import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import supabase from '../config/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { logActivity } from './activity.js';
import { createNotification } from './notifications.js';

const router = express.Router();

const USER_FIELDS = 'id, username, full_name, role, company, department, batch_start, batch_end, is_active, created_at, first_login, stipend, internship_mode, custom_timing, travel_allowance, custom_position, employee_type, daily_target';

// GET /api/users — Admin: all users; else: self
router.get('/', authenticate, async (req, res) => {
  if (req.user.role === 'admin') {
    const { data, error } = await supabase
      .from('users')
      .select(USER_FIELDS)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, users: data });
  } else {
    const { data, error } = await supabase
      .from('users')
      .select(USER_FIELDS)
      .eq('id', req.user.id)
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, users: [data] });
  }
});

// GET /api/users/team — All active interns visible (for task assignment etc.)
router.get('/team', authenticate, async (req, res) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, role, company, department, first_login, stipend, internship_mode, custom_timing, travel_allowance, custom_position, batch_start, batch_end, employee_type, daily_target')
      .eq('is_active', true)
      .neq('role', 'admin');
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, users: data });
});

// POST /api/users — Admin creates user
router.post('/', authenticate, requireAdmin, [
  body('username').trim().notEmpty().toLowerCase(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().notEmpty(),
  body('role').isIn(['it_intern', 'bd_intern', 'recruitment_intern', 'admin', 'employee']),
  body('company').isIn(['si_placements', 'site4people']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    username, password, full_name, role, company, department, batch_start, batch_end,
    stipend, internship_mode, custom_timing, travel_allowance, custom_position,
    employee_type, daily_target
  } = req.body;

  // Check username unique
  const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
  if (existing) return res.status(400).json({ success: false, message: 'Username already taken' });

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase.from('users').insert({
    username,
    password_hash,
    full_name,
    role,
    company,
    department: department || null,
    batch_start: batch_start || null,
    batch_end: batch_end || null,
    stipend: stipend || 'N/A',
    internship_mode: internship_mode || 'full_time',
    custom_timing: custom_timing || '10:00 AM – 7:00 PM, Mon–Sat',
    travel_allowance: travel_allowance || 'N/A',
    custom_position: custom_position || null,
    employee_type: employee_type || null,
    daily_target: daily_target ? parseInt(daily_target) : null,
    is_active: true,
    first_login: role !== 'admin',
  }).select(USER_FIELDS).single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logActivity(req.user.id, 'user_created', `Created user account for "${full_name}" (${role})`, { newUserId: data.id });

  res.status(201).json({ success: true, user: data });
});

// PATCH /api/users/:id — Admin updates user
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const { password, ...fields } = req.body;
  const updates = { ...fields };

  if (password) {
    updates.password_hash = await bcrypt.hash(password, 12);
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.params.id)
    .select(USER_FIELDS)
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logActivity(req.user.id, 'user_updated', `Updated user account "${data.full_name}"`, { updatedUserId: data.id });

  // If internship marked complete (e.g. by setting is_active to false or complete)
  if (updates.is_active === false) {
    await createNotification(
      data.id,
      'certificate_ready',
      'Certificate Ready to Download',
      'Congratulations! Your internship has been marked complete and your certificate is ready.',
      '/documents'
    );
  }

  res.json({ success: true, user: data });
});

// DELETE /api/users/:id — Admin deactivates user
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'User deactivated' });
});

export default router;
