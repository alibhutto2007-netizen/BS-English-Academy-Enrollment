import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// GET all batches (optional courseId filter)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('batches').select('*, courses(name)').eq('is_active', true);

    if (req.query.courseId) {
      query = query.eq('course_id', req.query.courseId);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST new batch (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const courseId = req.body.courseId || req.body.course_id;
    const name = req.body.name;
    const description = req.body.description;
    const isActive = req.body.isActive ?? req.body.is_active;

    if (!courseId || !name) {
      res.status(400).json({ error: 'courseId and name are required' });
      return;
    }

    const { data, error } = await supabase
      .from('batches')
      .insert({
        course_id: courseId,
        name,
        description,
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

// PUT update batch (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const courseId = req.body.courseId || req.body.course_id;
    const name = req.body.name;
    const description = req.body.description;
    const isActive = req.body.isActive ?? req.body.is_active;

    const { data, error } = await supabase
      .from('batches')
      .update({
        ...(courseId && { course_id: courseId }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
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

// DELETE batch (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;