import { useState, useEffect } from 'react';
import { FileDown, Plus, X, Download, Users } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image
} from '@react-pdf/renderer';

// ─── Company Info ────────────────────────────────────────────────────────────────
const COMPANY_INFO = {
  si_placements: {
    name: 'SI Placements Internationals',
    shortName: 'SI Placements Internationals',
    address: '204, Akshar Matrix, Odhav S.P Ringroad, Ahmedabad – 382415',
    phone: '+91 6358845533',
    email: 'info@siinternationals.com',
    website: 'siinternationals.com',
    signatory: 'Soumita Das',
    signatoryTitle: 'Partner',
    showSignatoryName: true,
    parentCompany: null,
  },
  site4people: {
    name: 'Site4People',
    shortName: 'Site4People',
    address: '541, Krupal Pathshala City Centre, Asharam Road, Ahmedabad – 380014',
    phone: '+91 9898767870',
    email: 'info@site4people.com',
    website: 'www.site4people.com',
    signatory: 'Authorised Signatory',
    signatoryTitle: 'Site4People',
    showSignatoryName: false,
    parentCompany: 'Powered by SI Placements Internationals',
  },
};

// ─── PDF Styles ────────────────────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: { padding: 45, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 24, paddingBottom: 18, borderBottomWidth: 2, borderBottomColor: '#7C3AED',
  },
  logoImg: { width: 52, height: 52, marginRight: 10 },
  logoBlock: { flexDirection: 'row', alignItems: 'flex-start' },
  logoText: { flexDirection: 'column', justifyContent: 'center' },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0F172A' },
  tagline: { fontSize: 8, color: '#64748B', marginTop: 2 },
  addressLine: { fontSize: 7.5, color: '#94A3B8', marginTop: 1 },

  docTypeBlock: { alignItems: 'flex-end' },
  docType: { fontSize: 10, color: '#7C3AED', fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  refNo: { fontSize: 7.5, color: '#94A3B8', marginTop: 3, textAlign: 'right' },

  // Body
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#0F172A', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 10, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  body: { fontSize: 10.5, color: '#334155', lineHeight: 1.8 },
  bold: { fontFamily: 'Helvetica-Bold', color: '#0F172A' },
  highlight: { fontFamily: 'Helvetica-Bold', color: '#7C3AED' },
  section: { marginBottom: 14 },

  detailsBox: {
    backgroundColor: '#F8FAFC', borderRadius: 6, padding: 14,
    marginVertical: 18, borderLeftWidth: 3, borderLeftColor: '#7C3AED',
  },
  detailRow: { flexDirection: 'row', marginBottom: 7 },
  detailLabel: { fontSize: 8.5, color: '#64748B', width: 130, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  detailValue: { fontSize: 9.5, color: '#0F172A', flex: 1, fontFamily: 'Helvetica-Bold' },

  // Signatures
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40 },
  sigBlock: { alignItems: 'center', width: 190 },
  stampImg: { width: 90, height: 70, marginBottom: 4 },
  sigLine: { borderTopWidth: 1, borderTopColor: '#CBD5E1', width: '100%', marginBottom: 5 },
  sigName: { fontSize: 9, color: '#0F172A', fontFamily: 'Helvetica-Bold' },
  sigTitle: { fontSize: 7.5, color: '#64748B' },
  sigContact: { fontSize: 7, color: '#94A3B8', marginTop: 1 },

  internSigBlock: { alignItems: 'center', width: 150 },

  // Footer
  footer: {
    position: 'absolute', bottom: 28, left: 45, right: 45,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { fontSize: 7.5, color: '#94A3B8' },
  footerBrand: { fontSize: 7.5, color: '#7C3AED', fontFamily: 'Helvetica-Bold' },
});

