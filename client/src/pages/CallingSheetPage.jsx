import { useState, useEffect } from 'react';
import { 
  Phone, Upload, FileSpreadsheet, Plus, X, Search, CheckCircle2, 
  AlertCircle, ChevronLeft, ChevronRight, Copy, ClipboardCheck, ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';

const BD_STAGES = [
  { id: 'prospect', label: 'Prospect', badge: 'bg-slate-100 text-slate-700' },
  { id: 'contacted', label: 'Contacted', badge: 'bg-blue-100 text-blue-700' },
  { id: 'interested', label: 'Interested', badge: 'bg-indigo-100 text-indigo-700' },
  { id: 'proposal_sent', label: 'Proposal Sent', badge: 'bg-yellow-100 text-yellow-700' },
  { id: 'deal_closed', label: 'Deal Closed', badge: 'bg-green-100 text-green-700' },
  { id: 'payment_received', label: 'Payment Received', badge: 'bg-emerald-100 text-emerald-700' },
  { id: 'work_assigned', label: 'Work Assigned', badge: 'bg-purple-100 text-purple-700' },
];

export default function CallingSheetPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' | 'import' | 'templates'
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [filterIntern, setFilterIntern] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Log Call Modal State
  const [logClient, setLogClient] = useState(null);
  const [outcome, setOutcome] = useState('answered');
  const [notes, setNotes] = useState('');
  const [submittingCall, setSubmittingCall] = useState(false);

  // Import Excel State
  const [excelFile, setExcelFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    city: '',
    source: '',
    notes: ''
  });
  const [assignedTo, setAssignedTo] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, teamRes, settingsRes] = await Promise.all([
        api.get('/clients'),
        api.get('/users/team'),
        api.get('/settings').catch(() => ({ data: { settings: {} } }))
      ]);
      setClients(clientsRes.data.clients || []);
      // Only include BD interns for assignments
      const bdStaff = (teamRes.data.users || []).filter(u => u.role === 'bd_intern');
      setTeam(bdStaff);
      setSettings(settingsRes.data.settings || {});
      if (bdStaff.length > 0) {
        setAssignedTo(bdStaff[0].id);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Excel parsing
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (data.length > 0) {
        const fileHeaders = data[0].map(h => String(h).trim());
        setHeaders(fileHeaders);
        
        // Parse rows as objects
        const rows = data.slice(1).map(row => {
          const obj = {};
          fileHeaders.forEach((h, idx) => {
            obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });
          return obj;
        });
        
        setRawData(rows);
        autoMapColumns(fileHeaders);
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoMapColumns = (fileHeaders) => {
    const maps = {
      company_name: '',
      contact_name: '',
      phone: '',
      email: '',
      city: '',
      source: '',
      notes: ''
    };

    fileHeaders.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('company') || lower.includes('business') || lower.includes('organization')) {
        maps.company_name = h;
      } else if (lower.includes('contact') || lower.includes('name') || lower.includes('person')) {
        if (!maps.contact_name) maps.contact_name = h;
      } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('number') || lower.includes('contact no')) {
        maps.phone = h;
      } else if (lower.includes('email') || lower.includes('mail')) {
        maps.email = h;
      } else if (lower.includes('city') || lower.includes('address') || lower.includes('location')) {
        maps.city = h;
      } else if (lower.includes('source') || lower.includes('lead source')) {
        maps.source = h;
      } else if (lower.includes('note') || lower.includes('remark') || lower.includes('comment')) {
        maps.notes = h;
      }
    });

    setMapping(maps);
  };

  const handleImport = async () => {
    if (!mapping.company_name && !mapping.contact_name) {
      return toast.error('Please map Company Name or Contact Name field.');
    }
    if (!mapping.phone) {
      return toast.error('Please map Phone field.');
    }
    if (!assignedTo) {
      return toast.error('Please select an intern to assign these leads to.');
    }

    setImporting(true);
    try {
      // Map raw rows to database schema
      const formattedClients = rawData.map(row => {
        return {
          company_name: row[mapping.company_name] || row[mapping.contact_name] || 'Unknown Company',
          contact_name: row[mapping.contact_name] || '',
          phone: row[mapping.phone] || '',
          email: row[mapping.email] || '',
          city: row[mapping.city] || '',
          source: row[mapping.source] || 'other',
          notes: row[mapping.notes] || ''
        };
      });

      const res = await api.post('/clients/bulk-import', {
        clients: formattedClients,
        assigned_to: assignedTo
      });

      toast.success(`Successfully imported ${res.data.imported} leads! 🎉`);
      setExcelFile(null);
      setRawData([]);
      setHeaders([]);
      fetchData();
      setActiveTab('tracker');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  // Call Logger Submit
  const handleLogCall = async (e) => {
    e.preventDefault();
    setSubmittingCall(true);
    try {
      await api.post(`/clients/${logClient.id}/call-log`, { outcome, notes });
      
      // Update stage if interested/not_interested
      let nextStage = logClient.stage;
      if (outcome === 'interested' && logClient.stage === 'prospect') {
        nextStage = 'interested';
      } else if (outcome === 'answered' && logClient.stage === 'prospect') {
        nextStage = 'contacted';
      }
      
      if (nextStage !== logClient.stage) {
        await api.patch(`/clients/${logClient.id}`, { stage: nextStage });
      }

      toast.success('Call log saved successfully!');
      setLogClient(null);
      setNotes('');
      setOutcome('answered');
      fetchData();
    } catch (err) {
      toast.error('Failed to log call');
    } finally {
      setSubmittingCall(false);
    }
  };

  // Filter clients
  const filtered = clients.filter(c => {
    const matchesSearch = 
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.city?.toLowerCase().includes(search.toLowerCase());
    
    const matchesIntern = filterIntern === 'all' || c.managed_by === filterIntern;
    const matchesStage = filterStage === 'all' || c.stage === filterStage;

    return matchesSearch && matchesIntern && matchesStage;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Template copied to clipboard!');
  };

  // Stats
  const totalLeads = clients.length;
  const prospectCount = clients.filter(c => c.stage === 'prospect').length;
  const contactedCount = clients.filter(c => c.stage === 'contacted' || c.stage === 'interested').length;
  const dealsClosed = clients.filter(c => c.stage === 'deal_closed' || c.stage === 'payment_received' || c.stage === 'work_assigned').length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-[50vh] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white flex items-center gap-2">
            <Phone className="text-purple-500" size={24} />
            BDE Calling Sheet
          </h1>
          <p className="text-sm text-gray-500">Import leads, assign calling lists, and track customer outreach</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white dark:bg-navy-light rounded-xl p-1 border border-gray-100 dark:border-navy-light shadow-sm">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tracker' 
                ? 'bg-navy text-white dark:bg-purple-600' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Call Tracker
          </button>
          {isAdmin() && (
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'import' 
                  ? 'bg-navy text-white dark:bg-purple-600' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Excel Import
            </button>
          )}
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'templates' 
                ? 'bg-navy text-white dark:bg-purple-600' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Outreach Templates
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 flex items-center justify-center font-bold">
            📊
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Total Leads</p>
            <p className="text-lg font-bold text-navy dark:text-white">{totalLeads}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 flex items-center justify-center font-bold">
            ⏳
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Prospects</p>
            <p className="text-lg font-bold text-navy dark:text-white">{prospectCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 flex items-center justify-center font-bold">
            📞
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Contacted/Interested</p>
            <p className="text-lg font-bold text-navy dark:text-white">{contactedCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-600 flex items-center justify-center font-bold">
            🤝
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Deals Cracked</p>
            <p className="text-lg font-bold text-navy dark:text-white">{dealsClosed}</p>
          </div>
        </div>
      </div>

      {/* TRACKER TAB */}
      {activeTab === 'tracker' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                className="input pl-9 text-xs"
                placeholder="Search leads by company, contact person, phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {isAdmin() && (
              <select
                className="input md:w-48 text-xs bg-white dark:bg-navy-light"
                value={filterIntern}
                onChange={e => { setFilterIntern(e.target.value); setPage(1); }}
              >
                <option value="all">All Interns</option>
                {team.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            )}
            <select
              className="input md:w-48 text-xs bg-white dark:bg-navy-light"
              value={filterStage}
              onChange={e => { setFilterStage(e.target.value); setPage(1); }}
            >
              <option value="all">All Stages</option>
              {BD_STAGES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {paginated.length === 0 ? (
              <div className="py-12">
                <EmptyState type="leads" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-navy-light text-gray-400 font-semibold border-b border-gray-100 dark:border-navy-light">
                      <th className="p-4">Company</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">City</th>
                      <th className="p-4">Stage</th>
                      {isAdmin() && <th className="p-4">Assigned Intern</th>}
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-light">
                    {paginated.map(c => {
                      const stageCfg = BD_STAGES.find(s => s.id === c.stage) || BD_STAGES[0];
                      const assignedUser = team.find(t => t.id === c.managed_by);
                      
                      const handleInlineEdit = async (id, field, value) => {
                        if (c[field] === value) return; // no change
                        try {
                          await api.patch(`/clients/${id}`, { [field]: value });
                          setClients(prev => prev.map(client => client.id === id ? { ...client, [field]: value } : client));
                          toast.success('Updated successfully');
                        } catch (err) {
                          toast.error('Failed to update field');
                        }
                      };

                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-navy-light/20 transition-colors group">
                          <td className="p-2 border-r border-gray-100 dark:border-navy-light/50">
                            <input
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-purple-500 rounded px-2 py-1 text-navy dark:text-white font-bold"
                              defaultValue={c.company_name}
                              onBlur={(e) => handleInlineEdit(c.id, 'company_name', e.target.value)}
                            />
                          </td>
                          <td className="p-2 border-r border-gray-100 dark:border-navy-light/50">
                            <input
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-purple-500 rounded px-2 py-1 text-gray-600 dark:text-gray-300"
                              defaultValue={c.contact_name}
                              placeholder="N/A"
                              onBlur={(e) => handleInlineEdit(c.id, 'contact_name', e.target.value)}
                            />
                          </td>
                          <td className="p-2 border-r border-gray-100 dark:border-navy-light/50">
                            <input
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-purple-500 rounded px-2 py-1 font-mono text-gray-600 dark:text-gray-300"
                              defaultValue={c.phone}
                              onBlur={(e) => handleInlineEdit(c.id, 'phone', e.target.value)}
                            />
                          </td>
                          <td className="p-2 border-r border-gray-100 dark:border-navy-light/50">
                            <input
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-purple-500 rounded px-2 py-1 text-gray-500"
                              defaultValue={c.city}
                              placeholder="N/A"
                              onBlur={(e) => handleInlineEdit(c.id, 'city', e.target.value)}
                            />
                          </td>
                          <td className="p-2 border-r border-gray-100 dark:border-navy-light/50">
                            <select
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-1 text-[10px] font-semibold"
                              value={c.stage}
                              onChange={(e) => handleInlineEdit(c.id, 'stage', e.target.value)}
                            >
                              {BD_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                          </td>
                          {isAdmin() && (
                            <td className="p-2 border-r border-gray-100 dark:border-navy-light/50">
                              <select
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-1 text-xs text-purple-600 dark:text-purple-400 font-medium"
                                value={c.managed_by || ''}
                                onChange={(e) => handleInlineEdit(c.id, 'managed_by', e.target.value)}
                              >
                                <option value="">Admin (Unassigned)</option>
                                {team.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                              </select>
                            </td>
                          )}
                          <td className="p-2 text-right">
                            <button
                              onClick={() => setLogClient(c)}
                              className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Phone size={10} /> Log Call
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-navy-light p-4 bg-gray-50/50 dark:bg-navy-light/10">
                <p className="text-xs text-gray-400">
                  Showing {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, filtered.length)} of {filtered.length} leads
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 dark:border-navy-light disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 dark:border-navy-light disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXCEL IMPORT TAB */}
      {activeTab === 'import' && isAdmin() && (
        <div className="space-y-6">
          <div className="card p-6 border-dashed border-2 border-purple-200 dark:border-navy-light bg-purple-50/20 dark:bg-navy-light/10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-navy-light flex items-center justify-center mx-auto text-purple-600">
              <Upload size={32} />
            </div>
            <div>
              <h3 className="font-bold text-navy dark:text-white">Upload BDE Calling List</h3>
              <p className="text-xs text-gray-500 mt-1">Upload calling sheet in .xlsx, .xls or .csv format</p>
            </div>
            
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="calling-list-upload"
            />
            <label
              htmlFor="calling-list-upload"
              className="btn-outline inline-flex items-center gap-2 cursor-pointer py-2 px-5 mx-auto"
            >
              <FileSpreadsheet size={16} /> Choose Calling File
            </label>

            {excelFile && (
              <p className="text-xs text-purple-600 font-semibold">
                Selected: {excelFile.name} ({rawData.length} rows detected)
              </p>
            )}
          </div>

          {rawData.length > 0 && (
            <div className="card p-6 space-y-6">
              <div>
                <h3 className="font-bold text-navy dark:text-white">Flexible Column Mapping</h3>
                <p className="text-xs text-gray-500 mt-0.5">Map excel column headers to InternHub lead fields</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Company/Business Name *</label>
                  <select
                    className="input text-xs"
                    value={mapping.company_name}
                    onChange={e => setMapping(m => ({ ...m, company_name: e.target.value }))}
                  >
                    <option value="">-- Map Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Contact Name</label>
                  <select
                    className="input text-xs"
                    value={mapping.contact_name}
                    onChange={e => setMapping(m => ({ ...m, contact_name: e.target.value }))}
                  >
                    <option value="">-- Map Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Phone Number *</label>
                  <select
                    className="input text-xs"
                    value={mapping.phone}
                    onChange={e => setMapping(m => ({ ...m, phone: e.target.value }))}
                  >
                    <option value="">-- Map Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <select
                    className="input text-xs"
                    value={mapping.email}
                    onChange={e => setMapping(m => ({ ...m, email: e.target.value }))}
                  >
                    <option value="">-- Map Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">City / Location</label>
                  <select
                    className="input text-xs"
                    value={mapping.city}
                    onChange={e => setMapping(m => ({ ...m, city: e.target.value }))}
                  >
                    <option value="">-- Map Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Lead Source</label>
                  <select
                    className="input text-xs"
                    value={mapping.source}
                    onChange={e => setMapping(m => ({ ...m, source: e.target.value }))}
                  >
                    <option value="">-- Map Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="label">Remarks / Notes</label>
                  <select
                    className="input text-xs"
                    value={mapping.notes}
                    onChange={e => setMapping(m => ({ ...m, notes: e.target.value }))}
                  >
                    <option value="">-- Map Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Assignment & Submit */}
              <div className="border-t border-gray-100 dark:border-navy-light pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Assign List to:</label>
                  <select
                    className="input text-xs bg-white dark:bg-navy-light py-1.5"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                  >
                    {team.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn-primary w-full md:w-auto py-2.5 px-6"
                >
                  {importing ? 'Importing leads...' : `Import ${rawData.length} Leads`}
                </button>
              </div>

              {/* Data Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Excel Preview (First 5 rows)</h4>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-[11px] border-collapse bg-gray-50/50">
                    <thead>
                      <tr className="bg-gray-100 text-gray-500 font-semibold border-b">
                        {headers.map(h => <th key={h} className="p-3 whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rawData.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {headers.map((h, cIdx) => (
                            <td key={cIdx} className="p-3 text-gray-600 truncate max-w-[150px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OUTREACH TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* WhatsApp templates */}
          <div>
            <h3 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider mb-3">WhatsApp Outreach Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings?.whatsapp_templates && Object.entries(settings.whatsapp_templates).map(([key, val]) => (
                <div key={key} className="card p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="badge bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 capitalize font-bold text-[10px]">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-mono whitespace-pre-wrap select-all bg-gray-50/50 dark:bg-navy p-3 rounded-xl border">
                      {val || 'No template configured'}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(val)}
                    disabled={!val}
                    className="btn-outline w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Copy size={13} /> Copy Template
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Email templates */}
          <div>
            <h3 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider mb-3">Email Outreach Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings?.email_templates && Object.entries(settings.email_templates).map(([key, val]) => (
                <div key={key} className="card p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 capitalize font-bold text-[10px]">
                      {key.replace(/_/g, ' ')} outreach
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-mono whitespace-pre-wrap select-all bg-gray-50/50 dark:bg-navy p-3 rounded-xl border">
                      {val || 'No template configured'}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(val)}
                    disabled={!val}
                    className="btn-outline w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Copy size={13} /> Copy Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      {logClient && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-light rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy dark:text-white text-base">Log Call Outcome</h3>
              <button
                onClick={() => setLogClient(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Recording call with <strong className="text-gray-700 dark:text-white">{logClient.company_name}</strong> ({logClient.contact_name})
            </p>
            <form onSubmit={handleLogCall} className="space-y-4">
              <div>
                <label className="label">Outcome</label>
                <select
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  className="input text-xs"
                >
                  <option value="answered">Answered / Pitched</option>
                  <option value="no_answer">No Answer / Busy</option>
                  <option value="callback">Callback Scheduled</option>
                  <option value="interested">Interested / Lead Qualified</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>
              <div>
                <label className="label">Conversation Notes</label>
                <textarea
                  className="input text-xs resize-none"
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Key discussion points, objections, next steps..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLogClient(null)}
                  className="btn-secondary flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCall}
                  className="btn-primary flex-1 py-2 text-xs"
                >
                  {submittingCall ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
