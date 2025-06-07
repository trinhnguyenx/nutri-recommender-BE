import { Router } from 'express';
import { chatbotController } from './chatbot.controller';

const router = Router();

router.post('/message', chatbotController.handleMessage);
router.get('/conversations/:userId', chatbotController.getConversations);
router.get('/messages/:conversationId', chatbotController.getMessages);

export default router;
