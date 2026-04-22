import { Router } from 'express';
import { 
  getOperatorChats, getSettings, updateSettings, getStats 
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { role } from '../middleware/role.js';

const router = Router();

router.use(protect, role('operator', 'admin'));

router.get('/chats', getOperatorChats);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/stats', getStats);

export default router;