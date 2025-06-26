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
  async createMessage(req: Request, res: Response) {
    try {
      const {conversationId, message, sender } = req.body;
      const newMessage = await chatbotService.createMessage(conversationId, message, sender);
      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error in createMessage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  async userInputMessageAddIngredients(req: Request, res: Response) {
    try {
      const { conversationId, message, userId } = req.body;
      console.log('userInputMessageAddIngredients called with:', { conversationId, message, userId });
      const result = await chatbotService.userInputMessageAddIngredients(message.conversationId, message.message, userId);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in userInputMessageAddIngredients:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  async chatbotstatistics(req: Request, res: Response) {
    try {
      const { message } = req.body;
      const statistics = await chatbotService.getChatbotStatistics(message);
      res.json(statistics);
    } catch (error) {
      console.error('Error in chatbotstatistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const chatbotController = new ChatbotController();
