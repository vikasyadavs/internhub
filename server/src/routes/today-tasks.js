import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const today = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

// GET /api/today-tasks — Aggregates intern's daily checklist
router.get('/', authenticate, async (req, res) => {
  try {
    const todayStr = today();
    const userId = req.user.id;
    const items = [];

    // 1. Tasks due today
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, due_date')
      .eq('user_id', userId);

    (tasks || []).forEach(t => {
      if (t.due_date === todayStr && t.status !== 'done') {
        items.push({
          id: `task_${t.id}`,
          type: 'task',
          label: `Task due: ${t.title}`,
          ref_id: t.id,
          done: false
        });
      }
    });

    // 2. Follow-ups due today
    const { data: clients } = await supabase
      .from('bd_clients')
      .select('id, client_name, next_followup')
      .eq('managed_by', userId);

    (clients || []).forEach(c => {
      if (c.next_followup === todayStr) {
        items.push({
          id: `followup_${c.id}`,
          type: 'followup',
          label: `Follow up client: ${c.client_name}`,
          ref_id: c.id,
          done: false
        });
      }
    });

    // 3. Interviews scheduled today
    const { data: candidates } = await supabase
      .from('recruitment_pipeline')
      .select('id, candidate_name, interview_date')
      .eq('assigned_to', userId);

    (candidates || []).forEach(c => {
      if (c.interview_date === todayStr) {
        items.push({
          id: `interview_${c.id}`,
          type: 'interview',
          label: `Conduct Interview: ${c.candidate_name}`,
          ref_id: c.id,
          done: false
        });
      }
    });

    // Restore completion state from today_tasks table
    const { data: savedTasks } = await supabase
      .from('today_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayStr);

    const doneSet = new Set((savedTasks || []).filter(s => s.done).map(s => s.item_id));

    const checklist = items.map(item => ({
      ...item,
      done: doneSet.has(item.id)
    }));

    res.json({ success: true, tasks: checklist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/today-tasks/check/:itemId — toggle checklist item
router.post('/check/:itemId', authenticate, async (req, res) => {
  const { done } = req.body;
  const todayStr = today();
  const userId = req.user.id;

  try {
    const { data: existing } = await supabase
      .from('today_tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', req.params.itemId)
      .eq('date', todayStr)
      .single();

    if (existing) {
      await supabase
        .from('today_tasks')
        .update({ done })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('today_tasks')
        .insert({
          user_id: userId,
          item_id: req.params.itemId,
          date: todayStr,
          done,
          created_at: new Date().toISOString()
        });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
