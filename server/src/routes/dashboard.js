import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

const today = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const requireAdmin = requireRole('admin');

// GET /api/dashboard/stats — Role-aware aggregated stats
router.get('/stats', authenticate, async (req, res) => {
  const role = req.user.role;
  const userId = req.user.id;
  const stats = {};

  try {
    if (role === 'admin') {
      const { count: totalUsers } = await supabase
        .from('users').select('id', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'admin');

      const { count: presentToday } = await supabase
        .from('attendance').select('id', { count: 'exact', head: true }).eq('date', today()).in('status', ['present', 'late']);

      const { count: pendingTasks } = await supabase
        .from('tasks').select('id', { count: 'exact', head: true }).in('status', ['todo', 'in_progress']);

      const { data: recruitCounts } = await supabase
        .from('recruitment_pipeline')
        .select('stage')
        .neq('stage', 'rejected');

      const { data: bdCounts } = await supabase
        .from('bd_clients')
        .select('stage, deal_value');

      const dealsWon = bdCounts?.filter(c => c.stage === 'deal_cracked' || c.stage === 'deal_closed' || c.stage === 'payment_received' || c.stage === 'work_assigned').length || 0;
      const totalRevenue = bdCounts?.filter(c => ['deal_closed', 'payment_received', 'work_assigned'].includes(c.stage)).reduce((s, c) => s + (parseFloat(c.deal_value) || 0), 0) || 0;

      stats.totalUsers = totalUsers || 0;
      stats.presentToday = presentToday || 0;
      stats.pendingTasks = pendingTasks || 0;
      stats.recruitmentPipeline = recruitCounts?.length || 0;
      stats.dealsWon = dealsWon;
      stats.totalRevenue = totalRevenue;
    }

    const { data: todayAttendance } = await supabase
      .from('attendance').select('*').eq('user_id', userId).eq('date', today()).single();

    const { data: todayReport } = await supabase
      .from('daily_reports').select('id').eq('user_id', userId).eq('date', today()).single();

    const { count: myTasks } = await supabase
      .from('tasks').select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId).in('status', ['todo', 'in_progress']);

    stats.todayAttendance = todayAttendance || null;
    stats.todayReportSubmitted = !!todayReport;
    stats.myPendingTasks = myTasks || 0;

    if (role === 'recruitment_intern') {
      const { count: myPipeline } = await supabase
        .from('recruitment_pipeline').select('id', { count: 'exact', head: true })
        .eq('managed_by', userId).not('stage', 'in', '("rejected","selected")');
      stats.myActiveCandidates = myPipeline || 0;
    }

    if (role === 'bd_intern') {
      const { count: myClients } = await supabase
        .from('bd_clients').select('id', { count: 'exact', head: true })
        .eq('managed_by', userId).not('stage', 'in', '("work_assigned","lost")');
      const { count: myInvoices } = await supabase
        .from('invoices').select('id', { count: 'exact', head: true })
        .eq('created_by', userId).eq('status', 'pending');
      stats.myActiveClients = myClients || 0;
      stats.myPendingInvoices = myInvoices || 0;
    }

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/admin-kpis — Admin specific metrics
router.get('/admin-kpis', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: allUsers } = await supabase.from('users').select('*').eq('is_active', true);
    const { data: allCerts } = await supabase.from('documents').select('id').eq('document_type', 'certificate');

    const itInterns = allUsers?.filter(u => u.role === 'it_intern').length || 0;
    const bdInterns = allUsers?.filter(u => u.role === 'bd_intern').length || 0;
    const recruitmentInterns = allUsers?.filter(u => u.role === 'recruitment_intern').length || 0;
    const totalEmployees = allUsers?.filter(u => u.role === 'employee').length || 0;

    // Completing this week (batch_end in next 7 days) and in 14 days
    const now = new Date();
    let completingThisWeek = 0;
    let completingIn14Days = 0;

    if (allUsers) {
      allUsers.forEach(u => {
        if (u.batch_end) {
          const endDate = new Date(u.batch_end);
          const diffTime = endDate - now;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 7) {
            completingThisWeek++;
          }
          if (diffDays >= 0 && diffDays <= 14) {
            completingIn14Days++;
          }
        }
      });
    }

    res.json({
      success: true,
      itInterns,
      bdInterns,
      recruitmentInterns,
      totalEmployees,
      completingThisWeek,
      completingIn14Days,
      certsReady: allCerts?.length || 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/today-activity — Today's activities summary
router.get('/today-activity', authenticate, requireAdmin, async (req, res) => {
  try {
    const todayStr = today();

    // 1. Check-ins
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', todayStr);

    const { data: users } = await supabase.from('users').select('id, full_name, role');

    const checkIns = (attendance || []).map(a => {
      const u = users?.find(x => x.id === a.user_id);
      return {
        user_id: a.user_id,
        full_name: u ? u.full_name : 'Unknown Intern',
        role: u ? u.role : '',
        check_in: a.check_in,
        status: a.status
      };
    });

    // 2. Tasks completed today
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'done');
    const tasksCompletedToday = tasks?.filter(t => t.updated_at && t.updated_at.startsWith(todayStr)).length || 0;

    // 3. New leads added today
    const { data: leads } = await supabase
      .from('bd_clients')
      .select('id, created_at');
    const newLeadsToday = leads?.filter(l => l.created_at && l.created_at.startsWith(todayStr)).length || 0;

    // 4. Candidates called today
    const { data: recruits } = await supabase
      .from('recruitment_pipeline')
      .select('id, updated_at, stage');
    const candidatesCalledToday = recruits?.filter(r => r.updated_at && r.updated_at.startsWith(todayStr) && r.stage === 'called').length || 0;

    res.json({
      success: true,
      checkIns,
      tasksCompletedToday,
      newLeadsToday,
      candidatesCalledToday
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/upcoming-endings
router.get('/upcoming-endings', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: users } = await supabase.from('users').select('*').eq('is_active', true);
    const now = new Date();

    const endings = (users || []).filter(u => {
      if (!u.batch_end) return false;
      const endDate = new Date(u.batch_end);
      const diffTime = endDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    });

    res.json({
      success: true,
      interns: endings.sort((a, b) => new Date(a.batch_end) - new Date(b.batch_end))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/recent-actions
router.get('/recent-actions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: actions } = await supabase
      .from('action_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({
      success: true,
      actions: actions || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/recent-activity (Shared)
router.get('/recent-activity', authenticate, async (req, res) => {
  const activities = [];

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, updated_at')
    .or(`assigned_to.eq.${req.user.id},assigned_by.eq.${req.user.id}`)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (tasks) {
    tasks.forEach(t => activities.push({ type: 'task', ...t, time: t.updated_at }));
  }

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (announcements) {
    announcements.forEach(a => activities.push({ type: 'announcement', ...a, time: a.created_at }));
  }

  activities.sort((a, b) => new Date(b.time) - new Date(a.time));

  res.json({ success: true, activities: activities.slice(0, 8) });
});

export default router;
