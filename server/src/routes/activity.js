import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Helper to log activity
export async function logActivity(userId, type, description, metadata = {}) {
  try {
    const timestamp = new Date().toISOString();
    await supabase.from('activity_logs').insert({
      user_id: userId,
      type,
      description,
      metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
      timestamp,
      created_at: timestamp
    }).select().single();
  } catch (e) {
    console.error('Error logging activity:', e);
  }
}

// GET /api/activity/my — own logs
router.get('/my', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, logs: data || [] });
});

// GET /api/activity/:userId — admin: timeline for specific user
router.get('/:userId', authenticate, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('timestamp', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, logs: data || [] });
});

export default router;
export { router as activityRouter };
