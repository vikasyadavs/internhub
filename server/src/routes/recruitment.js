import express from 'express';
import supabase from '../config/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { logActivity } from './activity.js';
import { createNotification } from './notifications.js';

const router = express.Router();
const canAccess = requireRole('admin', 'recruitment_intern');
const requireAdmin = requireRole('admin');

// GET /api/recruitment — all candidates (admin: all, intern: own)
router.get('/', authenticate, canAccess, async (req, res) => {
  let query = supabase
    .from('recruitment_pipeline')
    .select('*')
    .order('created_at', { ascending: false });

  if (req.user.role === 'recruitment_intern') query = query.eq('managed_by', req.user.id);

  const { stage } = req.query;
  if (stage) query = query.eq('stage', stage);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, candidates: data });
});

// GET /api/recruitment/my-followups — candidates with follow-up due today or overdue
router.get('/my-followups', authenticate, canAccess, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('recruitment_pipeline')
    .select('*')
    .order('next_followup', { ascending: true });

  if (req.user.role === 'recruitment_intern') query = query.eq('managed_by', req.user.id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  const followups = (data || []).filter(
    c =>
      c.next_followup &&
      c.next_followup <= today &&
      c.stage !== 'rejected' &&
      c.stage !== 'selected'
  );
  res.json({ success: true, followups });
});

