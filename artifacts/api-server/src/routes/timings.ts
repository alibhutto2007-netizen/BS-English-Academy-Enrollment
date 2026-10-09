import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// GET all timings (optional batchId filter)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('timings').select('*, batches(name, course_id)').eq('is_active', true);

    if (req.query.batchId) {
      query = query.eq('batch_id', req.query.batchId);
    }

    const { data, error } = await query.order('start_time');
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST new timing (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const batchId = req.body.batchId || req.body.batch_id;
    const day = req.body.day || 'All Days';
    const startTime = req.body.startTime || req.body.start_time;
    const endTime = req.body.endTime || req.body.end_time;
    const isActive = req.body.isActive ?? req.body.is_active;

    if (!batchId || !startTime || !endTime) {
      res.status(400).json({ error: 'batchId, startTime, and endTime are required' });
      return;
    }

    const { data, error } = await supabase
      .from('timings')
      .insert({
        batch_id: batchId,
        day,
        start_time: startTime,
        end_time: endTime,
        is_active: isActive ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update timing (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const batchId = req.body.batchId || req.body.batch_id;
    const day = req.body.day;
    const startTime = req.body.startTime || req.body.start_time;
    const endTime = req.body.endTime || req.body.end_time;
    const isActive = req.body.isActive ?? req.body.is_active;

    const { data, error } = await supabase
      .from('timings')
      .update({
        ...(batchId && { batch_id: batchId }),
        ...(day && { day }),
        ...(startTime && { start_time: startTime }),
        ...(endTime && { end_time: endTime }),
        ...(isActive !== undefined && { is_active: isActive }),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE timing (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('timings')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;