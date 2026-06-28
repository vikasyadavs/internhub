import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, FolderOpen, ClipboardList, Mail, ExternalLink, RefreshCw, HelpCircle, AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

function getSafeUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  // Extract src if full <iframe> tag was pasted
  if (clean.startsWith('<iframe')) {
    const m = clean.match(/src="([^"]+)"/);
    if (m) clean = m[1];
  }
  // Add https if missing
  if (clean && !clean.startsWith('http')) {
    clean = `https://${clean.replace(/^\/+/, '')}`;
  }
  // Google Drive folders → embeddedfolderview
  const driveMatch = clean.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/embeddedfolderview?id=${driveMatch[1]}#list`;
  }
  // Google Sheets /edit → minimal edit mode
  if (clean.includes('docs.google.com/spreadsheets') && clean.includes('/edit')) {
    return clean.replace(/\/edit.*$/, '/edit?rm=minimal');
  }
  // Google Forms → viewform embedded
  if (clean.includes('docs.google.com/forms') && clean.includes('/edit')) {
    return clean.replace(/\/edit.*$/, '/viewform?embedded=true');
  }
  if (clean.includes('docs.google.com/forms') && !clean.includes('embedded=true')) {
    return clean + (clean.includes('?') ? '&' : '?') + 'embedded=true';
  }
  return clean;
}

