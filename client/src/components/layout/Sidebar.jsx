import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardCheck, CheckSquare, FileText,
  Users, UserSearch, Briefcase, Receipt, FileDown,
  Megaphone, User, Building2, Zap, Navigation, BarChart2, Activity, Settings,
  Phone, Mail, Globe
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { user, logout, isAdmin, isBD, isRecruitment } = useAuth();

  const companyColor = user?.company === 'site4people' ? 'from-blue-600 to-indigo-600' : 'from-purple-600 to-pink-600';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', always: true },
    { to: '/attendance', icon: ClipboardCheck, label: 'Attendance', always: true },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', always: true },
    { to: '/projects', icon: Building2, label: 'IT Projects', show: isAdmin() || user?.role === 'it_intern' },
    { to: '/reports', icon: FileText, label: 'Daily Report', always: true },
    { to: '/recruitment', icon: UserSearch, label: 'Recruitment', show: isAdmin() || isRecruitment() },
    { to: '/clients', icon: Briefcase, label: 'BD Pipeline', show: isAdmin() || isBD() },
    { to: '/calling-sheet', icon: Phone, label: 'Calling Sheet', show: isAdmin() || isBD() },
    { to: '/email-composer', icon: Mail, label: 'Email Composer', show: isAdmin() || isBD() || isRecruitment() },
    { to: '/google-integrations', icon: Globe, label: 'Google Workspace', always: true },
    { to: '/invoices', icon: Receipt, label: 'Invoices', show: isAdmin() || isBD() },
    { to: '/payroll', icon: Receipt, label: 'Payroll', show: isAdmin() },
    { to: '/tracking', icon: Navigation, label: 'Live Tracking', show: isAdmin() },
    { to: '/analytics', icon: BarChart2, label: 'Reports', show: isAdmin() },
    { to: '/activity', icon: Activity, label: 'Activity Logs', show: isAdmin() },
    { to: '/documents', icon: FileDown, label: 'Documents', show: isAdmin() },
    { to: '/team', icon: Users, label: 'Team', show: isAdmin() },
    { to: '/settings', icon: Settings, label: 'Settings', show: isAdmin() },
    { to: '/announcements', icon: Megaphone, label: 'Announcements', always: true },
    { to: '/profile', icon: User, label: 'Profile', always: true },
  ];

  return (
    <div className="flex flex-col h-full bg-navy text-white">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${companyColor} flex items-center justify-center shadow-lg`}>
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">InternHub</h1>
            <p className="text-xs text-slate-400 leading-tight truncate max-w-[150px]">
              {user?.company === 'site4people' ? 'Site4People' : 'SI Placements'}
            </p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-purple-blue flex items-center justify-center text-sm font-bold shrink-0">
            {user?.full_name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems
          .filter(item => item.always || item.show)
          .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
      </nav>

      {/* Company badge + Logout */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-2 px-2">
          <Building2 size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500">
            {user?.company === 'site4people' ? 'Site4People · Powered by SI Placements' : 'SI Placements Internationals'}
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-sm font-medium transition-all duration-200"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
