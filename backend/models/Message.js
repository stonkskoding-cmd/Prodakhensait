import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  sender: {
    type: String,
    enum: ['client', 'bot', 'operator'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sender === "operator" ? "operatorId" : "clientId"',
    default: null
  },
  text: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'service_select', 'quick_reply', 'system'],
    default: 'text'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// TTL index for auto-cleanup of old messages (optional, 2 years)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export default mongoose.model('Message', messageSchema);