import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { logActivity } from './activity.js';
import { createNotification } from './notifications.js';

const router = express.Router();
const canAccess = requireRole('admin', 'bd_intern');

// Helper to log actions
const logAction = async (type, desc, user) => {
  try {
    await supabase.from('action_log').insert({
      action_type: type,
      description: desc,
      created_by: user.id
    });
  } catch (e) {
    console.error('Failed to write action log:', e);
  }
};

// GET /api/clients
router.get('/', authenticate, canAccess, async (req, res) => {
  let query = supabase
    .from('bd_clients')
    .select('*, managed_by_user:users!bd_clients_managed_by_fkey(id, full_name)')
    .order('created_at', { ascending: false });

  if (req.user.role === 'bd_intern') {
    query = query.eq('managed_by', req.user.id);
  }

  const { stage } = req.query;
  if (stage) query = query.eq('stage', stage);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, clients: data });
});

// POST /api/clients
router.post('/', authenticate, canAccess, async (req, res) => {
  const { company_name, contact_person, phone, email, city, source, service_interest, deal_value, notes, next_followup } = req.body;

  if (!company_name) return res.status(400).json({ success: false, message: 'Company name required' });

  const { data, error } = await supabase.from('bd_clients').insert({
    company_name,
    contact_person,
    phone,
    email,
    city: city || '',
    source: source || 'google',
    service_interest: service_interest || '',
    deal_value: deal_value || null,
    notes: notes || '',
    stage: 'prospect',
    managed_by: req.user.id,
    next_followup: next_followup || null,
    created_at: new Date().toISOString()
  }).select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAction('lead_created', `New lead "${company_name}" added by ${req.user.full_name}`, req.user);
  await logActivity(req.user.id, 'lead_added', `Added new BD lead: "${company_name}"`, { leadId: data.id });

  res.status(201).json({ success: true, client: data });
});

// GET /api/clients/my-followups — Today's follow-ups for BD intern
router.get('/my-followups', authenticate, canAccess, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: clients, error } = await supabase
      .from('bd_clients')
      .select('*')
      .eq('managed_by', req.user.id)
      .eq('next_followup', todayStr);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, followups: clients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/clients/:id — Single client detail
router.get('/:id', authenticate, canAccess, async (req, res) => {
  const { data: client, error } = await supabase
    .from('bd_clients')
    .select('*, managed_by_user:users!bd_clients_managed_by_fkey(id, full_name)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ success: false, message: 'Client not found' });
  res.json({ success: true, client });
});

// PATCH /api/clients/:id
router.patch('/:id', authenticate, canAccess, async (req, res) => {
  const updates = { ...req.body };
  delete updates.id;
  delete updates.managed_by;

  const { data, error } = await supabase
    .from('bd_clients')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAction('lead_updated', `Lead "${data.company_name}" stage updated to ${data.stage}`, req.user);
  await logActivity(req.user.id, 'lead_updated', `Updated BD lead stage: "${data.company_name}" → ${data.stage}`, { leadId: data.id, stage: data.stage });

  // Trigger admin notifications for deals and payments
  const { data: users } = await supabase.from('users').select('id, role');
  const admins = (users || []).filter(u => u.role === 'admin');

  if (updates.stage === 'deal_closed') {
    for (const adm of admins) {
      await createNotification(
        adm.id,
        'deal_closed',
        'Deal Closed by BD Intern',
        `"${data.company_name}" was marked Deal Closed by ${req.user.full_name}`,
        '/clients'
      );
    }
  }

  if (updates.payment_status === 'received') {
    for (const adm of admins) {
      await createNotification(
        adm.id,
        'payment_received',
        'Payment Received Notification',
        `Payment was marked Received for "${data.company_name}" by ${req.user.full_name}`,
        '/invoices'
      );
    }
  }

  res.json({ success: true, client: data });
});

// DELETE /api/clients/:id — Admin only
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { data: oldClient } = await supabase.from('bd_clients').select('company_name').eq('id', req.params.id).single();
  const { error } = await supabase.from('bd_clients').delete().eq('id', req.params.id);

  if (error) return res.status(500).json({ success: false, message: error.message });

  if (oldClient) {
    await logAction('lead_deleted', `Lead "${oldClient.company_name}" removed`, req.user);
  }

  res.json({ success: true, message: 'Client deleted' });
});

