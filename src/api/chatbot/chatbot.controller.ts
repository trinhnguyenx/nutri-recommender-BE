import { Request, Response } from 'express';
import { chatbotService } from './chatbot.service';
import {
  ChatbotMessageInput,
} from './chatbot.interface';

class ChatbotController {
  async handleMessage(req: Request, res: Response) {
    try {
      const input: ChatbotMessageInput = req.body;
      const result = await chatbotService.handleUserMessage(input);
      res.json(result);
    } catch (error) {
      console.error('Error in handleMessage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getConversations(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const conversations = await chatbotService.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error('Error in getConversations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const messages = await chatbotService.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error('Error in getMessages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const chatbotController = new ChatbotController();
