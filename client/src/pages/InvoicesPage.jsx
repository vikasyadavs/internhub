import { useState, useEffect } from 'react';
import { Plus, X, Receipt, DollarSign, CheckCircle2, Clock, AlertCircle, Edit2, Share2, Download, QrCode } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const STATUS_CFG = {
  pending: { label: 'Pending', cls: 'badge-yellow' },
  paid: { label: 'Paid', cls: 'badge-green' },
  partial: { label: 'Partial', cls: 'badge-orange' },
};

function InvoiceModal({ invoice, clients, onClose, onSaved }) {
  const isEdit = !!invoice?.id;
  const [form, setForm] = useState({
    client_id: invoice?.client_id || '',
    invoice_number: invoice?.invoice_number || '',
    client_name: invoice?.client_name || '',
    client_address: invoice?.client_address || '',
    client_email: invoice?.client_email || '',
    service_description: invoice?.service_description || '',
    payment_terms: invoice?.payment_terms || 'full_advance',
    gst_percentage: invoice?.gst_percentage || 18,
    cashfree_link: invoice?.cashfree_link || '',
    qr_code_url: invoice?.qr_code_url || '',
    line_items: invoice?.line_items ? (typeof invoice.line_items === 'string' ? JSON.parse(invoice.line_items) : invoice.line_items) : [{ description: 'Web Development Services', quantity: 1, rate: 0 }],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      api.get('/invoices/next-number').then(res => {
        setForm(f => ({ ...f, invoice_number: res.data.nextInvoiceNumber }));
      }).catch(() => {});
    }
  }, [isEdit]);

  useEffect(() => {
    api.get('/settings').then(res => {
      const s = res.data.settings || {};
      setForm(f => ({
        ...f,
        qr_code_url: f.qr_code_url || s.upi_qr_url || '',
        cashfree_link: f.cashfree_link || s.cashfree_link || '',
      }));
    }).catch(() => {});
  }, []);

  const handleClientChange = (clientId) => {
    const c = clients.find(x => x.id === clientId);
    if (c) {
      setForm(f => ({
        ...f,
        client_id: clientId,
        client_name: c.company_name,
        client_address: c.city || 'Office Address',
        client_email: c.email || '',
        line_items: f.line_items.map(item => item.rate === 0 ? { ...item, rate: parseFloat(c.deal_value) || 0 } : item)
      }));
    } else {
      setForm(f => ({ ...f, client_id: clientId }));
    }
  };

  const addItem = () => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', quantity: 1, rate: 0 }] }));
  const removeItem = (i) => setForm(f => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));
  
  const updateItem = (i, field, val) => {
    const items = [...form.line_items];
    items[i] = { ...items[i], [field]: val };
    setForm(f => ({ ...f, line_items: items }));
  };

  const subtotal = form.line_items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const gstAmount = Math.round(subtotal * (parseFloat(form.gst_percentage) / 100));
  const grandTotal = subtotal + gstAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      amount: subtotal,
      gst_amount: gstAmount,
      total_amount: grandTotal,
    };
    try {
      let res;
      if (isEdit) {
        res = await api.patch(`/invoices/${invoice.id}`, payload);
        onSaved(res.data.invoice, 'update');
      } else {
        res = await api.post('/invoices', payload);
        onSaved(res.data.invoice, 'create');
      }
      toast.success(isEdit ? 'Invoice updated!' : 'Invoice generated! 🧾');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save invoice');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">{isEdit ? 'Edit Invoice' : 'Generate Tax Invoice'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Link Client Deal</label>
              <select className="input text-xs" value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
                <option value="">Manual / Custom Client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name} (₹{c.deal_value})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Invoice Number</label>
              <input className="input text-xs" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="S4P-001" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Client Business Name *</label>
              <input className="input text-xs" required value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Apollo Pharmacy..." />
            </div>
            <div>
              <label className="label">Client Email</label>
              <input className="input text-xs" type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="billing@apollo.in" />
            </div>
            <div>
              <label className="label">GST Percentage</label>
              <select className="input text-xs" value={form.gst_percentage} onChange={e => setForm(f => ({ ...f, gst_percentage: parseInt(e.target.value) }))}>
                <option value="0">0% (Exempt)</option>
                <option value="18">18% (Standard IT Services)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Client Billing Address</label>
            <input className="input text-xs" value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} placeholder="Billing Address..." />
          </div>

          {/* Line items */}
          <div className="border border-gray-100 rounded-xl p-3.5 space-y-3 bg-slate-50/50">
            <label className="label text-xs font-bold text-gray-500 uppercase tracking-wider">Services Line Items</label>
            <div className="space-y-2">
              {form.line_items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input text-xs flex-1" required placeholder="Service / Feature Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                  <input type="number" className="input text-xs w-16" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                  <input type="number" className="input text-xs w-28" placeholder="Rate (₹)" value={item.rate} onChange={e => updateItem(i, 'rate', parseFloat(e.target.value) || 0)} />
                  {form.line_items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-2 rounded-xl text-gray-400 hover:text-red-500 shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-xs text-purple-600 hover:text-black font-semibold flex items-center gap-1">
                <Plus size={13} /> Add line item
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
            <div>
              <span className="text-gray-400 block mb-1">Invoice Breakdown</span>
              <span className="block font-medium text-gray-600">Subtotal: ₹{subtotal.toLocaleString()}</span>
              <span className="block font-medium text-gray-600">GST ({form.gst_percentage}%): ₹{gstAmount.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 block mb-0.5">Grand Total Due</span>
              <span className="text-2xl font-extrabold text-navy">₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><QrCode size={12} /> UPI QR (from Settings)</label>
              <div className="flex items-center gap-2">
                <input
                  className="input text-xs bg-gray-50 text-gray-400 cursor-not-allowed flex-1"
                  value={form.qr_code_url || 'Not configured'}
                  readOnly
                />
                {form.qr_code_url && (
                  <img src={form.qr_code_url} alt="QR Preview" className="w-9 h-9 rounded border border-gray-200 object-contain shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Set in Settings → Payment Settings (admin only)</p>
            </div>
            <div>
              <label className="label">Cashfree / Custom Payment Link</label>
              <input className="input text-xs" value={form.cashfree_link} onChange={e => setForm(f => ({ ...f, cashfree_link: e.target.value }))} placeholder="https://cashfree.com/..." />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Generating...' : 'Generate Invoice'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MarkPaidModal({ invoice, onClose, onSaved }) {
  const [mode, setMode] = useState('UPI');
  const [received, setReceived] = useState(invoice.total_amount || invoice.amount || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch(`/invoices/${invoice.id}/mark-paid`, {
        payment_mode: mode,
        amount_received: parseFloat(received),
      });
      toast.success('Invoice payment recorded!');
      onSaved(res.data.invoice, 'update');
      onClose();
    } catch {
      toast.error('Failed to update invoice');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-base">Mark Invoice as Paid</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Amount Received (₹)</label>
            <input type="number" className="input" value={received} onChange={e => setReceived(e.target.value)} />
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="UPI">UPI (QR Code)</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);

  useEffect(() => { fetchInvoices(); fetchClients(); }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.invoices || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data.clients || []);
    } catch { /* silent */ }
  };

  const handleSaved = (inv, action) => {
    if (action === 'create') setInvoices(prev => [inv, ...prev]);
    else setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.success('Invoice deleted');
    } catch { toast.error('Failed'); }
  };

  const handleShareWhatsApp = (inv) => {
    const text = `Hi, please find your invoice from Site4People:\nInvoice No: ${inv.invoice_number}\nAmount due: ₹${(inv.total_amount || inv.amount).toLocaleString()}\nStatus: ${inv.status.toUpperCase()}\n\nYou can pay online via UPI or Cashfree link. Thank you!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrintReceipt = (inv) => {
    // Generate simple print page window
    let itemsList = [];
    try {
      itemsList = typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : (inv.line_items || []);
    } catch (e) {
      itemsList = [{ description: 'Development services', quantity: 1, rate: inv.amount }];
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${inv.invoice_number}</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #1e1b4b; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #f5f5f5; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div>
              <div class="logo">Site4People</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Powered by SI Placements Internationals</div>
              <div style="font-size: 12px; color: #666;">Office: 541, Krupal Pathshala City Centre, Ashram Road, Ahmedabad, 380014</div>
              <div style="font-size: 12px; color: #666;">Phone: +91 9898767870 · info@site4people.com</div>
            </div>
            <div style="text-align: right;">
              <h2>INVOICE</h2>
              <div>Invoice No: <strong>${inv.invoice_number}</strong></div>
              <div>Date: ${inv.created_at ? format(parseISO(inv.created_at), 'dd MMM yyyy') : ''}</div>
            </div>
          </div>
          <div class="details">
            <div>
              <strong>Billed To:</strong><br>
              ${inv.client_name || 'Client'}<br>
              ${inv.client_address || ''}<br>
              Email: ${inv.client_email || ''}
            </div>
            <div style="text-align: right;">
              <strong>Payment terms:</strong> ${inv.payment_terms || 'Full Advance'}<br>
              <strong>Status:</strong> ${inv.status.toUpperCase()}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Service Line Description</th>
                <th>Qty</th>
                <th>Rate (INR)</th>
                <th>Total (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>₹${(item.rate || 0).toLocaleString()}</td>
                  <td>₹${((item.quantity || 0) * (item.rate || 0)).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <div>Subtotal: ₹${Number(inv.amount || 0).toLocaleString()}</div>
            <div>GST (${inv.gst_percentage || 0}%): ₹${Number(inv.gst_amount || 0).toLocaleString()}</div>
            <div style="margin-top: 10px; font-size: 22px; color: #1e1b4b;">Total Amount Due: ₹${Number(inv.total_amount || inv.amount || 0).toLocaleString()}</div>
          </div>
          ${inv.qr_code_url ? `<div style="text-align:center;margin-top:20px;"><p style="font-size:12px;color:#666;">Pay via UPI</p><img src="${inv.qr_code_url}" style="width:120px;height:120px;margin:8px auto;display:block;"/>${inv.cashfree_link ? `<a href="${inv.cashfree_link}" style="font-size:12px;color:#7C3AED;">Or click to pay online</a>` : ''}</div>` : ''}
          <div class="footer">
            Thank you for doing business with Site4People!
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total_amount || i.amount || 0), 0);
  const totalPending = invoices.filter(i => i.status === 'pending' || i.status === 'partial').reduce((sum, i) => sum + parseFloat(i.total_amount || i.amount || 0), 0);

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, gradient: 'bg-gradient-purple-blue', icon: Receipt },
          { label: 'Revenue Collected', value: `₹${totalPaid.toLocaleString()}`, gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600', icon: CheckCircle2 },
          { label: 'Pending Collections', value: `₹${totalPending.toLocaleString()}`, gradient: 'bg-gradient-to-br from-yellow-500 to-orange-500', icon: Clock },
          { label: 'Tax Audits (GST)', value: '18% Enabled', gradient: 'bg-gradient-to-br from-indigo-500 to-cyan-600', icon: AlertCircle },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.gradient}`}>
            <div className="relative">
              <div className="p-2 rounded-xl bg-white/20 inline-flex mb-2"><s.icon size={18} className="text-white" /></div>
              <p className="text-xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-white/80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => { setEditInvoice(null); setShowModal(true); }} className="btn-primary flex items-center gap-1.5 text-xs py-2.5">
          <Plus size={15} />
          New Invoice
        </button>
      </div>

      <div className="card">
        {invoices.length === 0 ? (
          <div className="text-center py-10">
            <Receipt size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 font-medium">No invoices generated yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {invoices.map(inv => {
              const cfg = STATUS_CFG[inv.status] || STATUS_CFG.pending;
              return (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-gray-50 px-3 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-purple-blue flex items-center justify-center shrink-0">
                      <Receipt size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400">
                        {inv.client_name || 'Custom Client'} · {inv.created_at ? format(parseISO(inv.created_at), 'MMM d, yyyy') : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-sm font-bold text-navy">₹{(inv.total_amount || inv.amount || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">GST Inc: ₹{(inv.gst_amount || 0).toLocaleString()}</p>
                    </div>
                    <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                    
                    <div className="flex gap-1.5">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => setPayInvoice(inv)}
                          className="bg-green-50 text-green-700 hover:bg-green-100 text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => handlePrintReceipt(inv)}
                        title="Download / Print PDF"
                        className="p-2 rounded-xl bg-gray-100 hover:bg-black hover:text-white transition-colors"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(inv)}
                        title="Share on WhatsApp"
                        className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                      >
                        <Share2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <InvoiceModal
          invoice={editInvoice}
          clients={clients}
          onClose={() => { setShowModal(false); setEditInvoice(null); }}
          onSaved={handleSaved}
        />
      )}

      {payInvoice && (
        <MarkPaidModal
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
