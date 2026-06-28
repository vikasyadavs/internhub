import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const requireAdmin = requireRole('admin');

// Helper: Calculate login streak from today going backwards
function getLoginStreak(attendanceLogs, userId) {
  const userLogs = attendanceLogs
    .filter(a => a.user_id === userId && a.check_in)
    .map(a => a.date)
    .sort((a, b) => new Date(b) - new Date(a)); // sorted descending (newest first)

  if (userLogs.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  
  // If user hasn't checked in today yet, start check from yesterday
  const todayStr = currentDate.toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let checkStr = userLogs.includes(todayStr) ? todayStr : yesterdayStr;
  
  while (true) {
    if (userLogs.includes(checkStr)) {
      streak++;
      // Move to previous day
      const d = new Date(checkStr);
      d.setDate(d.getDate() - 1);
      checkStr = d.toISOString().split('T')[0];
    } else {
      break;
    }
  }
  return streak;
}

// GET /api/analytics/intern-performance
router.get('/intern-performance', authenticate, requireAdmin, async (req, res) => {
  const { user_id, from, to } = req.query;
  if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' });

  try {
    const { data: users } = await supabase.from('users').select('*');
    const user = (users || []).find(u => u.id === user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Fetch all logs
    const { data: allTasks } = await supabase.from('tasks').select('*');
    const { data: allAttendance } = await supabase.from('attendance').select('*');
    const { data: allReports } = await supabase.from('daily_reports').select('*');
    const { data: allWorkLogs } = await supabase.from('work_logs').select('*');
    
    // Filter records in range
    const filterByRange = (items, dateField = 'created_at') => {
      return (items || []).filter(item => {
        const d = item[dateField]?.split('T')[0] || item[dateField];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    };

    const userTasks = (allTasks || []).filter(t => t.user_id === user_id);
    const userAttendance = filterByRange((allAttendance || []).filter(a => a.user_id === user_id), 'date');
    const userReports = filterByRange((allReports || []).filter(r => r.user_id === user_id), 'date');
    const userWorkLogs = filterByRange((allWorkLogs || []).filter(wl => wl.user_id === user_id), 'created_at');

    const tasksCompleted = userTasks.filter(t => t.status === 'done');
    
    // Calculate average completion time
    let totalDays = 0;
    let completedCount = 0;
    tasksCompleted.forEach(t => {
      if (t.created_at && t.updated_at) {
        const diff = new Date(t.updated_at) - new Date(t.created_at);
        totalDays += diff / (1000 * 60 * 60 * 24);
        completedCount++;
      }
    });
    const avgCompletionDays = completedCount > 0 ? (totalDays / completedCount).toFixed(1) : 'N/A';

    // Base performance object
    const performance = {
      user_id: user.id,
      full_name: user.full_name,
      role: user.role,
      company: user.company,
      tasksAssigned: userTasks.length,
      tasksCompleted: tasksCompleted.length,
      avgCompletionDays,
      workNotesCount: userWorkLogs.length,
      dailyReportsCount: userReports.length,
      attendanceDays: userAttendance.length,
      lateDays: userAttendance.filter(a => a.status === 'late').length,
      loginStreak: getLoginStreak(allAttendance || [], user_id)
    };

    // Add BD metrics
    if (user.role === 'bd_intern') {
      const { data: allClients } = await supabase.from('bd_clients').select('*');
      const { data: allCallLogs } = await supabase.from('call_logs').select('*');

      const userClients = filterByRange((allClients || []).filter(c => c.managed_by === user_id), 'created_at');
      const userCalls = filterByRange((allCallLogs || []).filter(cl => (cl.intern_id || cl.user_id) === user_id), 'timestamp');

      performance.bd = {
        callsMade: userCalls.length,
        leadsAdded: userClients.length,
        dealsClosed: userClients.filter(c => c.stage === 'deal_closed').length,
        revenue: userClients
          .filter(c => c.stage === 'deal_closed')
          .reduce((sum, c) => sum + (parseFloat(c.agreed_amount) || 0), 0)
      };
    }

    // Add Recruitment metrics
    if (user.role === 'recruitment_intern') {
      const { data: allCandidates } = await supabase.from('recruitment_pipeline').select('*');
      const userCandidates = filterByRange((allCandidates || []).filter(c => c.assigned_to === user_id), 'created_at');

      performance.recruitment = {
        candidatesAdded: userCandidates.length,
        interviewed: userCandidates.filter(c => c.stage === 'interview_scheduled').length,
        joined: userCandidates.filter(c => c.stage === 'joined').length
      };
    }

    res.json({ success: true, performance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/weekly-summary
router.get('/weekly-summary', authenticate, requireAdmin, async (req, res) => {
  const { from, to, company, role } = req.query;

  try {
    const { data: users } = await supabase.from('users').select('*');
    const { data: allTasks } = await supabase.from('tasks').select('*');
    const { data: allAttendance } = await supabase.from('attendance').select('*');
    const { data: allWorkLogs } = await supabase.from('work_logs').select('*');
    const { data: allReports } = await supabase.from('daily_reports').select('*');

    const filterByRange = (items, dateField = 'created_at') => {
      return (items || []).filter(item => {
        const d = item[dateField]?.split('T')[0] || item[dateField];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    };

    const list = (users || [])
      .filter(u => {
        if (u.role === 'admin') return false;
        if (company && u.company !== company) return false;
        if (role && u.role !== role) return false;
        return true;
      })
      .map(u => {
        const userTasks = (allTasks || []).filter(t => t.user_id === u.id);
        const userAttendance = filterByRange((allAttendance || []).filter(a => a.user_id === u.id), 'date');
        const userWorkLogs = filterByRange((allWorkLogs || []).filter(wl => wl.user_id === u.id), 'created_at');
        const userReports = filterByRange((allReports || []).filter(r => r.user_id === u.id), 'date');

        return {
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          company: u.company,
          tasksAssigned: userTasks.length,
          tasksCompleted: userTasks.filter(t => t.status === 'done').length,
          attendanceDays: userAttendance.length,
          workNotesCount: userWorkLogs.length,
          dailyReportsCount: userReports.length,
          loginStreak: getLoginStreak(allAttendance || [], u.id)
        };
      });

    res.json({ success: true, summary: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/bd-revenue
router.get('/bd-revenue', authenticate, requireAdmin, async (req, res) => {
  const { from, to } = req.query;

  try {
    const { data: allClients } = await supabase.from('bd_clients').select('*');
    const { data: users } = await supabase.from('users').select('id, full_name');

    const filterByRange = (items, dateField = 'created_at') => {
      return (items || []).filter(item => {
        const d = item[dateField]?.split('T')[0] || item[dateField];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    };

    const clientsInRange = filterByRange(allClients || [], 'created_at');
    const deals = clientsInRange.filter(c => c.stage === 'deal_closed');

    const totalRevenue = deals.reduce((sum, c) => sum + (parseFloat(c.agreed_amount) || 0), 0);
    const pendingPayments = deals
      .filter(c => c.payment_status === 'pending')
      .reduce((sum, c) => sum + (parseFloat(c.agreed_amount) || 0), 0);
    const receivedPayments = deals
      .filter(c => c.payment_status === 'received')
      .reduce((sum, c) => sum + (parseFloat(c.agreed_amount) || 0), 0);

    // Group by Intern
    const internStatsMap = {};
    deals.forEach(d => {
      const mid = d.managed_by;
      if (!mid) return;
      if (!internStatsMap[mid]) {
        const u = users?.find(user => user.id === mid);
        internStatsMap[mid] = {
          user_id: mid,
          full_name: u?.full_name || 'Deleted Intern',
          deals: 0,
          revenue: 0
        };
      }
      internStatsMap[mid].deals++;
      internStatsMap[mid].revenue += (parseFloat(d.agreed_amount) || 0);
    });

    res.json({
      success: true,
      totalDeals: deals.length,
      totalRevenue,
      pendingPayments,
      receivedPayments,
      byIntern: Object.values(internStatsMap)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/recruitment-funnel
router.get('/recruitment-funnel', authenticate, requireAdmin, async (req, res) => {
  const { from, to } = req.query;

  try {
    const { data: allCandidates } = await supabase.from('recruitment_pipeline').select('*');
    const { data: users } = await supabase.from('users').select('id, full_name');

    const filterByRange = (items, dateField = 'created_at') => {
      return (items || []).filter(item => {
        const d = item[dateField]?.split('T')[0] || item[dateField];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    };

    const candInRange = filterByRange(allCandidates || [], 'created_at');

    // Count at each stage
    const stages = {
      applied: candInRange.filter(c => c.stage === 'applied').length,
      shortlisted: candInRange.filter(c => c.stage === 'shortlisted').length,
      interview_scheduled: candInRange.filter(c => c.stage === 'interview_scheduled').length,
      interviewed: candInRange.filter(c => c.stage === 'interviewed').length,
      selected: candInRange.filter(c => c.stage === 'selected').length,
      rejected: candInRange.filter(c => c.stage === 'rejected').length,
      joined: candInRange.filter(c => c.stage === 'joined').length
    };

    // Calculate Conversion from applied to selected/joined
    const total = candInRange.length;
    const joinedCount = stages.joined;
    const conversionRate = total > 0 ? ((joinedCount / total) * 100).toFixed(1) : 0;

    // Group by Intern
    const internMap = {};
    candInRange.forEach(c => {
      const aid = c.assigned_to;
      if (!aid) return;
      if (!internMap[aid]) {
        const u = users?.find(user => user.id === aid);
        internMap[aid] = {
          user_id: aid,
          full_name: u?.full_name || 'Deleted Intern',
          total: 0,
          qualified: 0,
          interviewed: 0,
          joined: 0
        };
      }
      internMap[aid].total++;
      if (['shortlisted', 'selected', 'joined'].includes(c.stage)) internMap[aid].qualified++;
      if (['interview_scheduled', 'interviewed'].includes(c.stage)) internMap[aid].interviewed++;
      if (c.stage === 'joined') internMap[aid].joined++;
    });

    res.json({
      success: true,
      totalCandidates: total,
      stages,
      conversionRate,
      byIntern: Object.values(internMap)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/attendance-summary
router.get('/attendance-summary', authenticate, requireAdmin, async (req, res) => {
  const { from, to, user_id } = req.query;

  try {
    const { data: allAttendance } = await supabase.from('attendance').select('*');

    const filtered = (allAttendance || []).filter(a => {
      if (user_id && a.user_id !== user_id) return false;
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      return true;
    });

    // Group by date
    const dateMap = {};
    filtered.forEach(a => {
      if (!dateMap[a.date]) {
        dateMap[a.date] = { date: a.date, present: 0, late: 0, absent: 0 };
      }
      if (a.status === 'present') dateMap[a.date].present++;
      else if (a.status === 'late') dateMap[a.date].late++;
      else if (a.status === 'absent') dateMap[a.date].absent++;
    });

    const presentSum = filtered.filter(a => a.status === 'present' || a.status === 'late').length;
    const total = filtered.length;
    const overallRate = total > 0 ? ((presentSum / total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      byDate: Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date)),
      overallRate
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
