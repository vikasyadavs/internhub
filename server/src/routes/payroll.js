import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const requireAdmin = requireRole('admin');

// Convert HH:MM string to minutes
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
};

// Count workdays in month excluding Sundays
const getExpectedWorkDays = (year, month) => {
  const numDays = new Date(year, month + 1, 0).getDate();
  let workDays = 0;
  for (let day = 1; day <= numDays; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() !== 0) workDays++;
  }
  return workDays;
};

// Parse salary string to number
const parseSalary = (val) => {
  if (!val || val === 'N/A') return 0;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
};

// GET /api/payroll/calculate
router.get('/calculate', authenticate, requireAdmin, async (req, res) => {
  const { year, month } = req.query;
  const targetYear = parseInt(year) || new Date().getFullYear();
  const targetMonth = (parseInt(month) >= 0 && parseInt(month) <= 11) ? parseInt(month) : new Date().getMonth();

  try {
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, username, full_name, role, company, department, stipend, internship_mode, travel_allowance, is_active, daily_target, employee_type');

    if (userErr) return res.status(500).json({ success: false, message: userErr.message });

    const prefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-`;

    const { data: attendanceLogs } = await supabase.from('attendance').select('*');
    const { data: callLogs } = await supabase.from('call_logs').select('*');

    const monthlyExpectedDays = getExpectedWorkDays(targetYear, targetMonth);

    // Build call logs day lookup: { "userId_date": visitCount }
    const callLogsLookup = {};
    (callLogs || []).forEach(cl => {
      if (!cl.timestamp) return;
      const callDate = cl.timestamp.split('T')[0];
      if (!callDate.startsWith(prefix)) return;
      const uid = cl.intern_id || cl.user_id;
      if (!uid) return;
      const key = `${uid}_${callDate}`;
      callLogsLookup[key] = (callLogsLookup[key] || 0) + 1;
    });

    const payrollList = (users || [])
      .filter(u => u.role !== 'admin')
      .map(u => {
        const baseSalary = parseSalary(u.stipend);
        const userLogs = (attendanceLogs || []).filter(
          a => a.user_id === u.id && a.date?.startsWith(prefix)
        );

        const isOnline = u.internship_mode === 'online';
        const isField = u.internship_mode === 'field_work';
        const dailyRate = monthlyExpectedDays > 0 ? baseSalary / monthlyExpectedDays : 0;

        let presentDays = 0;
        let totalNetMinutes = 0;
        let totalEarned = 0;
        let hoursDeductions = 0;
        let visitDeductions = 0;
        const dayBreakdown = [];

        userLogs.forEach(log => {
          if (!log.check_in) return;
          presentDays++;

          let dayPay = dailyRate;
          let hoursPenalty = 0;
          let visitPenalty = 0;
          let netMin = 0;

          if (!isOnline) {
            // Calculate hours worked
            if (log.check_in && log.check_out) {
              const rawMin = Math.max(0, timeToMinutes(log.check_out) - timeToMinutes(log.check_in));

              // Subtract break time
              let breakMin = 0;
              try {
                const breaks = typeof log.breaks === 'string' ? JSON.parse(log.breaks) : (log.breaks || []);
                breaks.forEach(b => {
                  if (b.break_start && b.break_end) {
                    breakMin += Math.max(0, timeToMinutes(b.break_end) - timeToMinutes(b.break_start));
                  }
                });
              } catch (e) {}

              netMin = Math.max(0, rawMin - breakMin);
              totalNetMinutes += netMin;

              // Deduct proportionally if < 8 hours (480 minutes)
              const targetMin = 480;
              if (netMin < targetMin) {
                const ratio = netMin / targetMin;
                dayPay = dailyRate * ratio;
                hoursPenalty = dailyRate * (1 - ratio);
                hoursDeductions += hoursPenalty;
              }
            } else {
              // Checked in but not checked out — treat as half day
              dayPay = dailyRate * 0.5;
              hoursPenalty = dailyRate * 0.5;
              hoursDeductions += hoursPenalty;
            }

            // Field worker: apply visit target deduction (up to 20% penalty)
            if (isField && log.date) {
              const targetVisits = parseInt(u.daily_target) || 0;
              if (targetVisits > 0) {
                const actualVisits = callLogsLookup[`${u.id}_${log.date}`] || 0;
                const visitRatio = Math.min(1.0, actualVisits / targetVisits);
                const penaltyFactor = 0.2 * (1 - visitRatio); // max 20% deduction
                visitPenalty = dayPay * penaltyFactor;
                dayPay = dayPay * (1 - penaltyFactor);
                visitDeductions += visitPenalty;
              }
            }
          }

          totalEarned += dayPay;
          dayBreakdown.push({
            date: log.date,
            check_in: log.check_in,
            check_out: log.check_out || null,
            net_minutes: netMin,
            day_pay: Math.round(dayPay),
            hours_penalty: Math.round(hoursPenalty),
            visit_penalty: Math.round(visitPenalty),
          });
        });

        const netSalary = isOnline ? baseSalary : Math.round(totalEarned);
        const deductions = isOnline ? 0 : Math.round(hoursDeductions + visitDeductions);

        return {
          user_id: u.id,
          full_name: u.full_name,
          role: u.role,
          employee_type: u.employee_type || null,
          company: u.company,
          internship_mode: u.internship_mode || 'full_time',
          base_salary: baseSalary,
          expected_days: isOnline ? 'N/A' : monthlyExpectedDays,
          present_days: presentDays,
          hours_worked: (totalNetMinutes / 60).toFixed(1),
          daily_target: u.daily_target || null,
          net_salary: netSalary,
          deductions,
          hours_deductions: Math.round(hoursDeductions),
          visit_deductions: Math.round(visitDeductions),
          travel_allowance: u.travel_allowance || 'N/A',
          day_breakdown: dayBreakdown,
        };
      });

    res.json({
      success: true,
      month: targetMonth,
      year: targetYear,
      expectedWorkDays: monthlyExpectedDays,
      payroll: payrollList,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
