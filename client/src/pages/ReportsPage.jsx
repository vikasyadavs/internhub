import { useState, useEffect } from 'react';
import { BarChart2, Calendar, Users, Briefcase, FileDown, TrendingUp, DollarSign, Award, Target, Sparkles, Filter, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const COMPANIES = [
  { value: '', label: 'All Companies' },
  { value: 'si_placements', label: 'SI Placements' },
  { value: 'site4people', label: 'Site4People' },
];

const ROLES = [
  { value: '', label: 'All Roles' },
  { value: 'it_intern', label: 'IT Intern' },
  { value: 'bd_intern', label: 'BD Intern' },
  { value: 'recruitment_intern', label: 'Recruitment Intern' },
  { value: 'employee', label: 'Full Time Employee' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('performance');
  const [loading, setLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // last 30 days
    to: new Date().toISOString().split('T')[0],
    company: '',
    role: '',
    user_id: '',
  });

  // Data
  const [team, setTeam] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);

  // Load team users for filters
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get('/users/team');
        setTeam(res.data.users || []);
        if (res.data.users?.length > 0) {
          setFilters(prev => ({ ...prev, user_id: res.data.users[0].id }));
        }
      } catch (_) {}
    };
    fetchTeam();
  }, []);

  const handleFilterChange = (field, val) => {
    setFilters(prev => ({ ...prev, [field]: val }));
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { from, to, company, role, user_id } = filters;
      const query = `?from=${from}&to=${to}`;

      if (activeTab === 'performance') {
        if (!user_id) {
          toast.error('Please select an employee first');
          setLoading(false);
          return;
        }
        const res = await api.get(`/analytics/intern-performance${query}&user_id=${user_id}`);
        setPerformanceData(res.data.performance);
      } else if (activeTab === 'weekly') {
        const companyFilter = company ? `&company=${company}` : '';
        const roleFilter = role ? `&role=${role}` : '';
        const res = await api.get(`/analytics/weekly-summary${query}${companyFilter}${roleFilter}`);
        setWeeklySummary(res.data.summary || []);
      } else if (activeTab === 'revenue') {
        const res = await api.get(`/analytics/bd-revenue${query}`);
        setRevenueData(res.data);
      } else if (activeTab === 'funnel') {
        const res = await api.get(`/analytics/recruitment-funnel${query}`);
        setFunnelData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, filters.user_id]); // Auto-load on tab switch or single intern select

  // export to CSV function
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `${activeTab}_report_${filters.from}_to_${filters.to}.csv`;

    if (activeTab === 'performance' && performanceData) {
      csvContent += `Performance Report for ${performanceData.full_name}\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Company,${performanceData.company}\n`;
      csvContent += `Role,${performanceData.role}\n`;
      csvContent += `Tasks Assigned,${performanceData.tasksAssigned}\n`;
      csvContent += `Tasks Completed,${performanceData.tasksCompleted}\n`;
      csvContent += `Avg Completion (Days),${performanceData.avgCompletionDays}\n`;
      csvContent += `Work Notes Count,${performanceData.workNotesCount}\n`;
      csvContent += `Daily Reports Count,${performanceData.dailyReportsCount}\n`;
      csvContent += `Attendance (Days),${performanceData.attendanceDays}\n`;
      csvContent += `Late Days,${performanceData.lateDays}\n`;
      csvContent += `Login Streak,${performanceData.loginStreak}\n`;
      if (performanceData.bd) {
        csvContent += `BD Calls Made,${performanceData.bd.callsMade}\n`;
        csvContent += `BD Leads Added,${performanceData.bd.leadsAdded}\n`;
        csvContent += `BD Deals Closed,${performanceData.bd.dealsClosed}\n`;
        csvContent += `BD Revenue Generated,${performanceData.bd.revenue}\n`;
      }
      if (performanceData.recruitment) {
        csvContent += `Recruitment Candidates,${performanceData.recruitment.candidatesAdded}\n`;
        csvContent += `Recruitment Interviewed,${performanceData.recruitment.interviewed}\n`;
        csvContent += `Recruitment Joined,${performanceData.recruitment.joined}\n`;
      }
    } else if (activeTab === 'weekly') {
      csvContent += `Weekly Summary Report\n`;
      csvContent += `Name,Role,Company,Streak,Tasks Assigned,Tasks Completed,Attendance Days,Work Notes,Daily Reports\n`;
      weeklySummary.forEach(u => {
        csvContent += `"${u.full_name}",${u.role},${u.company},${u.loginStreak},${u.tasksAssigned},${u.tasksCompleted},${u.attendanceDays},${u.workNotesCount},${u.dailyReportsCount}\n`;
      });
    } else if (activeTab === 'revenue' && revenueData) {
      csvContent += `BD Revenue Report\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Deals Closed,${revenueData.totalDeals}\n`;
      csvContent += `Total Revenue Collected,${revenueData.receivedPayments}\n`;
      csvContent += `Total Revenue Pending,${revenueData.pendingPayments}\n`;
      csvContent += `Total Expected Revenue,${revenueData.totalRevenue}\n\n`;
      csvContent += `Intern Performance Breakdown\n`;
      csvContent += `Intern Name,Deals Closed,Revenue Generated\n`;
      revenueData.byIntern.forEach(i => {
        csvContent += `"${i.full_name}",${i.deals},${i.revenue}\n`;
      });
    } else if (activeTab === 'funnel' && funnelData) {
      csvContent += `Recruitment Funnel Report\n`;
      csvContent += `Funnel Stage,Candidate Count\n`;
      Object.entries(funnelData.stages).forEach(([stage, count]) => {
        csvContent += `${stage},${count}\n`;
      });
      csvContent += `Overall Funnel Conversion Rate,${funnelData.conversionRate}%\n\n`;
      csvContent += `Recruitment Intern Breakdown\n`;
      csvContent += `Intern Name,Candidates Added,Qualified,Interviewed,Joined\n`;
      funnelData.byIntern.forEach(i => {
        csvContent += `"${i.full_name}",${i.total},${i.qualified},${i.interviewed},${i.joined}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white flex items-center gap-2">
            <BarChart2 size={24} className="text-purple-500" />
            Performance & Insights Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Filter, analyze metrics, and export data in one click</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToCSV} className="btn-primary flex items-center gap-1.5 text-sm">
            <FileDown size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Controls Panel */}
      <div className="card bg-gray-50/50 dark:bg-slate-900/50 border-gray-200/50">
        <h3 className="text-xs font-bold text-navy dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Filter size={12} className="text-purple-500" />
          Filter Criteria
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="label text-xs">From Date</label>
            <input type="date" value={filters.from} onChange={e => handleFilterChange('from', e.target.value)} className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">To Date</label>
            <input type="date" value={filters.to} onChange={e => handleFilterChange('to', e.target.value)} className="input text-xs" />
          </div>

          {activeTab === 'performance' ? (
            <div>
              <label className="label text-xs">Select Intern / Employee</label>
              <select value={filters.user_id} onChange={e => handleFilterChange('user_id', e.target.value)} className="input text-xs">
                <option value="">Select name...</option>
                {team.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role?.replace('_', ' ')})</option>
                ))}
              </select>
            </div>
          ) : activeTab === 'weekly' ? (
            <>
              <div>
                <label className="label text-xs">Company Filter</label>
                <select value={filters.company} onChange={e => handleFilterChange('company', e.target.value)} className="input text-xs">
                  {COMPANIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Role Filter</label>
                <select value={filters.role} onChange={e => handleFilterChange('role', e.target.value)} className="input text-xs">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div className="col-span-2 flex items-end">
              <p className="text-xs text-gray-400 pb-2">BD Revenue and Recruitment funnel reports compile data globally for all active teams.</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={fetchReport} className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-xs">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-gray-100 dark:border-slate-800 pb-px overflow-x-auto">
        {[
          { key: 'performance', label: 'Intern Performance', icon: Award },
          { key: 'weekly', label: 'Weekly Summary', icon: Users },
          { key: 'revenue', label: 'BD Revenue', icon: DollarSign },
          { key: 'funnel', label: 'Recruitment Funnel', icon: Target },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold text-xs transition-all shrink-0 ${
              activeTab === tab.key
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content Body */}
      {loading ? (
        <div className="skeleton h-60 rounded-2xl" />
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Intern Performance */}
          {activeTab === 'performance' && performanceData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="card md:col-span-1 space-y-4">
                <div className="text-center pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-full bg-gradient-purple-blue mx-auto flex items-center justify-center text-white text-2xl font-extrabold shadow-md mb-2">
                    {performanceData.full_name?.charAt(0)}
                  </div>
                  <h3 className="font-extrabold text-navy dark:text-white text-lg">{performanceData.full_name}</h3>
                  <span className="badge badge-purple text-xs font-semibold capitalize mt-1 inline-block">
                    {performanceData.role?.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-gray-400 mt-1 capitalize">Company: {performanceData.company?.replace('_', ' ')}</p>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Streak:</span>
                    <span className="font-bold text-green-500">🔥 {performanceData.loginStreak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Attendance:</span>
                    <span className="font-bold text-navy dark:text-white">{performanceData.attendanceDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Late Arrivals:</span>
                    <span className={`font-bold ${performanceData.lateDays > 3 ? 'text-red-500' : 'text-navy dark:text-white'}`}>
                      {performanceData.lateDays} days
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Metrics Grid */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="card bg-purple-50/20 dark:bg-purple-950/10 border-purple-100/50">
                    <p className="text-3xl font-extrabold text-purple-650 dark:text-purple-400">
                      {performanceData.tasksCompleted}/{performanceData.tasksAssigned}
                    </p>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Tasks Completed vs Assigned</p>
                  </div>
                  <div className="card bg-blue-50/20 dark:bg-blue-950/10 border-blue-100/50">
                    <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{performanceData.avgCompletionDays}</p>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Average Completion Speed (Days)</p>
                  </div>
                  <div className="card bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100/50">
                    <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{performanceData.workNotesCount}</p>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Submitted Task Updates/Work Notes</p>
                  </div>
                  <div className="card bg-orange-50/20 dark:bg-orange-950/10 border-orange-100/50">
                    <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{performanceData.dailyReportsCount}</p>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Total Daily Logs Submitted</p>
                  </div>
                </div>

                {/* Role Specific Stats */}
                {performanceData.bd && (
                  <div className="card">
                    <h4 className="font-bold text-navy dark:text-white text-xs uppercase mb-3 flex items-center gap-1 text-purple-600">
                      <Briefcase size={12} />
                      BD Sales metrics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl">
                        <span className="text-lg font-bold text-navy dark:text-white">{performanceData.bd.callsMade}</span>
                        <p className="text-[10px] text-gray-400">Calls Logged</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl">
                        <span className="text-lg font-bold text-navy dark:text-white">{performanceData.bd.leadsAdded}</span>
                        <p className="text-[10px] text-gray-400">Leads added</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl">
                        <span className="text-lg font-bold text-navy dark:text-white">{performanceData.bd.dealsClosed}</span>
                        <p className="text-[10px] text-gray-400">Deals Closed</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl">
                        <span className="text-lg font-bold text-emerald-600">₹{performanceData.bd.revenue}</span>
                        <p className="text-[10px] text-gray-400">Revenue</p>
                      </div>
                    </div>
                  </div>
                )}

                {performanceData.recruitment && (
                  <div className="card">
                    <h4 className="font-bold text-navy dark:text-white text-xs uppercase mb-3 flex items-center gap-1 text-purple-600">
                      <Users size={12} />
                      Recruitment Funnel metrics
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl">
                        <span className="text-lg font-bold text-navy dark:text-white">{performanceData.recruitment.candidatesAdded}</span>
                        <p className="text-[10px] text-gray-400">Candidates Added</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl">
                        <span className="text-lg font-bold text-navy dark:text-white">{performanceData.recruitment.interviewed}</span>
                        <p className="text-[10px] text-gray-400">Interviewed</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl">
                        <span className="text-lg font-bold text-green-600">{performanceData.recruitment.joined}</span>
                        <p className="text-[10px] text-gray-400">Joined</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Weekly Summary */}
          {activeTab === 'weekly' && (
            <div className="card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Intern Name</th>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Login Streak</th>
                    <th>Tasks Completed / Assigned</th>
                    <th>Attendance Days</th>
                    <th>Daily Reports</th>
                    <th>Work Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySummary.map(u => (
                    <tr key={u.id}>
                      <td className="font-bold text-navy dark:text-white">{u.full_name}</td>
                      <td className="capitalize text-xs">{u.role?.replace('_', ' ')}</td>
                      <td className="capitalize text-xs">{u.company?.replace('_', ' ')}</td>
                      <td><span className="font-semibold text-green-500">🔥 {u.loginStreak}</span></td>
                      <td>
                        <span className="font-semibold">{u.tasksCompleted}</span>/{u.tasksAssigned}
                      </td>
                      <td>{u.attendanceDays} days</td>
                      <td>{u.dailyReportsCount}</td>
                      <td>{u.workNotesCount}</td>
                    </tr>
                  ))}
                  {weeklySummary.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-gray-400">No summary records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: BD Revenue */}
          {activeTab === 'revenue' && revenueData && (
            <div className="space-y-6">
              {/* Group summaries */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Deals Closed', value: revenueData.totalDeals, color: 'from-purple-500 to-indigo-650' },
                  { label: 'Collected Payments', value: `₹${revenueData.receivedPayments}`, color: 'from-emerald-500 to-teal-650' },
                  { label: 'Pending Payments', value: `₹${revenueData.pendingPayments}`, color: 'from-amber-500 to-orange-650' },
                  { label: 'Total Value', value: `₹${revenueData.totalRevenue}`, color: 'from-blue-500 to-cyan-650' },
                ].map(card => (
                  <div key={card.label} className={`stat-card bg-gradient-to-br ${card.color}`}>
                    <div className="relative">
                      <p className="text-2xl font-extrabold text-white">{card.value}</p>
                      <p className="text-xs text-white/80 font-medium">{card.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Group table */}
              <div className="card">
                <h3 className="font-bold text-navy dark:text-white mb-3">Revenue Breakdown per BD Intern</h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Intern Name</th>
                        <th>Deals Closed</th>
                        <th>Agreed Revenue Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.byIntern.map(item => (
                        <tr key={item.user_id}>
                          <td className="font-semibold text-navy dark:text-white">{item.full_name}</td>
                          <td>{item.deals}</td>
                          <td className="font-bold text-emerald-600">₹{item.revenue}</td>
                        </tr>
                      ))}
                      {revenueData.byIntern.length === 0 && (
                        <tr>
                          <td colSpan="3" className="text-center py-6 text-gray-400">No revenue data.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Recruitment Funnel */}
          {activeTab === 'funnel' && funnelData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Funnel chart/stage lists */}
              <div className="card lg:col-span-1 space-y-4">
                <div>
                  <h3 className="font-bold text-navy dark:text-white mb-1">Recruitment Pipeline Funnel</h3>
                  <p className="text-xs text-gray-400">Candidate conversions in selected range</p>
                </div>

                <div className="space-y-2">
                  {Object.entries(funnelData.stages).map(([stage, count]) => {
                    const percent = funnelData.totalCandidates > 0 ? Math.round((count / funnelData.totalCandidates) * 100) : 0;
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="capitalize text-gray-600 dark:text-gray-300">{stage.replace('_', ' ')}</span>
                          <span className="text-navy dark:text-white font-bold">{count} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-500">Overall Selection Conversion:</span>
                  <span className="font-bold text-green-500 text-sm">{funnelData.conversionRate}%</span>
                </div>
              </div>

              {/* Intern stats */}
              <div className="card lg:col-span-2">
                <h3 className="font-bold text-navy dark:text-white mb-3">Recruitment Candidate Pipelines Grouped by Intern</h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Intern Name</th>
                        <th>Total Candidates Added</th>
                        <th>Qualified Candidates</th>
                        <th>Interviews Done</th>
                        <th>Joined Candidates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnelData.byIntern.map(item => (
                        <tr key={item.user_id}>
                          <td className="font-semibold text-navy dark:text-white">{item.full_name}</td>
                          <td>{item.total}</td>
                          <td>{item.qualified}</td>
                          <td>{item.interviewed}</td>
                          <td className="font-bold text-green-600">{item.joined}</td>
                        </tr>
                      ))}
                      {funnelData.byIntern.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-6 text-gray-400">No recruitment data.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
