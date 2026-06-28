import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import supabase from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from './activity.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const { password_hash, ...userData } = user;
    const firstLogin = !!user.first_login;

    await logActivity(user.id, 'login', 'Logged in', { ip: req.ip });

    res.json({
      success: true,
      token,
      user: { ...userData, first_login: firstLogin },
      first_login: firstLogin,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Unable to sign in right now. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', req.user.id)
    .single();

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Current password incorrect' });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await supabase.from('users').update({ password_hash: hash }).eq('id', req.user.id);

  res.json({ success: true, message: 'Password updated successfully' });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await logActivity(req.user.id, 'logout', 'Logged out', {});
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/complete-first-login
router.post('/complete-first-login', authenticate, [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { newPassword } = req.body;

  const password_hash = await bcrypt.hash(newPassword, 12);

  const { data, error } = await supabase
    .from('users')
    .update({ password_hash, first_login: false })
    .eq('id', req.user.id)
    .select('id, username, full_name, role, company, department, is_active, first_login')
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logActivity(req.user.id, 'first_login_complete', 'Completed first-login password setup', {});

  res.json({ success: true, message: 'Password updated. First login complete.', user: data });
});

export default router;