export default function GoogleIntegrationsPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('sheets');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sheetsUrl, setSheetsUrl] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [formsUrl, setFormsUrl] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      const s = res.data.settings || {};
      setSettings(s);
      setSheetsUrl(s.google_sheets_url || '');
      setDriveUrl(s.google_drive_url || '');
      setFormsUrl(s.google_forms_url || '');
    } catch (_) {
      toast.error('Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async (field, value) => {
    setSaving(true);
    try {
      await api.patch('/settings', { [field]: value });
      toast.success('Link saved!');
    } catch {
      toast.error('Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  const tabs = [
    { id: 'sheets', label: 'Google Sheets', icon: Globe },
    { id: 'drive',  label: 'Google Drive',  icon: FolderOpen },
    { id: 'forms',  label: 'Google Forms',  icon: ClipboardList },
    { id: 'gmail',  label: 'Gmail',         icon: Mail },
  ];

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white flex items-center gap-2">
            <Globe className="text-purple-500" size={24} />
            Google Workspace
          </h1>
          <p className="text-sm text-gray-500">Embed and interact with your Google tools directly inside InternHub</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white dark:bg-navy-light rounded-xl p-1 border border-gray-100 dark:border-navy-light shadow-sm flex-wrap gap-0.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === t.id
                  ? 'bg-navy text-white dark:bg-purple-600'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Main iframe area ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Google Sheets */}
          {activeTab === 'sheets' && (
            getSafeUrl(sheetsUrl) ? (
              <div className="card overflow-hidden p-0 border border-gray-200 shadow-lg">
                <div className="p-3 bg-slate-50 dark:bg-navy-light border-b flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-600 dark:text-white">Google Sheets</span>
                  <a href={getSafeUrl(sheetsUrl)} target="_blank" rel="noreferrer"
                    className="text-purple-600 hover:underline flex items-center gap-1 font-semibold">
                    Open Externally <ExternalLink size={12} />
                  </a>
                </div>
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-[11px] text-amber-700 flex items-center gap-2">
                  <AlertCircle size={12} />
                  If you see "You need access", go to your Sheet → <strong>Share → Anyone with the link → Editor</strong>
                </div>
                <iframe
                  key={sheetsUrl}
                  src={getSafeUrl(sheetsUrl)}
                  title="Google Sheets"
                  className="w-full border-none"
                  style={{ height: 620 }}
                  allow="autoplay"
                />
              </div>
            ) : (
              <div className="card p-12 text-center space-y-3">
                <span className="text-4xl">📊</span>
                <h3 className="font-bold text-navy dark:text-white text-lg">No Sheet Configured</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Paste your Google Sheets link in the sidebar and save.
                </p>
              </div>
            )
          )}

          {/* Google Drive */}
          {activeTab === 'drive' && (
            getSafeUrl(driveUrl) ? (
              <div className="card overflow-hidden p-0 border border-gray-200 shadow-lg">
                <div className="p-3 bg-slate-50 dark:bg-navy-light border-b flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-600 dark:text-white">Google Drive Folder</span>
                  <a href={getSafeUrl(driveUrl)} target="_blank" rel="noreferrer"
                    className="text-purple-600 hover:underline flex items-center gap-1 font-semibold">
                    Open in Drive <ExternalLink size={12} />
                  </a>
                </div>
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-[11px] text-amber-700 flex items-center gap-2">
                  <AlertCircle size={12} />
                  If you see "You need access", share the folder as <strong>Anyone with the link → Viewer</strong>.
                  Clicking files inside will open in a new tab (Google security rule — cannot be changed).
                </div>
                <iframe
                  key={driveUrl}
                  src={getSafeUrl(driveUrl)}
                  title="Google Drive"
                  className="w-full border-none"
                  style={{ height: 620 }}
                  allow="autoplay"
                />
              </div>
            ) : (
              <div className="card p-12 text-center space-y-3">
                <span className="text-4xl">📁</span>
                <h3 className="font-bold text-navy dark:text-white text-lg">No Drive Folder Configured</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Paste your Google Drive folder link in the sidebar and save.
                </p>
              </div>
            )
          )}

          {/* Google Forms */}
          {activeTab === 'forms' && (
            getSafeUrl(formsUrl) ? (
              <div className="card overflow-hidden p-0 border border-gray-200 shadow-lg">
                <div className="p-3 bg-slate-50 dark:bg-navy-light border-b flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-600 dark:text-white">Google Forms</span>
                  <a href={formsUrl} target="_blank" rel="noreferrer"
                    className="text-purple-600 hover:underline flex items-center gap-1 font-semibold">
                    Open in Google <ExternalLink size={12} />
                  </a>
                </div>
                <iframe
                  key={formsUrl}
                  src={getSafeUrl(formsUrl)}
                  title="Google Form"
                  className="w-full border-none"
                  style={{ height: 650 }}
                />
              </div>
            ) : (
              <div className="card p-12 text-center space-y-3">
                <span className="text-4xl">📝</span>
                <h3 className="font-bold text-navy dark:text-white text-lg">No Form Configured</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Paste your Google Form link in the sidebar and save.
                </p>
              </div>
            )
          )}

          {/* Gmail */}
          {activeTab === 'gmail' && (
            <div className="card p-12 text-center space-y-4 border-2 border-dashed border-blue-200 bg-blue-50/10">
              <span className="text-4xl">📧</span>
              <h3 className="font-bold text-navy dark:text-white text-xl">Gmail Access</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                Google blocks direct Gmail embedding in all external portals for security. Use the
                built-in Email Composer to draft and send emails via Gmail.
              </p>
              <div className="flex gap-4 justify-center flex-wrap mt-2">
                <Link to="/email-composer" className="btn-secondary flex items-center gap-2">
                  <Mail size={16} /> Open Email Composer
                </Link>
                <a href="https://mail.google.com" target="_blank" rel="noreferrer"
                  className="btn-outline flex items-center gap-2">
                  <ExternalLink size={16} /> Open Gmail in Browser
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">

          {/* URL Config (admin only) */}
          {isAdmin() && (
            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-navy dark:text-white text-sm">Link Manager</h3>

              {activeTab === 'sheets' && (
                <div className="space-y-3">
                  <div>
                    <label className="label text-[10px]">Google Sheets URL</label>
                    <input
                      type="text" value={sheetsUrl}
                      onChange={e => setSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      className="input py-2 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => handleSaveUrl('google_sheets_url', sheetsUrl)}
                    disabled={saving}
                    className="btn-primary w-full py-2 text-xs"
                  >
                    {saving ? 'Saving...' : 'Save & Load Sheet'}
                  </button>
                </div>
              )}

              {activeTab === 'drive' && (
                <div className="space-y-3">
                  <div>
                    <label className="label text-[10px]">Google Drive Folder URL</label>
                    <input
                      type="text" value={driveUrl}
                      onChange={e => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="input py-2 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => handleSaveUrl('google_drive_url', driveUrl)}
                    disabled={saving}
                    className="btn-primary w-full py-2 text-xs"
                  >
                    {saving ? 'Saving...' : 'Save & Load Drive'}
                  </button>
                </div>
              )}

              {activeTab === 'forms' && (
                <div className="space-y-3">
                  <div>
                    <label className="label text-[10px]">Google Forms URL</label>
                    <input
                      type="text" value={formsUrl}
                      onChange={e => setFormsUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/.../viewform"
                      className="input py-2 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => handleSaveUrl('google_forms_url', formsUrl)}
                    disabled={saving}
                    className="btn-primary w-full py-2 text-xs"
                  >
                    {saving ? 'Saving...' : 'Save & Load Form'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* How-to guide */}
          <div className="card p-5 space-y-3 bg-purple-50/20 border-purple-100 dark:bg-navy-light/10">
            <div className="flex items-center gap-2 text-purple-600">
              <HelpCircle size={16} />
              <h4 className="font-bold text-xs uppercase tracking-wider">How to Setup</h4>
            </div>

            {activeTab === 'sheets' && (
              <ol className="list-decimal pl-4 text-[11px] text-gray-500 space-y-2 leading-relaxed">
                <li>Open your Google Sheet</li>
                <li>Click <strong>Share → Anyone with the link → Editor</strong></li>
                <li>Copy the URL from your browser address bar</li>
                <li>Paste it in the Link Manager above and save</li>
              </ol>
            )}
            {activeTab === 'drive' && (
              <ol className="list-decimal pl-4 text-[11px] text-gray-500 space-y-2 leading-relaxed">
                <li>Open your Google Drive folder</li>
                <li>Click <strong>Share → Anyone with the link → Viewer</strong></li>
                <li>Copy the folder URL from your browser</li>
                <li>Paste it above and save</li>
              </ol>
            )}
            {activeTab === 'forms' && (
              <ol className="list-decimal pl-4 text-[11px] text-gray-500 space-y-2 leading-relaxed">
                <li>Open your Google Form</li>
                <li>Click <strong>Send → Link icon</strong></li>
                <li>Copy the link and paste it above</li>
              </ol>
            )}
          </div>

          {/* Warning */}
          <div className="card p-4 bg-amber-50/60 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
            <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed font-medium flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              All Google files <strong>must</strong> be shared as <strong>"Anyone with the link"</strong>.
              Private files always show "You need access".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
