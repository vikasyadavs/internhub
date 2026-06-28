import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  Receipt, DollarSign, Calendar, UserCheck, FileText,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, TrendingDown
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MODE_LABELS = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  hybrid: 'Hybrid',
  online: 'Online',
  field_work: 'Field Work',
};

function PayrollRow({ item, onMarkPaid, onPrintPayslip, month, year, isPaid }) {
  const [expanded, setExpanded] = useState(false);
  const isOnline = item.internship_mode === 'online';

  const hoursNum = parseFloat(item.hours_worked) || 0;
  const expectedHours = (item.present_days || 0) * 8;
  const hoursPct = expectedHours > 0 ? Math.min(100, Math.round((hoursNum / expectedHours) * 100)) : 0;

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors border-b border-gray-100 dark:border-slate-800">
        <td className="px-4 py-3.5">
          <p className="font-semibold text-navy dark:text-white text-sm">{item.full_name}</p>
          <p className="text-[10px] text-gray-400 capitalize mt-0.5">
            {item.role.replace(/_/g, ' ')}
            {item.employee_type && <span className="ml-1 text-orange-500">· {item.employee_type.replace(/_/g, ' ')}</span>}
          </p>
        </td>
        <td className="px-4 py-3.5">
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
            isOnline
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : item.internship_mode === 'field_work'
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
              : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {MODE_LABELS[item.internship_mode] || item.internship_mode}
          </span>
        </td>
        <td className="px-4 py-3.5 font-medium text-gray-700 dark:text-gray-300">₹{item.base_salary.toLocaleString()}</td>
        <td className="px-4 py-3.5 text-center text-gray-500 dark:text-gray-400">{item.expected_days}</td>
        <td className="px-4 py-3.5 text-center font-semibold text-green-600 dark:text-green-400">{item.present_days}</td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-14">{item.hours_worked}h</span>
            {!isOnline && (
              <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 min-w-[50px]">
                <div
                  className={`h-1.5 rounded-full ${hoursPct >= 90 ? 'bg-green-500' : hoursPct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${hoursPct}%` }}
                />
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5">
          {item.deductions > 0 ? (
            <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
              -₹{item.deductions.toLocaleString()}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3.5 font-bold text-navy dark:text-white text-sm">
          ₹{item.net_salary.toLocaleString()}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex gap-1.5 items-center">
            {item.day_breakdown?.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                title="View daily breakdown"
              >
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
            <button
              onClick={() => onPrintPayslip(item)}
              className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-100 dark:border-purple-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-semibold text-xs transition-colors"
            >
              <FileText size={11} />
              Slip
            </button>
            {isPaid ? (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 size={11} /> Paid
              </span>
            ) : (
              <button
                onClick={() => onMarkPaid(item.user_id)}
                className="bg-green-600 hover:bg-black text-white px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors"
              >
                Mark Paid
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded daily breakdown */}
      {expanded && item.day_breakdown?.length > 0 && (
        <tr className="bg-gray-50 dark:bg-slate-900/50">
          <td colSpan={9} className="px-6 py-3">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Daily Breakdown — {MONTHS[month]} {year}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {item.day_breakdown.map((d, i) => (
                <div key={i} className={`text-[10px] rounded-lg p-2 border ${
                  d.hours_penalty > 0 || d.visit_penalty > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">{d.date}</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {d.check_in} → {d.check_out || 'N/A'}
                    {d.net_minutes > 0 && <span className="ml-1">({Math.floor(d.net_minutes / 60)}h {d.net_minutes % 60}m)</span>}
                  </p>
                  <p className="font-bold mt-0.5">Pay: ₹{d.day_pay}</p>
                  {d.hours_penalty > 0 && <p className="text-red-600 dark:text-red-400">-₹{d.hours_penalty} (hours)</p>}
                  {d.visit_penalty > 0 && <p className="text-orange-600 dark:text-orange-400">-₹{d.visit_penalty} (visits)</p>}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function PayrollPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [payrollData, setPayrollData] = useState([]);
  const [expectedDays, setExpectedDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paidStatus, setPaidStatus] = useState({});

  useEffect(() => { fetchPayroll(); }, [year, month]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/calculate?year=${year}&month=${month}`);
      setPayrollData(res.data.payroll || []);
      setExpectedDays(res.data.expectedWorkDays || 0);
    } catch {
      toast.error('Failed to load payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = (userId) => {
    setPaidStatus(prev => ({ ...prev, [userId]: true }));
    toast.success('Salary marked as Paid 💸');
  };

  const handlePrintPayslip = (item) => {
    const isOnline = item.internship_mode === 'online';
    const todayStr = format(new Date(), 'dd MMM yyyy');
    const win = window.open('', '_blank');
    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Payslip — ${item.full_name} — ${MONTHS[month]} ${year}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 28px; }
    .logo-name { font-size: 22px; font-weight: 800; color: #1e1b4b; }
    .logo-sub { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.6; }
    .payslip-meta { text-align: right; }
    .payslip-meta h2 { font-size: 18px; color: #7c3aed; font-weight: 700; }
    .payslip-meta p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .title { font-size: 15px; font-weight: 700; text-align: center; margin-bottom: 24px; color: #1e1b4b; letter-spacing: 0.5px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .section-title { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 1px; margin-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
    .info-row:last-child { border: none; }
    .info-row span:first-child { color: #64748b; }
    .info-row span:last-child { font-weight: 600; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; }
    th { background: #f1f5f9; font-weight: 700; color: #475569; text-align: left; font-size: 11px; text-transform: uppercase; }
    .net-row { background: #1e1b4b; color: white; font-weight: 700; font-size: 14px; }
    .net-row td { border-color: #1e1b4b; color: white; }
    .deduction-row td { color: #dc2626; }
    .signature-area { display: flex; justify-content: flex-end; margin-top: 60px; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #cbd5e1; width: 200px; padding-top: 8px; font-size: 12px; }
    .note { font-size: 10px; color: #94a3b8; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body onload="window.print()">
  <div class="header">
    <div>
      <div class="logo-name">
        ${item.company === 'site4people' ? 'Site4People' : 'SI Placements Internationals'}
      </div>
      <div class="logo-sub">
        ${item.company === 'site4people'
          ? '541, Krupal Pathshala City Centre, Asharam Road, Ahmedabad 380014<br>Phone: +91 9898767870 | info@site4people.com | www.site4people.com<br><em>Powered by SI Placements Internationals</em>'
          : 'HO: 204, Akshar Matrix, Odhav S.P Ringroad, Ahmedabad, 382415<br>Phone: +91 6358845533 | info@siinternationals.com | siinternationals.com'
        }
      </div>
    </div>
    <div class="payslip-meta">
      <h2>PAYSLIP</h2>
      <p>Issued: <strong>${todayStr}</strong></p>
      <p>Period: <strong>${MONTHS[month]} ${year}</strong></p>
    </div>
  </div>

  <div class="title">SALARY SLIP / STIPEND STATEMENT — ${MONTHS[month].toUpperCase()} ${year}</div>

  <div class="grid">
    <div>
      <div class="section-title">Employee / Intern Details</div>
      <div class="info-row"><span>Name</span><span>${item.full_name}</span></div>
      <div class="info-row"><span>Role</span><span>${item.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}${item.employee_type ? ' — ' + item.employee_type.replace(/_/g, ' ') : ''}</span></div>
      <div class="info-row"><span>Department</span><span>${item.company === 'site4people' ? 'Site4People' : 'SI Placements'}</span></div>
    </div>
    <div>
      <div class="section-title">Working Details</div>
      <div class="info-row"><span>Work Mode</span><span>${MODE_LABELS[item.internship_mode] || item.internship_mode}</span></div>
      <div class="info-row"><span>Expected Workdays</span><span>${isOnline ? 'N/A (Online)' : item.expected_days}</span></div>
      <div class="info-row"><span>Days Present</span><span>${item.present_days}</span></div>
      <div class="info-row"><span>Total Hours Logged</span><span>${item.hours_worked} hrs</span></div>
      ${item.daily_target ? `<div class="info-row"><span>Daily Visit Target</span><span>${item.daily_target} visits</span></div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Earnings Description</th>
        <th>Basis</th>
        <th style="text-align:right">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${isOnline ? 'Fixed Monthly Stipend / Salary (Online)' : 'Gross Salary / Stipend (Prorated)'}</td>
        <td>${isOnline ? 'Fixed rate — full pay' : `${item.present_days} of ${item.expected_days} workdays`}</td>
        <td style="text-align:right">₹${item.base_salary.toLocaleString()}</td>
      </tr>
      ${item.travel_allowance && item.travel_allowance !== 'N/A' ? `
      <tr>
        <td>Travel Allowance</td>
        <td>Policy: ${item.travel_allowance}</td>
        <td style="text-align:right">—</td>
      </tr>
      ` : ''}
      ${item.hours_deductions > 0 ? `
      <tr class="deduction-row">
        <td>Deduction: Insufficient Hours</td>
        <td>Hours worked below 8hr standard</td>
        <td style="text-align:right">-₹${item.hours_deductions.toLocaleString()}</td>
      </tr>
      ` : ''}
      ${item.visit_deductions > 0 ? `
      <tr class="deduction-row">
        <td>Deduction: Missed Client Visits</td>
        <td>Field target shortfall (max 20%)</td>
        <td style="text-align:right">-₹${item.visit_deductions.toLocaleString()}</td>
      </tr>
      ` : ''}
    </tbody>
    <tfoot>
      <tr class="net-row">
        <td colspan="2"><strong>NET SALARY / STIPEND PAYABLE</strong></td>
        <td style="text-align:right"><strong>₹${item.net_salary.toLocaleString()}</strong></td>
      </tr>
    </tfoot>
  </table>

  <div class="signature-area">
    <div class="sig-block">
      <div class="sig-line">
        <strong>Soumita Das</strong><br>
        Partner, Authorized Signatory<br>
        SI Placements Internationals
      </div>
    </div>
  </div>

  <div class="note">
    This is a computer-generated payslip. For queries, contact info@siinternationals.com or +91 6358845533.
  </div>
</body>
</html>
    `);
    win.document.close();
  };

  const totalPayroll = payrollData.reduce((s, i) => s + i.net_salary, 0);
  const totalDeductions = payrollData.reduce((s, i) => s + (i.deductions || 0), 0);
  const totalPresent = payrollData.reduce((s, i) => s + i.present_days, 0);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* KPI banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Payroll', value: `₹${totalPayroll.toLocaleString()}`, icon: DollarSign, gradient: 'from-purple-500 to-indigo-600' },
          { label: 'Total Deductions', value: `₹${totalDeductions.toLocaleString()}`, icon: TrendingDown, gradient: 'from-red-500 to-rose-600' },
          { label: 'Attendance Days', value: `${totalPresent}`, icon: UserCheck, gradient: 'from-emerald-500 to-teal-600' },
          { label: 'Office Workdays', value: `${expectedDays}`, icon: Calendar, gradient: 'from-blue-500 to-cyan-600' },
        ].map(s => (
          <div key={s.label} className={`stat-card bg-gradient-to-br ${s.gradient}`}>
            <div className="relative">
              <div className="p-2 rounded-xl bg-white/20 inline-flex mb-2">
                <s.icon size={18} className="text-white" />
              </div>
              <p className="text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-white/80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Month/Year selector */}
      <div className="card flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div>
          <h3 className="font-bold text-navy dark:text-white flex items-center gap-2">
            <Receipt size={18} className="text-purple-DEFAULT" />
            Payroll Calculator
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Calculates net pay based on presence, logged hours (8h standard), and field visit targets. Online workers receive full fixed pay.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input text-xs">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input text-xs">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Deduction Rules Note */}
      <div className="card bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-bold">Payroll Deduction Rules:</p>
            <p>• <strong>Hours Deduction</strong>: Office/field staff must log 8 hours/day. Short hours are deducted proportionally.</p>
            <p>• <strong>Visit Deduction</strong>: Field sales staff with daily targets — missed visits incur up to 20% penalty per day.</p>
            <p>• <strong>Online/Freelance</strong>: No deductions — full fixed stipend paid regardless of hours.</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14" />)}
          </div>
        ) : payrollData.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <AlertCircle size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>No active team members found for payroll calculation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-600 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Base Pay</th>
                  <th className="px-4 py-3 text-center">Exp. Days</th>
                  <th className="px-4 py-3 text-center">Present</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Pay</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map(item => (
                  <PayrollRow
                    key={item.user_id}
                    item={item}
                    month={month}
                    year={year}
                    isPaid={!!paidStatus[item.user_id]}
                    onMarkPaid={handleMarkPaid}
                    onPrintPayslip={handlePrintPayslip}
                  />
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-slate-800/60 border-t-2 border-gray-200 dark:border-slate-700">
                <tr className="font-bold text-navy dark:text-white">
                  <td className="px-4 py-3" colSpan={6}>TOTAL</td>
                  <td className="px-4 py-3 text-red-600 dark:text-red-400">-₹{totalDeductions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-purple-600 dark:text-purple-400">₹{totalPayroll.toLocaleString()}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
