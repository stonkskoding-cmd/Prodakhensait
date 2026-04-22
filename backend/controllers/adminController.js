import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

export const getOperatorChats = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { status: status || { $in: ['waiting', 'active'] } };
    
    const chats = await Chat.find(filter)
      .populate('clientId', 'username')
      .populate('girlId', 'name photo city')
      .populate('operatorId', 'username')
      .sort({ lastMessageAt: -1 })
      .limit(50);

    // Get last message preview
    const chatsWithPreview = await Promise.all(chats.map(async chat => {
      const lastMsg = await Message.findOne({ chatId: chat._id })
        .sort({ createdAt: -1 })
        .select('text sender createdAt');
      return { ...chat.toObject(), lastMessage: lastMsg };
    }));

    res.json({ chats: chatsWithPreview });
  } catch (err) {
    console.error('Get operator chats error:', err);
    res.status(500).json({ error: 'Failed to load chats' });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.get();
    res.json({ settings });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, { 
      new: true, upsert: true, runValidators: true 
    });
    res.json({ settings });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const getStats = async (req, res) => {
  try {
    const [totalChats, activeChats, totalUsers, totalGirls] = await Promise.all([
      Chat.countDocuments(),
      Chat.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'client' }),
      Girl.countDocuments()
    ]);

    res.json({ stats: { totalChats, activeChats, totalUsers, totalGirls } });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};