// GET /api/recruitment/weekly-summary — weekly summary for the current intern
router.get('/weekly-summary', authenticate, canAccess, async (req, res) => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    let query = supabase.from('recruitment_pipeline').select('*');
    if (req.user.role === 'recruitment_intern') query = query.eq('managed_by', req.user.id);
    const { data: all } = await query;

    const thisWeek = (all || []).filter(c => c.updated_at && c.updated_at >= weekStartStr);
    const callsMade = thisWeek.length;
    const qualified = thisWeek.filter(c =>
      ['qualified', 'english_test', 'interview_scheduled', 'selected'].includes(c.stage)
    ).length;
    const interviews = thisWeek.filter(c => c.stage === 'interview_scheduled').length;
    const selected = thisWeek.filter(c => c.stage === 'selected').length;

    // Get interviews scheduled this week
    const { data: allInterviews } = await supabase.from('interviews').select('*');
    const weekInterviews = (allInterviews || []).filter(
      i =>
        i.created_at &&
        i.created_at >= weekStartStr &&
        (req.user.role === 'admin' || i.scheduled_by === req.user.id)
    );

    res.json({
      success: true,
      summary: {
        callsMade,
        qualified,
        interviewsScheduled: weekInterviews.length,
        offersExtended: selected,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/recruitment
router.post('/', authenticate, canAccess, async (req, res) => {
  const { candidate_name, phone, email, position_applied, notes, next_followup } = req.body;
  if (!candidate_name) return res.status(400).json({ success: false, message: 'Candidate name required' });

  const { data, error } = await supabase
    .from('recruitment_pipeline')
    .insert({
      candidate_name,
      phone,
      email,
      position_applied,
      notes: notes || '',
      stage: 'called',
      managed_by: req.user.id,
      next_followup: next_followup || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logActivity(req.user.id, 'candidate_added', `Added candidate: "${candidate_name}"`, { candidateId: data.id });

  // Trigger admin notifications for new candidate
  const { data: users } = await supabase.from('users').select('id, role');
  const admins = (users || []).filter(u => u.role === 'admin');
  for (const adm of admins) {
    await createNotification(
      adm.id,
      'new_candidate',
      'New Candidate Added',
      `New candidate "${candidate_name}" added for "${position_applied}"`,
      '/recruitment'
    );
  }

  res.status(201).json({ success: true, candidate: data });
});

// PATCH /api/recruitment/:id
router.patch('/:id', authenticate, canAccess, async (req, res) => {
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  delete updates.id;
  delete updates.managed_by;

  const { data, error } = await supabase
    .from('recruitment_pipeline')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logActivity(req.user.id, 'candidate_updated', `Updated candidate: "${data.candidate_name}"`, { candidateId: data.id });

  res.json({ success: true, candidate: data });
});

// DELETE /api/recruitment/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('recruitment_pipeline').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Candidate deleted' });
});

// POST /api/recruitment/bulk-import
router.post('/bulk-import', authenticate, requireAdmin, async (req, res) => {
  const { candidates, assigned_to } = req.body;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ success: false, message: 'No candidates provided' });
  }
  const results = [];
  const errors = [];
  for (const c of candidates) {
    if (!c.candidate_name && !c.name) { errors.push(c); continue; }
    const obj = {
      candidate_name: c.candidate_name || c.name,
      phone: c.phone || '',
      email: c.email || '',
      position_applied: c.position_applied || c.position || '',
      notes: c.notes || '',
      stage: 'called',
      managed_by: assigned_to || req.user.id,
      next_followup: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      const { data } = await supabase.from('recruitment_pipeline').insert(obj).select().single();
      if (data) results.push(data);
    } catch (e) { errors.push({ candidate: c, error: e.message }); }
  }
  await logActivity(req.user.id, 'bulk_import_candidates', `Bulk imported ${results.length} candidates`, { count: results.length });
  res.status(201).json({ success: true, imported: results.length, skipped: errors.length, candidates: results });
});

// POST /api/recruitment/:id/schedule-interview
router.post('/:id/schedule-interview', authenticate, canAccess, async (req, res) => {
  const { interview_date, interview_time, mode, employer_name, job_role, interviewer_name, interview_link, notes } = req.body;
  if (!interview_date) return res.status(400).json({ success: false, message: 'Interview date required' });

  const { data: candidate } = await supabase
    .from('recruitment_pipeline')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });

  // Create interview record
  const { data: interview, error: intErr } = await supabase
    .from('interviews')
    .insert({
      candidate_id: req.params.id,
      candidate_name: candidate.candidate_name,
      interview_date,
      interview_time: interview_time || '',
      mode: mode || 'in_person',
      employer_name: employer_name || '',
      job_role: job_role || candidate.position_applied || '',
      interviewer_name: interviewer_name || '',
      interview_link: interview_link || '',
      notes: notes || '',
      scheduled_by: req.user.id,
      status: 'scheduled',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (intErr) return res.status(500).json({ success: false, message: intErr.message });

  // Update candidate stage to interview_scheduled and set follow-up to day after
  const followupDate = new Date(interview_date);
  followupDate.setDate(followupDate.getDate() + 1);
  const followupStr = followupDate.toISOString().split('T')[0];

  await supabase.from('recruitment_pipeline').update({
    stage: 'interview_scheduled',
    interview_date,
    interview_time: interview_time || '',
    next_followup: followupStr,
    followup_note: `Did ${candidate.candidate_name} appear for interview? Update status.`,
    updated_at: new Date().toISOString(),
  }).eq('id', req.params.id);

  await logActivity(
    req.user.id,
    'interview_scheduled',
    `Scheduled interview for "${candidate.candidate_name}" on ${interview_date}`,
    { candidateId: req.params.id }
  );

  res.status(201).json({ success: true, interview, followup_set: followupStr });
});

// GET /api/recruitment/:id/interviews
router.get('/:id/interviews', authenticate, canAccess, async (req, res) => {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('candidate_id', req.params.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, interviews: data || [] });
});

// PATCH /api/recruitment/:id/followup — mark follow-up done, set next date
router.patch('/:id/followup', authenticate, canAccess, async (req, res) => {
  const { next_followup, followup_note, mark_done } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (mark_done) {
    updates.last_followup_done = new Date().toISOString().split('T')[0];
  }
  if (next_followup) updates.next_followup = next_followup;
  if (followup_note !== undefined) updates.followup_note = followup_note;

  const { data, error } = await supabase
    .from('recruitment_pipeline')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, candidate: data });
});

export default router;
