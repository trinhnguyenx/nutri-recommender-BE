import { Router } from 'express';
import { chatbotController } from './chatbot.controller';

const router = Router();

router.post('/message', chatbotController.handleMessage);
router.get('/conversations/:userId', chatbotController.getConversations);
router.get('/messages/:conversationId', chatbotController.getMessages);
router.post('/create-message', chatbotController.createMessage);
router.post('/add-ingredients', chatbotController.userInputMessageAddIngredients);
export default router;
