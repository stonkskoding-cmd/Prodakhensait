import { Router } from 'express';
import { getGirls, getGirl } from '../controllers/girlController.js';
import { createGirl, updateGirl, deleteGirl } from '../controllers/girlController.js';
import { protect } from '../middleware/auth.js';
import { role } from '../middleware/role.js';

const router = Router();

// Public routes
router.get('/', getGirls);
router.get('/:id', getGirl);

// Admin only
router.use(protect, role('admin'));
router.post('/', createGirl);
router.put('/:id', updateGirl);
router.delete('/:id', deleteGirl);

export default router;