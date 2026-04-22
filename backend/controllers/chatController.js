import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Girl from '../models/Girl.js';
import { BotService, BOT_STATES } from '../services/botService.js';

export const createChat = async (req, res) => {
  try {
    const { girlId } = req.body;
    const girl = await Girl.findById(girlId);
    if (!girl) return res.status(404).json({ error: 'Girl not found' });

    // Check for existing active chat
    const existing = await Chat.findOne({ 
      clientId: req.user._id, 
      girlId, 
      status: { $in: ['waiting', 'active'] } 
    });
    if (existing) return res.json({ chat: existing });

    const chat = await Chat.create({
      clientId: req.user._id,
      girlId,
      botState: { step: BOT_STATES.GREET, context: new Map() }
    });

    // Initial bot message
    const settings = await import('../models/Settings.js');
    const initialMsg = await Message.create({
      chatId: chat._id,
      sender: 'bot',
      text: (await settings.default.get()).botMessages.greet,
      type: 'quick_reply',
      payload: { 
        options: ['Москва', 'СПб', 'Казань', 'Екатеринбург', 'Новосибирск'].map(city => ({ text: city, value: city })) 
      }
    });

    res.status(201).json({ 
      chat: chat.toObject(), 
      initialMessage: initialMsg.toObject() 
    });
  } catch (err) {
    console.error('Create chat error:', err);
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

export const getChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('clientId', 'username')
      .populate('girlId', 'name photo city')
      .populate('operatorId', 'username');
    
    if (!chat || (chat.clientId._id.toString() !== req.user._id.toString() && req.user.role === 'client')) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages = await Message.find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ chat: chat.toObject(), messages });
  } catch (err) {
    console.error('Get chat error:', err);
    res.status(500).json({ error: 'Failed to load chat' });
  }
};

export const getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({ clientId: req.user._id })
      .populate('girlId', 'name photo city rating')
      .sort({ lastMessageAt: -1 })
      .limit(20);
    
    res.json({ chats });
  } catch (err) {
    console.error('Get my chats error:', err);
    res.status(500).json({ error: 'Failed to load chats' });
  }
};