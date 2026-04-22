import { Router } from 'express';
import { createChat, getChat, getMyChats } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.post('/', createChat);
router.get('/my', getMyChats);
router.get('/:id', getChat);

export default router;