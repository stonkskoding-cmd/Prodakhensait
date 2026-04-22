import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { BotService, BOT_STATES } from './botService.js';

export class SocketService {
  constructor(io) {
    this.io = io;
    this.onlineClients = new Map();
    this.onlineOperators = new Map();
  }

  init() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication required'));
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return next(new Error('User not found'));
        
        socket.user = user;
        socket.userId = user._id.toString();
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 Connected: ${socket.user.username} (${socket.user.role})`);
      
      // Track online status
      if (socket.user.role === 'operator') {
        this.onlineOperators.set(socket.userId, socket.id);
        socket.broadcast.emit('operator:online', { operatorId: socket.userId });
      } else {
        this.onlineClients.set(socket.userId, socket.id);
      }

      // Join chat room
      socket.on('chat:join', async (chatId) => {
        socket.join(`chat:${chatId}`);
        await Chat.findByIdAndUpdate(chatId, { lastSeenAt: new Date() });
      });

      // Send message
      socket.on('message:send', async ({ chatId, text, payload }) => {
        try {
          const chat = await Chat.findById(chatId).populate('clientId girlId operatorId');
          if (!chat) return socket.emit('error', { message: 'Chat not found' });

          const isOperator = socket.user.role === 'operator';
          const sender = isOperator ? 'operator' : 'client';
          
          // Save message
          const message = await Message.create({
            chatId,
            sender,
            senderId: socket.userId,
            text,
            type: payload ? 'quick_reply' : 'text',
            payload
          });

          // Broadcast to chat room
          this.io.to(`chat:${chatId}`).emit('message:new', {
            ...message.toObject(),
            senderName: isOperator ? `Оператор #${socket.user.username.slice(-3)}` : 'Вы'
          });

          // Handle bot flow for client messages
          if (!isOperator && chat.status === 'waiting') {
            const result = await BotService.processMessage(chat, payload?.value || text);
            
            if (result.botReply) {
              const botMsg = await Message.create({
                chatId,
                sender: 'bot',
                text: result.botReply,
                type: result.quickReplies ? 'quick_reply' : 'text',
                payload: result.quickReplies ? { options: result.quickReplies } : null
              });
              
              this.io.to(`chat:${chatId}`).emit('message:new', {
                ...botMsg.toObject(),
                senderName: 'BABYGIRL Bot'
              });
            }

            // Update chat state
            chat.botState.step = result.nextStep;
            if (result.context) {
              result.context.forEach((v, k) => chat.botState.context.set(k, v));
            }
            
            // Handoff to operator
            if (result.shouldHandoff) {
              chat.status = 'active';
              const availableOperator = await this.findAvailableOperator();
              if (availableOperator) {
                chat.operatorId = availableOperator._id;
                this.io.to(`operator:${availableOperator._id}`).emit('chat:assigned', chat.toObject());
              }
            }
            
            await chat.save();
          }

          // Operator reply resets bot
          if (isOperator && chat.botState.step !== BOT_STATES.WAITING) {
            await BotService.reset(chat);
          }

          // Update last message timestamp
          chat.lastMessageAt = new Date();
          await chat.save();

        } catch (err) {
          console.error('Socket message error:', err);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Operator actions
      socket.on('operator:accept', async (chatId) => {
        if (socket.user.role !== 'operator') return;
        const chat = await Chat.findByIdAndUpdate(
          chatId, 
          { status: 'active', operatorId: socket.userId },
          { new: true }
        );
        if (chat) {
          this.io.to(`chat:${chatId}`).emit('chat:status', { status: 'active', operator: `Оператор #${socket.user.username.slice(-3)}` });
          await BotService.reset(chat);
        }
      });

      socket.on('operator:close', async (chatId) => {
        if (socket.user.role !== 'operator') return;
        await Chat.findByIdAndUpdate(chatId, { status: 'closed' });
        this.io.to(`chat:${chatId}`).emit('chat:status', { status: 'closed' });
      });

      // Disconnect
      socket.on('disconnect', () => {
        if (socket.user.role === 'operator') {
          this.onlineOperators.delete(socket.userId);
          socket.broadcast.emit('operator:offline', { operatorId: socket.userId });
        } else {
          this.onlineClients.delete(socket.userId);
        }
        console.log(`🔌 Disconnected: ${socket.user.username}`);
      });
    });
  }

  async findAvailableOperator() {
    const operators = await User.find({ role: 'operator', isAnonymous: true });
    for (const op of operators) {
      if (this.onlineOperators.has(op._id.toString())) {
        return op;
      }
    }
    return null;
  }

  // Send notification to specific user
  notify(userId, event, data) {
    const socketId = this.onlineClients.get(userId) || this.onlineOperators.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
}