// ─── Shared Header Component ─────────────────────────────────────────────────
function PDFHeader({ companyKey, docTypeLabel, refNo, issueDate }) {
  const info = COMPANY_INFO[companyKey] || COMPANY_INFO.si_placements;
  return (
    <View style={pdfStyles.header}>
      <View style={pdfStyles.logoBlock}>
        <Image src={window.location.origin + '/logo.png'} style={pdfStyles.logoImg} />
        <View style={pdfStyles.logoText}>
          <Text style={pdfStyles.companyName}>{info.name}</Text>
          {info.parentCompany && <Text style={pdfStyles.tagline}>{info.parentCompany}</Text>}
          <Text style={pdfStyles.addressLine}>{info.address}</Text>
          <Text style={pdfStyles.addressLine}>{info.phone}  |  {info.email}</Text>
          <Text style={pdfStyles.addressLine}>{info.website}</Text>
        </View>
      </View>
      <View style={pdfStyles.docTypeBlock}>
        <Text style={pdfStyles.docType}>{docTypeLabel}</Text>
        <Text style={pdfStyles.refNo}>Ref: {refNo}</Text>
        <Text style={pdfStyles.refNo}>Date: {issueDate}</Text>
      </View>
    </View>
  );
}

// ─── Shared Signature Block ───────────────────────────────────────────────────
function PDFSignatures({ companyKey }) {
  const info = COMPANY_INFO[companyKey] || COMPANY_INFO.si_placements;
  return (
    <View style={{ marginTop: 25, position: 'relative' }}>
      {/* Stamp overlap - positioned on top of the signature line */}
      <View style={{ position: 'absolute', top: -35, left: 20, zIndex: 10 }}>
        <Image src={window.location.origin + '/stamp.jpg'} style={{ width: 110, height: 75, objectFit: 'contain' }} />
      </View>
      
      {/* Signature Line */}
      <View style={{ borderTopWidth: 1, borderTopColor: '#CBD5E1', width: 180, marginTop: 45, marginBottom: 5 }} />
      {info.showSignatoryName && (
        <Text style={pdfStyles.sigName}>{info.signatory}</Text>
      )}
      <Text style={pdfStyles.sigTitle}>{info.signatoryTitle}</Text>
      {info.showSignatoryName && (
        <Text style={pdfStyles.sigContact}>{info.phone}</Text>
      )}
      <Text style={[pdfStyles.sigTitle, { marginTop: 2 }]}>For {info.name}</Text>
    </View>
  );
}

// ─── Shared Footer ────────────────────────────────────────────────────────────
function PDFFooter({ companyKey, refNo, issueDate }) {
  const info = COMPANY_INFO[companyKey] || COMPANY_INFO.si_placements;
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>{info.address}  |  {info.phone}</Text>
      <Text style={pdfStyles.footerBrand}>{info.name}</Text>
    </View>
  );
}

