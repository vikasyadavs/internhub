import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Helper to check and insert a notification
export async function createNotification(userId, type, title, message, link = '') {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Avoid duplicate check for daily alerts
    if (['task_due_today', 'task_due_soon', 'attendance_warning', 'followup_due', 'internship_ending_7d', 'internship_ending_3d'].includes(type)) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type);

      const alreadySentToday = (existing || []).some(n => n.created_at.startsWith(todayStr));
      if (alreadySentToday) return;
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      read: false,
      created_at: new Date().toISOString()
    }).select().single();
  } catch (e) {
    console.error('Error creating notification:', e);
  }
}

// GET /api/notifications — get user's notifications
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, notifications: data || [] });
});

// POST /api/notifications/:id/read — mark as read
router.post('/:id/read', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, notification: data });
});

// POST /api/notifications/read-all — mark all as read
router.post('/read-all', authenticate, async (req, res) => {
  const { data: unread } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('read', false);

  if (unread && unread.length > 0) {
    for (const n of unread) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    }
  }

  res.json({ success: true });
});

// POST /api/notifications/generate — generate alerts dynamically (called on login/dashboard load)
router.post('/generate', authenticate, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: users } = await supabase.from('users').select('*');

    if (req.user.role === 'admin') {
      const admins = (users || []).filter(u => u.role === 'admin');

      // 1. Check interns ending soon
      for (const u of (users || [])) {
        if (u.role === 'admin' || !u.batch_end) continue;
        const daysLeft = Math.ceil((new Date(u.batch_end) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
        
        if (daysLeft === 7) {
          for (const adm of admins) {
            await createNotification(
              adm.id,
              'internship_ending_7d',
              'Internship Ending in 7 Days',
              `${u.full_name}'s internship is ending on ${u.batch_end}.`,
              '/team'
            );
          }
        } else if (daysLeft === 3) {
          for (const adm of admins) {
            await createNotification(
              adm.id,
              'internship_ending_3d',
              'Internship Ending in 3 Days Warning',
              `${u.full_name}'s internship is ending on ${u.batch_end}. Action required.`,
              '/team'
            );
          }
        }
      }

      // 2. Attendance alerts (who checked in by 10:30 AM and who hasn't)
      const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      if (nowStr >= '10:30') {
        const { data: todayAttendance } = await supabase
          .from('attendance')
          .select('*')
          .eq('date', todayStr);

        for (const u of (users || [])) {
          if (u.role === 'admin' || u.internship_mode === 'online') continue;
          const record = (todayAttendance || []).find(a => a.user_id === u.id);
          
          if (!record || !record.check_in) {
            for (const adm of admins) {
              await createNotification(
                adm.id,
                'attendance_warning',
                'Late / Missing Check-In Alert',
                `${u.full_name} has not checked in today as of 10:30 AM.`,
                '/attendance'
              );
            }
          }
        }
      }
    } else {
      // 3. Intern: task deadline warning (due today / due in 24 hours)
      const { data: myTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', req.user.id);

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      for (const t of (myTasks || [])) {
        if (t.status === 'done') continue;
        if (t.due_date === todayStr) {
          await createNotification(
            req.user.id,
            'task_due_today',
            'Task Due Today!',
            `"${t.title}" is due today. Please complete it.`,
            '/tasks'
          );
        } else if (t.due_date === tomorrow) {
          await createNotification(
            req.user.id,
            'task_due_soon',
            'Task Deadline in 24 Hours',
            `"${t.title}" is due tomorrow.`,
            '/tasks'
          );
        }
      }

      // 4. Intern: follow-up reminders due today
      if (req.user.role === 'bd_intern') {
        const { data: followups } = await supabase
          .from('followup_reminders')
          .select('*')
          .eq('user_id', req.user.id);

        for (const f of (followups || [])) {
          if (f.followup_date === todayStr) {
            await createNotification(
              req.user.id,
              'followup_due',
              'Client Follow-up Due Today',
              `Reminder: ${f.reminder_note || 'Client follow-up'}`,
              '/clients'
            );
          }
        }
      }

      // 5. Intern: Interview scheduled reminder (day before)
      if (req.user.role === 'recruitment_intern') {
        const { data: candidates } = await supabase
          .from('recruitment_pipeline')
          .select('*')
          .eq('assigned_to', req.user.id);

        for (const c of (candidates || [])) {
          if (c.interview_date === tomorrow) {
            await createNotification(
              req.user.id,
              'interview_reminder',
              'Interview Scheduled Tomorrow',
              `Interview with candidate ${c.candidate_name} is scheduled for tomorrow.`,
              '/recruitment'
            );
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
