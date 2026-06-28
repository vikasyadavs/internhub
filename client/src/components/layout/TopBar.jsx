import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, Search, X, Briefcase, CheckSquare, Users, UserSearch, FolderOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from '../NotificationBell';
import api from '../../lib/api';

const pageTitles = {
  '/':            'Dashboard',
  '/attendance':  'Attendance',
  '/tasks':       'Tasks',
  '/projects':    'IT Projects',
  '/reports':     'Daily Report',
  '/recruitment': 'Recruitment Pipeline',
  '/clients':     'BD Pipeline',
  '/invoices':    'Invoices',
  '/documents':   'Documents',
  '/team':        'Team Management',
  '/announcements': 'Announcements',
  '/profile':     'My Profile',
  '/payroll':     'Payroll Calculator',
  '/tracking':    'Live Tracking',
  '/analytics':   'Reports & Analytics',
  '/activity':    'Activity Logs',
  '/settings':    'Settings',
};

const TYPE_CONFIG = {
  intern:    { icon: Users,       color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
  task:      { icon: CheckSquare, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
  client:    { icon: Briefcase,   color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
  candidate: { icon: UserSearch,  color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/20' },
  project:   { icon: FolderOpen,  color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20' },
};

export default function TopBar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.results || []);
      } catch (_) {}
      finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const title = pageTitles[location.pathname] || 'InternHub';

  const companyBadge = user?.company === 'site4people'
    ? { label: 'Site4People',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    : { label: 'SI Placements', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };

  const handleResultClick = (link) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(link);
  };

  return (
    <>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="w-72 h-full bg-navy" onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 bg-white/90 dark:bg-navy/95 backdrop-blur-md border-b border-gray-200 dark:border-navy-light px-4 md:px-6 py-3 transition-colors">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">

          {/* Left: hamburger + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-light transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-bold text-navy dark:text-white truncate">{title}</h1>
          </div>

          {/* Center: global search */}
          <div className="flex-1 max-w-sm hidden sm:block" ref={searchRef}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                placeholder="Search interns, tasks, leads..."
                className="w-full pl-9 pr-9 py-2 text-sm bg-gray-100 dark:bg-navy-light border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-navy-light text-navy dark:text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 no-min-tap">
                  <X size={14} />
                </button>
              )}

              {/* Results dropdown */}
              {searchOpen && searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-navy-light border border-gray-200 dark:border-navy-lighter rounded-xl shadow-modal overflow-hidden z-50 animate-fade-in">
                  {searchLoading ? (
                    <div className="p-4 text-center text-xs text-gray-400">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No results for "{searchQuery}"</div>
                  ) : (
                    <div className="py-1 max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-navy">
                      {searchResults.map((r, i) => {
                        const config = TYPE_CONFIG[r.type] || { icon: Search, color: 'text-gray-500 bg-gray-50' };
                        const Icon = config.icon;
                        return (
                          <button
                            key={i}
                            onClick={() => handleResultClick(r.link)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-navy text-left transition-colors"
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 no-min-tap ${config.color}`}>
                              <Icon size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-navy dark:text-white truncate">{r.title}</p>
                              <p className="text-[11px] text-gray-400 capitalize truncate">{r.sub}</p>
                            </div>
                            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold no-min-tap ${config.color}`}>
                              {r.type}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <span className={`hidden md:inline-flex badge ${companyBadge.cls} text-xs font-semibold no-min-tap`}>
              {companyBadge.label}
            </span>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-light transition-colors text-gray-600 dark:text-gray-300"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <NotificationBell />

            {/* Avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-gradient-purple-blue flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-glow-purple transition-shadow no-min-tap"
            >
              {user?.full_name?.charAt(0)}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
