import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { requireAdmin } from '../middlewares/require-admin';

const router = Router();

// GET all admins (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, clerk_id, name, email, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST new admin (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { clerkId, name, email, role, isActive } = req.body;
    if (!clerkId || !name || !email) {
      res.status(400).json({ error: 'clerkId, name, and email are required' });
      return;
    }

    const { data, error } = await supabase
      .from('admins')
      .insert({
        clerk_id: clerkId,
        name,
        email,
        role: role ?? 'admin',
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

// PUT update admin (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const { data, error } = await supabase
      .from('admins')
      .update({
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
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

// DELETE admin (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;