// ─── Offer Letter PDF ────────────────────────────────────────────────────────
function OfferLetterPDF({ intern, generatedAt, metadata }) {
  const companyKey = intern?.company || 'si_placements';
  const info = COMPANY_INFO[companyKey];
  const role = intern?.custom_position || intern?.role?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase());
  const dept = intern?.department || 'General';
  const mode = intern?.internship_mode ? intern.internship_mode.charAt(0).toUpperCase() + intern.internship_mode.slice(1) : 'Full Time';
  const startDate = intern?.batch_start ? format(parseISO(intern.batch_start), 'MMMM d, yyyy') : '—';
  const endDate = intern?.batch_end ? format(parseISO(intern.batch_end), 'MMMM d, yyyy') : '—';
  const issueDate = generatedAt ? format(new Date(generatedAt), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy');
  const refNo = `${info.name.replace(/\s+/g, '').toUpperCase().slice(0, 3)}-OL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PDFHeader companyKey={companyKey} docTypeLabel="OFFER LETTER" refNo={refNo} issueDate={issueDate} />

        <Text style={pdfStyles.title}>Internship Offer Letter</Text>
        <Text style={pdfStyles.subtitle}>We are pleased to offer you this internship opportunity</Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.body}>Dear <Text style={pdfStyles.bold}>{intern?.full_name || 'Candidate'}</Text>,</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.body}>
            We are delighted to extend this offer of an internship at{' '}
            <Text style={pdfStyles.highlight}>{info.name}</Text>. After careful consideration of your profile and interview performance, we believe you will be a valuable addition to our team.
          </Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.body}>
            This letter confirms your selection for the following internship position. Please review the details below and feel free to reach out to us should you have any questions.
          </Text>
        </View>

        {/* Details Box */}
        <View style={pdfStyles.detailsBox}>
          <Text style={[pdfStyles.bold, { fontSize: 10, marginBottom: 10, color: '#7C3AED' }]}>Internship Details</Text>
          {[
            { label: 'Intern Name', value: intern?.full_name || '—' },
            { label: 'Position / Role', value: role || '—' },
            { label: 'Department', value: dept },
            { label: 'Internship Mode', value: mode },
            { label: 'Organisation', value: info.name },
            { label: 'Office Address', value: info.address },
            { label: 'Start Date', value: startDate },
            { label: 'End Date', value: endDate },
            { label: 'Duration', value: '2 Months (60 Working Days)' },
            { label: 'Working Hours', value: intern?.custom_timing || '10:00 AM – 7:00 PM, Mon–Sat' },
            { label: 'Stipend', value: metadata?.stipend || intern?.stipend || 'N/A' },
            { label: 'Travel Allowance', value: intern?.travel_allowance || 'N/A' },
          ].map(d => (
            <View key={d.label} style={pdfStyles.detailRow}>
              <Text style={pdfStyles.detailLabel}>{d.label}</Text>
              <Text style={pdfStyles.detailValue}>{d.value}</Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.body}>
            By accepting this offer, you agree to adhere to all company policies, maintain confidentiality of proprietary information, and conduct yourself professionally throughout the internship period.
          </Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.body}>
            We look forward to welcoming you to the team and are confident this experience will be mutually beneficial and rewarding.
          </Text>
        </View>

        <View style={[pdfStyles.section, { marginTop: 6 }]}>
          <Text style={pdfStyles.body}>Warm regards,</Text>
        </View>

        <PDFSignatures companyKey={companyKey} />
        <PDFFooter companyKey={companyKey} refNo={refNo} issueDate={issueDate} />
      </Page>
    </Document>
  );
}

// ─── Completion Certificate PDF ──────────────────────────────────────────────
function CertificatePDF({ intern, generatedAt, metadata }) {
  const companyKey = intern?.company || 'si_placements';
  const info = COMPANY_INFO[companyKey];
  const role = intern?.custom_position || intern?.role?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase());
  const mode = intern?.internship_mode ? intern.internship_mode.charAt(0).toUpperCase() + intern.internship_mode.slice(1) : 'Full Time';
  const startDate = intern?.batch_start ? format(parseISO(intern.batch_start), 'MMMM d, yyyy') : '—';
  const endDate = intern?.batch_end ? format(parseISO(intern.batch_end), 'MMMM d, yyyy') : '—';
  const issueDate = generatedAt ? format(new Date(generatedAt), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy');
  const certNo = `CERT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const performance = metadata?.performance || 'Excellent';

  return (
    <Document>
      <Page size="A4" style={[pdfStyles.page, { paddingTop: 55 }]}>
        {/* Top accent bar */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: '#7C3AED' }} />

        {/* Logo + Company Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8, gap: 14 }}>
          <Image src={window.location.origin + '/logo.png'} style={{ width: 56, height: 56 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[pdfStyles.companyName, { fontSize: 20, textAlign: 'center' }]}>{info.name}</Text>
            {info.parentCompany && <Text style={[pdfStyles.tagline, { textAlign: 'center' }]}>{info.parentCompany}</Text>}
            <Text style={[pdfStyles.addressLine, { textAlign: 'center', marginTop: 3 }]}>{info.address}</Text>
            <Text style={[pdfStyles.addressLine, { textAlign: 'center' }]}>{info.phone}  |  {info.email}  |  {info.website}</Text>
          </View>
        </View>
        <View style={{ width: 60, height: 2, backgroundColor: '#7C3AED', marginHorizontal: 'auto', marginBottom: 20 }} />

        {/* Certificate label */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 11, color: '#7C3AED', fontFamily: 'Helvetica-Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
            Certificate of Completion
          </Text>
          <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>This is to certify that</Text>
        </View>

        {/* Intern Name */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 30, fontFamily: 'Helvetica-Bold', color: '#0F172A', textAlign: 'center' }}>
            {intern?.full_name || 'Intern Name'}
          </Text>
          <View style={{ width: 200, height: 1, backgroundColor: '#CBD5E1', marginTop: 7 }} />
        </View>

        {/* Body text */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={[pdfStyles.body, { textAlign: 'center', lineHeight: 2 }]}>
            has successfully completed the internship program at{' '}
            <Text style={pdfStyles.highlight}>{info.name}</Text>
            {'\n'}in the role of <Text style={pdfStyles.bold}>{role}</Text>
            {'\n'}Department: <Text style={pdfStyles.bold}>{intern?.department || 'General'}</Text>
          </Text>
        </View>

        {/* Duration / Performance box */}
        <View style={{ ...pdfStyles.detailsBox, marginHorizontal: 30 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: '#64748B', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>From</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0F172A', marginTop: 3 }}>{startDate}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#CBD5E1' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: '#64748B', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>To</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0F172A', marginTop: 3 }}>{endDate}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#CBD5E1' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: '#64748B', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>Performance</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#7C3AED', marginTop: 3 }}>{performance}</Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginVertical: 14 }}>
          <Text style={[pdfStyles.body, { textAlign: 'center' }]}>
            During this internship, <Text style={pdfStyles.bold}>{intern?.full_name?.split(' ')[0] || 'the intern'}</Text> demonstrated outstanding commitment, professionalism, and a strong willingness to learn. We wish them all the best in their future endeavours.
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={[pdfStyles.body, { color: '#64748B', textAlign: 'center' }]}>
            Issued on: <Text style={pdfStyles.bold}>{issueDate}</Text>  ·  Cert No: <Text style={pdfStyles.bold}>{certNo}</Text>
          </Text>
        </View>

        <PDFSignatures companyKey={companyKey} />

        {/* Bottom bar */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, backgroundColor: '#7C3AED' }} />

        <PDFFooter companyKey={companyKey} refNo={certNo} issueDate={issueDate} />
      </Page>
    </Document>
  );
}

// ─── Generate Modal ──────────────────────────────────────────────────────────
function GenerateModal({ users, onClose, onGenerated }) {
  const [form, setForm] = useState({ user_id: '', type: 'offer_letter', stipend: '', performance: 'Excellent' });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const selectedUser = users.find(u => u.id === form.user_id);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.user_id) return toast.error('Select an intern');
    setSaving(true);
    try {
      const metadata = { stipend: form.stipend, performance: form.performance };
      const res = await api.post('/documents', { user_id: form.user_id, type: form.type, metadata });
      onGenerated(res.data.document);
      setPreview({ document: res.data.document, intern: selectedUser });
      toast.success('Document record saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">Generate Document</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>

        {!preview ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="label">Document Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'offer_letter', label: '📄 Offer Letter', desc: 'For new interns joining' },
                  { id: 'completion_certificate', label: '🏆 Certificate', desc: 'Upon completion' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.id }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.type === t.id ? 'border-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="text-sm font-bold text-navy">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Select Intern</label>
              <select className="input" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
                <option value="">Choose intern...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role?.replace(/_/g, ' ')})</option>
                ))}
              </select>
            </div>

            {form.type === 'offer_letter' && (
              <div>
                <label className="label">Stipend</label>
                <input className="input" placeholder="e.g. ₹5,000/month  (leave blank for N/A)" value={form.stipend} onChange={e => setForm(f => ({ ...f, stipend: e.target.value }))} />
              </div>
            )}

            {form.type === 'completion_certificate' && (
              <div>
                <label className="label">Performance Rating</label>
                <select className="input" value={form.performance} onChange={e => setForm(f => ({ ...f, performance: e.target.value }))}>
                  {['Excellent', 'Very Good', 'Good', 'Satisfactory'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <FileDown size={16} />
                {saving ? 'Generating...' : 'Generate & Download'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center">
              <p className="text-green-800 font-bold mb-1">✅ Document Ready!</p>
              <p className="text-green-600 text-sm">Click download to save as PDF</p>
            </div>

            <PDFDownloadLink
              document={
                preview.document.type === 'offer_letter'
                  ? <OfferLetterPDF intern={preview.intern} generatedAt={preview.document.generated_at} metadata={preview.document.metadata} />
                  : <CertificatePDF intern={preview.intern} generatedAt={preview.document.generated_at} metadata={preview.document.metadata} />
              }
              fileName={`${preview.document.type === 'offer_letter' ? 'OfferLetter' : 'Certificate'}_${preview.intern?.full_name?.replace(/ /g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <button disabled={pdfLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Download size={16} />
                  {pdfLoading ? 'Preparing PDF...' : 'Download PDF'}
                </button>
              )}
            </PDFDownloadLink>

            <button onClick={onClose} className="btn-secondary w-full">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchDocs(); fetchUsers(); }, []);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/team');
      setUsers(res.data.users || []);
    } catch { /* silent */ }
  };

  const handleGenerated = (doc) => {
    setDocuments(prev => [doc, ...prev]);
  };

  const quickGenerate = async (intern, type) => {
    try {
      const metadata = { stipend: intern.stipend, performance: 'Excellent' };
      const res = await api.post('/documents', { user_id: intern.id, type, metadata });
      const newDoc = { ...res.data.document, intern };
      setDocuments(prev => [newDoc, ...prev]);
      toast.success(`${type === 'offer_letter' ? 'Offer Letter' : 'Certificate'} generated for ${intern.full_name}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate document');
    }
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{documents.length} documents generated</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} />
          Generate Document
        </button>
      </div>

      {/* Company Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SI Placements */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
          <div className="flex items-center gap-3 mb-3">
            <img src="/logo.png" alt="SI Placements Logo" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-sm font-bold text-navy">SI Placements Internationals</p>
              <p className="text-xs text-gray-500">Head Office</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <p>📍 204, Akshar Matrix, Odhav S.P Ringroad, Ahmedabad – 382415</p>
            <p>📞 +91 6358845533</p>
            <p>✉️ info@siinternationals.com</p>
            <p>🌐 siinternationals.com</p>
            <p className="mt-2 font-semibold text-purple-700">Authorized Signatory: Soumita Das (Partner)</p>
          </div>
        </div>

        {/* Site4People */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <img src="/logo.png" alt="Site4People Logo" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-sm font-bold text-navy">Site4People</p>
              <p className="text-xs text-gray-500">Powered by SI Placements Internationals</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <p>📍 541, Krupal Pathshala City Centre, Ashram Road, Ahmedabad – 380014</p>
            <p>📞 +91 9898767870</p>
            <p>✉️ info@site4people.com</p>
            <p>🌐 www.site4people.com</p>
            <p className="mt-2 font-semibold text-blue-700">Authorized Signatory: Site4People</p>
          </div>
        </div>
      </div>

      {/* Document types */}
      <div className="p-4 rounded-2xl bg-gradient-card border border-purple-100">
        <p className="text-sm font-semibold text-navy mb-2">📋 Document Types Available</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <p className="text-sm font-bold">📄 Offer Letter</p>
            <p className="text-xs text-gray-500 mt-0.5">For interns joining a new batch — includes logo, address, stamp & signature</p>
          </div>
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <p className="text-sm font-bold">🏆 Completion Certificate</p>
            <p className="text-xs text-gray-500 mt-0.5">Upon successful completion — includes performance rating, stamp & signature</p>
          </div>
        </div>
      </div>

      {/* Quick Generate Per Intern */}
      <div className="card">
        <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
          <Users size={16} className="text-purple-500" />
          Generate Documents per Intern
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Intern</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Company</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Batch End</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const hasOffer = documents.some(d => d.user_id === u.id && d.type === 'offer_letter');
                const hasCert = documents.some(d => d.user_id === u.id && d.type === 'completion_certificate');
                const canGenCert = !u.is_active || u.completed_at;
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-medium text-navy">{u.full_name}</td>
                    <td className="py-2.5 text-gray-500 text-xs capitalize">{u.company?.replace('_', ' ')}</td>
                    <td className="py-2.5 text-gray-500 text-xs">{u.role?.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 text-gray-500 text-xs">{u.batch_end || '—'}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => quickGenerate(u, 'offer_letter')}
                          disabled={hasOffer}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${hasOffer ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                        >
                          {hasOffer ? '✓ Offer Letter' : '📄 Offer Letter'}
                        </button>
                        <button
                          onClick={() => quickGenerate(u, 'completion_certificate')}
                          disabled={!canGenCert || hasCert}
                          title={!canGenCert ? 'Mark intern complete first' : ''}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${hasCert ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : !canGenCert ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}
                        >
                          {hasCert ? '✓ Certificate' : '🏆 Certificate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Documents list */}
      <div className="card">
        <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
          <FileDown size={16} className="text-purple" />
          Generated Documents
        </h3>
        {documents.length === 0 ? (
          <div className="text-center py-10">
            <FileDown size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 font-medium">No documents generated yet</p>
            <p className="text-sm text-gray-400">Click "Generate Document" to create offer letters or certificates</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map(doc => {
              const intern = doc.intern;
              const isOffer = doc.type === 'offer_letter';
              return (
                <div key={doc.id} className="flex items-center gap-3 py-3.5 hover:bg-gray-50 px-2 rounded-xl transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOffer ? 'bg-blue-100' : 'bg-yellow-100'}`}>
                    <span className="text-lg">{isOffer ? '📄' : '🏆'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy">{intern?.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">
                      {isOffer ? 'Offer Letter' : 'Completion Certificate'} · {format(new Date(doc.generated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <span className={`badge ${isOffer ? 'badge-blue' : 'badge-yellow'}`}>
                    {isOffer ? 'Offer Letter' : 'Certificate'}
                  </span>

                  {/* Re-download */}
                  <PDFDownloadLink
                    document={
                      isOffer
                        ? <OfferLetterPDF intern={intern} generatedAt={doc.generated_at} metadata={doc.metadata} />
                        : <CertificatePDF intern={intern} generatedAt={doc.generated_at} metadata={doc.metadata} />
                    }
                    fileName={`${isOffer ? 'OfferLetter' : 'Certificate'}_${intern?.full_name?.replace(/ /g, '_')}_${format(new Date(doc.generated_at), 'yyyy-MM-dd')}.pdf`}
                  >
                    {({ loading: pdfLoading }) => (
                      <button
                        title="Download PDF"
                        disabled={pdfLoading}
                        className="p-2 rounded-xl hover:bg-purple-50 text-gray-400 hover:text-purple-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Download size={16} />
                      </button>
                    )}
                  </PDFDownloadLink>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <GenerateModal
          users={users}
          onClose={() => setShowModal(false)}
          onGenerated={handleGenerated}
        />
      )}
    </div>
  );
}