// POST /api/clients/:id/call-log — Log a call
router.post('/:id/call-log', authenticate, canAccess, async (req, res) => {
  const { outcome, notes } = req.body;
  if (!outcome) return res.status(400).json({ success: false, message: 'Outcome is required' });

  const { data, error } = await supabase.from('call_logs').insert({
    client_id: req.params.id,
    intern_id: req.user.id,
    outcome,
    notes: notes || '',
    timestamp: new Date().toISOString()
  }).select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  // Update client's last activity
  await supabase
    .from('bd_clients')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', req.params.id);

  // Retrieve client name
  const { data: clientObj } = await supabase.from('bd_clients').select('company_name').eq('id', req.params.id).single();
  await logActivity(req.user.id, 'call_logged', `Logged call: "${clientObj?.company_name || 'Client'}" — Outcome: ${outcome}`, { clientId: req.params.id, outcome });

  res.status(201).json({ success: true, log: data });
});

// GET /api/clients/:id/call-logs — Call logs history
router.get('/:id/call-logs', authenticate, canAccess, async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('client_id', req.params.id)
      .order('timestamp', { ascending: false });

    if (error) return res.status(500).json({ success: false, message: error.message });

    const { data: users } = await supabase.from('users').select('id, full_name');
    const withUsers = (logs || []).map(l => {
      const u = users?.find(x => x.id === l.intern_id);
      return {
        ...l,
        intern: u ? { id: u.id, full_name: u.full_name } : null
      };
    });

    res.json({ success: true, logs: withUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/clients/:id/followup — Schedule follow-up
router.post('/:id/followup', authenticate, canAccess, async (req, res) => {
  const { followup_date, reminder_note } = req.body;
  if (!followup_date) return res.status(400).json({ success: false, message: 'Follow-up date required' });

  const { data, error } = await supabase
    .from('bd_clients')
    .update({
      next_followup: followup_date,
      notes: reminder_note ? `${reminder_note}\n\n` : ''
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAction('followup_scheduled', `Follow-up scheduled for "${data.company_name}" on ${followup_date}`, req.user);

  res.json({ success: true, client: data });
});

// POST /api/clients/:id/assign-to-it — Assign to IT
router.post('/:id/assign-to-it', authenticate, canAccess, async (req, res) => {
  const { project_type, description, reference_links, deadline_preference } = req.body;

  const { data: client } = await supabase.from('bd_clients').select('*').eq('id', req.params.id).single();
  if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

  // Update client stage to work_assigned
  const { data: updatedClient, error } = await supabase
    .from('bd_clients')
    .update({ stage: 'work_assigned' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  // Record assignment info in it_assignments
  await supabase.from('it_assignments').insert({
    client_id: req.params.id,
    company_name: client.company_name,
    project_type: project_type || 'website',
    description: description || '',
    reference_links: reference_links || '',
    deadline_preference: deadline_preference || '',
    agreed_amount: client.deal_value || 0,
    created_at: new Date().toISOString()
  });

  await logAction('assigned_to_it', `Work for "${client.company_name}" assigned to IT interns`, req.user);

  res.json({ success: true, client: updatedClient });
});

// POST /api/clients/bulk-import — Import array of leads from Excel/CSV
router.post('/bulk-import', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  const { clients: leads, assigned_to } = req.body;
  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ success: false, message: 'No leads provided' });
  }
  const results = [];
  const errors = [];
  for (const lead of leads) {
    if (!lead.name && !lead.company_name) { errors.push(lead); continue; }
    const obj = {
      company_name: lead.company_name || lead.name || 'Unknown',
      contact_name: lead.contact_name || lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: lead.city || '',
      source: lead.source || 'other',
      notes: lead.notes || '',
      stage: 'prospect',
      managed_by: assigned_to || req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      const { data } = await supabase.from('bd_clients').insert(obj).select().single();
      if (data) results.push(data);
    } catch (e) { errors.push({ lead, error: e.message }); }
  }
  await logActivity(req.user.id, 'bulk_import', `Bulk imported ${results.length} leads`, { count: results.length });
  res.status(201).json({ success: true, imported: results.length, skipped: errors.length, clients: results });
});

export default router;
