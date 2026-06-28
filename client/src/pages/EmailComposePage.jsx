import { useState, useEffect, useRef } from 'react';
import { 
  Mail, Send, Copy, Clock, Search, User, Briefcase, FileText, Sparkles, HelpCircle 
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function EmailComposePage() {
  const { user } = useAuth();
  const bodyRef = useRef(null);

  // Form states
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Dropdown Autocomplete
  const [contacts, setContacts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Templates & Sent History
  const [settings, setSettings] = useState(null);
  const [sentHistory, setSentHistory] = useState([]);

  useEffect(() => {
    fetchData();
    // Load sent history from local storage
    const history = localStorage.getItem('internhub_sent_emails');
    if (history) {
      try {
        setSentHistory(JSON.parse(history));
      } catch (_) {}
    }
  }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, teamRes, settingsRes] = await Promise.all([
        api.get('/clients'),
        api.get('/users/team'),
        api.get('/settings').catch(() => ({ data: { settings: {} } }))
      ]);

      const clientContacts = (clientsRes.data.clients || []).map(c => ({
        name: c.contact_name || c.company_name,
        email: c.email || '',
        type: 'client',
        company: c.company_name
      })).filter(c => c.email);

      const teamContacts = (teamRes.data.users || []).map(t => ({
        name: t.full_name,
        email: t.email || `${t.username}@internhub.com`,
        type: 'intern',
        company: t.company === 'site4people' ? 'Site4People' : 'SI Placements'
      }));

      setContacts([...clientContacts, ...teamContacts]);
      setSettings(settingsRes.data.settings || {});
    } catch (err) {
      toast.error('Failed to load recipients or templates');
    }
  };

  // Handle autocomplete input
  const handleToChange = (val) => {
    setTo(val);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = contacts.filter(c => 
      c.name.toLowerCase().includes(val.toLowerCase()) || 
      c.email.toLowerCase().includes(val.toLowerCase()) ||
      c.company?.toLowerCase().includes(val.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 5));
    setShowSuggestions(true);
  };

  const selectSuggestion = (s) => {
    setTo(`${s.name} <${s.email}>`);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Insert variable at cursor
  const insertVariable = (variable) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentText = textarea.value;
    
    const newText = currentText.substring(0, startPos) + variable + currentText.substring(endPos);
    setBody(newText);
    
    // Reset focus and cursor position after render
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = startPos + variable.length;
      textarea.selectionEnd = startPos + variable.length;
    }, 0);
  };

  // Apply templates
  const handleTemplateChange = (key) => {
    setSelectedTemplate(key);
    if (!key) return;

    const templateText = settings?.email_templates?.[key];
    if (templateText) {
      // Auto replace some basic tags if possible
      let processedText = templateText
        .replace(/{intern_name}/g, user?.full_name || 'Intern')
        .replace(/{service}/g, 'IT Placement / Web Development services');
      setBody(processedText);
      setSubject(`Inquiry: SI Placements & Site4People Outreach`);
    }
  };

  const handleOpenGmail = () => {
    if (!to) return toast.error('Recipient email address required');
    
    // Extract email from "Name <email>" format if needed
    let emailOnly = to;
    const emailMatch = to.match(/<(.+?)>/);
    if (emailMatch) emailOnly = emailMatch[1];

    const mailtoUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailOnly)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');

    // Add to Sent History
    const newSentItem = {
      id: Date.now(),
      to,
      subject,
      bodyPreview: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
      date: new Date().toLocaleString()
    };
    const updatedHistory = [newSentItem, ...sentHistory.slice(0, 9)];
    setSentHistory(updatedHistory);
    localStorage.setItem('internhub_sent_emails', JSON.stringify(updatedHistory));
    toast.success('Gmail composition window opened! 🚀');
  };

  const handleCopyBody = () => {
    if (!body.trim()) return toast.error('Email body is empty');
    navigator.clipboard.writeText(body);
    toast.success('Email content copied to clipboard! 📋');
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy dark:text-white flex items-center gap-2">
          <Mail className="text-purple-500" size={24} />
          Email Composer
        </h1>
        <p className="text-sm text-gray-500">Draft outreach mails, use templates, and send via secure external redirect</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer Form (Left 2 Columns) */}
        <div className="lg:col-span-2 card p-6 space-y-4 relative">
          <div className="flex items-center justify-between border-b pb-3 mb-2">
            <h3 className="font-bold text-navy dark:text-white flex items-center gap-1.5">
              <Sparkles size={16} className="text-yellow-500" />
              Outreach Draft
            </h3>
            
            {/* Template Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold">Template:</span>
              <select
                value={selectedTemplate}
                onChange={e => handleTemplateChange(e.target.value)}
                className="input py-1 text-xs bg-white dark:bg-navy border-gray-200 w-44"
              >
                <option value="">-- No Template --</option>
                {settings?.email_templates && Object.keys(settings.email_templates).map(key => (
                  <option key={key} value={key}>
                    {key.replace(/_/g, ' ').toUpperCase()} Email
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="relative">
              <label className="label">To (Recipient) *</label>
              <input
                type="text"
                value={to}
                onChange={e => handleToChange(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                placeholder="Search by client name, intern name or paste raw email..."
                className="input"
              />
              
              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-navy-light border border-gray-200 dark:border-navy-light rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 dark:divide-navy">
                  {suggestions.map(s => (
                    <button
                      key={s.email}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left p-3 hover:bg-purple-50/50 dark:hover:bg-navy flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-navy text-purple-600 flex items-center justify-center font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-white">{s.name}</p>
                          <p className="text-gray-400">{s.email}</p>
                        </div>
                      </div>
                      <span className="badge bg-slate-100 text-slate-600 capitalize font-medium">{s.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter email subject line..."
                className="input"
              />
            </div>

            {/* Variable insertion toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap border-y py-2.5 my-1">
              <span className="text-[11px] font-bold text-gray-400 mr-2">INSERT VARIABLE:</span>
              <button
                type="button"
                onClick={() => insertVariable('{client_name}')}
                className="badge bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200/50 py-1 transition-colors"
              >
                Client Name
              </button>
              <button
                type="button"
                onClick={() => insertVariable('{intern_name}')}
                className="badge bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200/50 py-1 transition-colors"
              >
                Intern Name
              </button>
              <button
                type="button"
                onClick={() => insertVariable('{service}')}
                className="badge bg-yellow-50 hover:bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200/50 py-1 transition-colors"
              >
                Service / Position
              </button>
            </div>

            <div>
              <label className="label">Message Body</label>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={12}
                placeholder="Write your email body here or select a template..."
                className="input font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCopyBody}
                type="button"
                className="btn-outline flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Copy size={14} /> Copy Draft Content
              </button>
              <button
                onClick={handleOpenGmail}
                type="button"
                className="btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Send size={14} /> Open Gmail Composer
              </button>
            </div>
          </div>
        </div>

        {/* Sent History & Help (Right Column) */}
        <div className="space-y-6">
          {/* Email security note */}
          <div className="card p-5 bg-blue-50/30 border-blue-100 dark:bg-navy-light/10 dark:border-navy-light space-y-3">
            <div className="flex items-center gap-2 text-blue-600">
              <HelpCircle size={18} />
              <h4 className="font-bold text-sm">Secure Email Notice</h4>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Google blocks direct site embeds (X-Frame-Options) for security. When you click <strong>Open Gmail</strong>, InternHub securely opens a new tab directed to your personal Gmail drafting editor prefilled with your message.
            </p>
          </div>

          {/* Sent History */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <Clock size={16} className="text-purple-500" />
              <h3 className="font-bold text-navy dark:text-white text-sm">Draft History</h3>
            </div>

            {sentHistory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No drafts sent this session</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {sentHistory.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 dark:bg-navy rounded-xl border hover:border-purple-200 transition-colors text-left space-y-1 cursor-pointer"
                    onClick={() => {
                      setTo(item.to);
                      setSubject(item.subject);
                      setBody(item.body || '');
                      toast.success('Draft loaded back to composer!');
                    }}
                  >
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 truncate">
                      To: {item.to}
                    </p>
                    <p className="text-xs font-bold text-gray-700 dark:text-white truncate">
                      {item.subject || '(No Subject)'}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {item.bodyPreview}
                    </p>
                    <p className="text-[9px] text-gray-400 text-right mt-1">
                      {item.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
