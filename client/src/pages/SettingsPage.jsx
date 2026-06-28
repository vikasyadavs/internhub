import { useState, useEffect } from 'react';
import {
  Settings, Building2, CreditCard, MessageSquare, Mail, FileText,
  Clock, Save, Upload, ExternalLink, Eye, EyeOff, CheckCircle,
  Globe, FolderOpen, ClipboardList
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'company',   label: 'Company Info',      icon: Building2 },
  { id: 'payment',   label: 'Payment Settings',  icon: CreditCard },
  { id: 'whatsapp',  label: 'WhatsApp Templates', icon: MessageSquare },
  { id: 'email',     label: 'Email Templates',   icon: Mail },
  { id: 'invoice',   label: 'Invoice Settings',  icon: FileText },
  { id: 'hours',     label: 'Working Hours',     icon: Clock },
  { id: 'integrations', label: 'Google Sheets',   icon: Globe },
  { id: 'drive',       label: 'Google Drive',     icon: FolderOpen },
  { id: 'forms',       label: 'Google Forms',     icon: ClipboardList },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving,  setSaving]      = useState(false);
  const [saved,   setSaved]       = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/settings');
        setSettings(res.data.settings || {});
      } catch (_) {
        setSettings({});
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const update = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const updateNested = (parent, field, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: { ...(prev[parent] || {}), [field]: value }
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/settings', settings);
      toast.success('Settings saved!');
      setSaved(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-12 w-64 rounded-xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6 animate-slide-up max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white flex items-center gap-2">
            <Settings size={24} className="text-purple-500" />
            System Settings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage company info, templates, and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <><CheckCircle size={16} /> Saved!</>
          ) : (
            <><Save size={16} /> Save Changes</>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="lg:w-52 shrink-0">
          <div className="card p-2 space-y-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-all text-left ${
                  activeTab === tab.id
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-light hover:text-navy dark:hover:text-white'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 card space-y-6 animate-fade-in">

          {/* ── COMPANY INFO ── */}
          {activeTab === 'company' && (
            <div className="space-y-5">
              <SectionHeader icon={Building2} title="Company Information" desc="Logos and branding used in generated PDF documents" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LogoUpload
                  label="SI Placements Logo"
                  sub="Used on offer letters and certificates"
                  value={settings.si_logo_url}
                  onChange={v => update('si_logo_url', v)}
                />
                <LogoUpload
                  label="Site4People Logo"
                  sub="Used on Site4People branded documents"
                  value={settings.s4p_logo_url}
                  onChange={v => update('s4p_logo_url', v)}
                />
              </div>
            </div>
          )}

          {/* ── PAYMENT SETTINGS ── */}
          {activeTab === 'payment' && (
            <div className="space-y-5">
              <SectionHeader icon={CreditCard} title="Payment Settings" desc="UPI QR code and payment links shown on invoices" />

              <div>
                <label className="label">Cashfree / Payment Link</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={settings.cashfree_link || ''}
                    onChange={e => update('cashfree_link', e.target.value)}
                    placeholder="https://payments.cashfree.com/forms/..."
                    className="input flex-1"
                  />
                  {settings.cashfree_link && (
                    <a href={settings.cashfree_link} target="_blank" rel="noreferrer" className="btn-outline px-3">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">This link appears as a "Pay Online" button on invoices</p>
              </div>

              <div>
                <label className="label">UPI QR Code Image URL</label>
                <input
                  type="url"
                  value={settings.upi_qr_url || ''}
                  onChange={e => update('upi_qr_url', e.target.value)}
                  placeholder="https://example.com/upi-qr.png"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">Paste a public URL of the UPI QR code image to embed on invoices</p>
                {settings.upi_qr_url && (
                  <img src={settings.upi_qr_url} alt="UPI QR Preview" className="mt-3 w-32 h-32 object-contain border border-gray-200 rounded-xl p-2" />
                )}
              </div>
            </div>
          )}

          {/* ── WHATSAPP TEMPLATES ── */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-5">
              <SectionHeader icon={MessageSquare} title="WhatsApp Templates" desc="Templates used by the Recruitment team for candidate communication. Use {name}, {position}, {date}, {time} as placeholders." />

              {['interview_confirmation', 'follow_up', 'offer_intimation'].map(key => (
                <div key={key}>
                  <label className="label capitalize">{key.replace(/_/g, ' ')}</label>
                  <textarea
                    rows={4}
                    value={settings.whatsapp_templates?.[key] || ''}
                    onChange={e => updateNested('whatsapp_templates', key, e.target.value)}
                    className="input resize-none"
                    placeholder={`Write your ${key.replace(/_/g, ' ')} template...`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Available vars: <span className="font-mono text-purple-600">{'{name}'} {'{position}'} {'{date}'} {'{time}'}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── EMAIL TEMPLATES ── */}
          {activeTab === 'email' && (
            <div className="space-y-5">
              <SectionHeader icon={Mail} title="Email Templates" desc="Templates used by the BD team for client outreach. Use {client_name}, {intern_name}, {service} as placeholders." />

              {['intro', 'follow_up', 'proposal'].map(key => (
                <div key={key}>
                  <label className="label capitalize">{key.replace(/_/g, ' ')} Email</label>
                  <textarea
                    rows={6}
                    value={settings.email_templates?.[key] || ''}
                    onChange={e => updateNested('email_templates', key, e.target.value)}
                    className="input resize-none font-mono text-xs"
                    placeholder={`Write your ${key.replace(/_/g, ' ')} email template...`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Available vars: <span className="font-mono text-purple-600">{'{client_name}'} {'{intern_name}'} {'{service}'}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── INVOICE SETTINGS ── */}
          {activeTab === 'invoice' && (
            <div className="space-y-5">
              <SectionHeader icon={FileText} title="Invoice Settings" desc="Configure invoice numbering and tax settings" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label">Invoice Number Prefix</label>
                  <input
                    type="text"
                    value={settings.invoice_prefix || 'S4P'}
                    onChange={e => update('invoice_prefix', e.target.value.toUpperCase())}
                    placeholder="S4P"
                    className="input"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-400 mt-1">Invoices will be numbered: S4P-001, S4P-002...</p>
                </div>
                <div>
                  <label className="label">Starting Invoice Number</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.invoice_start || 1}
                    onChange={e => update('invoice_start', parseInt(e.target.value))}
                    className="input"
                  />
                  <p className="text-xs text-gray-400 mt-1">The first invoice will use this number</p>
                </div>
                <div>
                  <label className="label">SI Placements GST Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={settings.si_gst || ''}
                    onChange={e => update('si_gst', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    className="input font-mono"
                    maxLength={15}
                  />
                </div>
                <div>
                  <label className="label">Site4People GST Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={settings.s4p_gst || ''}
                    onChange={e => update('s4p_gst', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    className="input font-mono"
                    maxLength={15}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 dark:bg-navy rounded-xl border border-gray-200 dark:border-navy-light">
                <p className="text-xs font-semibold text-gray-500 mb-1">Invoice Number Preview</p>
                <p className="text-xl font-bold text-navy dark:text-white font-mono">
                  {settings.invoice_prefix || 'S4P'}-{String(settings.invoice_start || 1).padStart(3, '0')}
                </p>
              </div>
            </div>
          )}

          {/* ── WORKING HOURS ── */}
          {activeTab === 'hours' && (
            <div className="space-y-5">
              <SectionHeader icon={Clock} title="Working Hours" desc="Company-wide working hours policy (display only)" />

              <div className="p-6 bg-gradient-card border border-purple-100 dark:border-purple-900/20 rounded-2xl text-center space-y-3">
                <Clock size={32} className="mx-auto text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-navy dark:text-white">10:00 AM – 7:00 PM</p>
                  <p className="text-gray-500 font-medium">Monday to Saturday</p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl text-sm font-semibold">
                  Sunday — Office Closed
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/20 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> Working hours are fixed at 10 AM–7 PM, Mon–Sat. Individual interns may have custom timings set in their profile.
                </p>
              </div>
            </div>
          )}

          {/* ── GOOGLE INTEGRATIONS ── */}
          {activeTab === 'integrations' && (
            <div className="space-y-5">
              <SectionHeader icon={Globe} title="Google Sheets Integration" desc="Embed shared or team Google Sheets directly in the workspace" />
              <div>
                <label className="label">Google Sheet Web Embed URL</label>
                <input
                  type="url"
                  value={settings.google_sheets_url || ''}
                  onChange={e => update('google_sheets_url', e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../pubhtml"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">Copy the link from: File &gt; Share &gt; Publish to web &gt; Embed</p>
                {settings.google_sheets_url && (
                  <iframe src={settings.google_sheets_url} title="Google Sheets Preview" className="w-full mt-4 rounded-2xl border border-gray-200" style={{height:'350px'}} />
                )}
              </div>
            </div>
          )}

          {/* ── GOOGLE DRIVE ── */}
          {activeTab === 'drive' && (
            <div className="space-y-5">
              <SectionHeader icon={FolderOpen} title="Google Drive Integration" desc="Link shared folders for team assets" />
              <div>
                <label className="label">Google Drive Embedded Folder URL</label>
                <input
                  type="url"
                  value={settings.google_drive_url || ''}
                  onChange={e => update('google_drive_url', e.target.value)}
                  placeholder="https://drive.google.com/embeddedfolderview?id=FOLDER_ID"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">Format: <code>https://drive.google.com/embeddedfolderview?id=YOUR_FOLDER_ID</code></p>
                {settings.google_drive_url && (
                  <iframe src={settings.google_drive_url} title="Google Drive Preview" className="w-full mt-4 rounded-2xl border border-gray-200" style={{height:'350px'}} />
                )}
              </div>
            </div>
          )}

          {/* ── GOOGLE FORMS ── */}
          {activeTab === 'forms' && (
            <div className="space-y-5">
              <SectionHeader icon={ClipboardList} title="Google Forms Integration" desc="Embed standard feedback or response forms" />
              <div>
                <label className="label">Google Forms Embed link</label>
                <input
                  type="url"
                  value={settings.google_forms_url || ''}
                  onChange={e => update('google_forms_url', e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">Copy the source link from form's Send &gt; Embed HTML dialog</p>
                {settings.google_forms_url && (
                  <iframe src={settings.google_forms_url} title="Google Forms Preview" className="w-full mt-4 rounded-2xl border border-gray-200" style={{height:'350px'}} />
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }) {
  return (
    <div className="pb-4 border-b border-gray-100 dark:border-navy-light">
      <h2 className="font-bold text-navy dark:text-white flex items-center gap-2">
        <Icon size={18} className="text-purple-500" />
        {title}
      </h2>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </div>
  );
}

function LogoUpload({ label, sub, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{sub}</p>
      <input
        type="url"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="https://example.com/logo.png"
        className="input"
      />
      {value && (
        <div className="mt-2 p-3 border border-gray-200 dark:border-navy-light rounded-xl bg-gray-50 dark:bg-navy flex items-center gap-3">
          <img src={value} alt={label} className="h-12 w-auto object-contain" onError={e => e.target.style.display='none'} />
          <p className="text-xs text-gray-500 truncate">{value}</p>
        </div>
      )}
    </div>
  );
}
