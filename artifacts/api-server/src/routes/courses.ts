import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// GET all active courses (public)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST new course (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Course name is required' });
      return;
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
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

// PUT update course (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const { data, error } = await supabase
      .from('courses')
      .update({
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

// DELETE course (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;