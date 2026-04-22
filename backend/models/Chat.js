import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  girlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Girl',
    required: true
  },
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'closed'],
    default: 'waiting',
    index: true
  },
  botState: {
    step: {
      type: String,
      enum: ['greet', 'asking_city', 'picking_girl', 'girl_selected', 'waiting'],
      default: 'greet'
    },
    context: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for active chats lookup
chatSchema.index({ clientId: 1, status: 1 });
chatSchema.index({ operatorId: 1, status: 1 });

export default mongoose.model('Chat', chatSchema);