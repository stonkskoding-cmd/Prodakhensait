require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// === CONFIG ===
app.set('trust proxy', 1);
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// === DB CONNECTION ===
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  maxPoolSize: 10 
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => { console.error('❌ DB Error:', err); process.exit(1); });

// === MODELS ===
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'client'], default: 'client' },
}, { timestamps: true });

const GirlSchema = new mongoose.Schema({
  name: String, city: String, photos: [String], desc: String,
  height: String, weight: String, breast: String, age: String,
  prefs: String, services: [{ name: String, price: String }],
  createdAt: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  messages: [{ type: { type: String, enum: ['user','bot','system'] }, text: String, extra: mongoose.Schema.Types.Mixed, time: { type: Date, default: Date.now } }],
  botStep: { type: String, enum: ['greet', 'asking_city', 'picking_girl', 'girl_selected', 'waiting'], default: 'greet' },
  selectedGirl: mongoose.Schema.Types.Mixed,
  waitingForOperator: { type: Boolean, default: false },
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  mainTitle: { type: String, default: 'Анкеты девушек' },
  mainSubtitle: { type: String, default: 'Элитный сервис знакомств' },
  title: { type: String, default: 'BABYGIRL_LNR' },
  phone: String, globalBotEnabled: { type: Boolean, default: true }
});

const User = mongoose.model('User', UserSchema);
const Girl = mongoose.model('Girl', GirlSchema);
const Chat = mongoose.model('Chat', ChatSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// === SEED DATA (INITIALIZATION) ===
async function initDB() {
  try {
    if (!(await User.findOne({ username: 'admin' }))) 
      await User.create({ username: 'admin', password: 'admin123', role: 'admin' });
    if (!(await User.findOne({ username: 'operator2' }))) 
      await User.create({ username: 'operator2', password: 'operator123', role: 'admin' });
    if (!(await Settings.findOne())) 
      await Settings.create({ mainTitle: 'Анкеты девушек', mainSubtitle: 'Выберите идеальную компанию', title: 'BABYGIRL_LNR', phone: '+7 999 000-00-00' });
    if ((await Girl.countDocuments()) === 0) {
      await Girl.insertMany([
        { name: 'Алина', city: 'Луганск', desc: 'Нежная и романтичная.', height: '168', weight: '52', breast: '2', age: '21', prefs: 'Романтика', services: [{name:'Встреча',price:'3000'},{name:'Свидание',price:'5000'},{name:'Ночь',price:'10000'}] },
        { name: 'Виктория', city: 'Стаханов', desc: 'Яркая брюнетка.', height: '172', weight: '55', breast: '3', age: '23', prefs: 'Танцы', services: [{name:'Встреча',price:'3500'},{name:'Свидание',price:'6000'},{name:'Ночь',price:'12000'}] },
        { name: 'София', city: 'Первомайск', desc: 'Модельная внешность.', height: '165', weight: '48', breast: '2', age: '20', prefs: 'Фото', services: [{name:'Встреча',price:'2500'},{name:'Свидание',price:'4000'},{name:'Ночь',price:'8000'}] }
      ]);
    }
    console.log('✅ DB Seeded');
  } catch (e) { console.error('Seed Error:', e); }
}
initDB();

// === MIDDLEWARE ===
const isAdmin = async (req, res, next) => {
  const { username, password } = req.body; // Basic check for API calls, ideally use session/token
  // For simplicity in this structure, we rely on frontend state, but backend validates role if needed
  next();
};

// === ROUTES ===

// AUTH
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) res.json({ success: true, user });
  else res.status(401).json({ success: false, message: 'Неверный логин/пароль' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await User.create({ ...req.body, role: 'client' });
    res.json({ success: true, user });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// GIRLS
app.get('/api/girls', async (req, res) => {
  const { city } = req.query;
  const filter = city && city !== 'all' ? { city } : {};
  const girls = await Girl.find(filter).sort({ createdAt: -1 });
  res.json({ success: true,  girls });
});

app.post('/api/girls', async (req, res) => {
  const { action, girl } = req.body;
  try {
    if (action === 'add') return res.json({ success: true, data: await Girl.create(girl) });
    if (action === 'update') return res.json({ success: true, data: await Girl.findByIdAndUpdate(girl._id, girl, { new: true }) });
    if (action === 'delete') { await Girl.findByIdAndDelete(girl._id); return res.json({ success: true }); }
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// CHAT LOGIC (FSM)
async function processBotLogic(chat, text) {
  const settings = await Settings.findOne();
  if (!settings?.globalBotEnabled || chat.waitingForOperator) return null;

  const lower = text.toLowerCase();
  const cities = ['луганск', 'стаханов', 'первомайск'];

  if (chat.botStep === 'greet' || chat.botStep === 'asking_city') {
    const city = cities.find(c => lower.includes(c));
    if (city) {
      const girls = await Girl.find({ city: new RegExp(city, 'i') });
      chat.botStep = 'picking_girl';
      if (girls.length) return { text: `Отлично! В ${city} есть ${girls.length} анкет:`, extra: { type: 'girls_list', girls } };
      return { text: `В городе ${city} пока нет анкет.`, extra: { type: 'text' } };
    }
    chat.botStep = 'asking_city';
    return { text: 'Напишите город (Луганск, Стаханов, Первомайск).', extra: { type: 'text' } };
  }

  if (chat.botStep === 'picking_girl') {
    const girl = await Girl.findOne({ name: new RegExp(lower, 'i') });
    if (girl) {
      chat.selectedGirl = girl;
      chat.botStep = 'girl_selected';
      return { text: '💰 Оплата в руки. Выберите услугу:', extra: { type: 'services', girl } };
    }
    return { text: 'Напишите имя девушки из списка.', extra: { type: 'text' } };
  }

  if (chat.botStep === 'girl_selected' && chat.selectedGirl) {
    const service = chat.selectedGirl.services.find(s => lower.includes(s.name.toLowerCase()));
    if (service) {
      chat.waitingForOperator = true;
      chat.botStep = 'waiting';
      return { text: `✅ Вы выбрали: ${service.name} — ${service.price}₽\nЗаявка отправлена оператору.`, extra: { type: 'processing' } };
    }
    return { text: 'Напишите услугу (Встреча, Свидание, Ночь).', extra: { type: 'text' } };
  }

  return { text: 'Заявка в обработке, ожидайте оператора.', extra: { type: 'text' } };
}

// CHAT ROUTES
app.get('/api/chat/:uid', async (req, res) => {
  const chat = await Chat.findOne({ userId: req.params.uid });
  res.json({ success: true, messages: chat?.messages || [] });
});

app.post('/api/chat/init', async (req, res) => {
  const { username, girlId } = req.body;
  let girl = await Girl.findById(girlId);
  if (!girl && !isNaN(girlId)) girl = await Girl.findOne({ id: parseInt(girlId) });
  if (!girl) return res.status(404).json({ success: false, message: 'Girl not found' });

  let chat = await Chat.findOne({ userId: username });
  if (!chat) {
    chat = await Chat.create({ userId: username, botStep: 'girl_selected', selectedGirl: girl, messages: [] });
  } else {
    chat.messages = [];
    chat.selectedGirl = girl;
    chat.botStep = 'girl_selected';
    chat.waitingForOperator = false;
    await chat.save();
  }

  chat.messages.push(
    { type: 'bot', text: `Здравствуйте! 👋 Вы выбрали ${girl.name}:`, time: new Date() },
    { type: 'bot', text: '', extra: { type: 'profile', girl }, time: new Date() },
    { type: 'bot', text: '💰 Оплата в руки. Выберите услугу:', extra: { type: 'services', girl }, time: new Date() }
  );
  
  await chat.save();
  res.json({ success: true, messages: chat.messages });
});

app.post('/api/chat/send', async (req, res) => {
  const { username, text } = req.body;
  let chat = await Chat.findOne({ userId: username });
  if (!chat) chat = await Chat.create({ userId: username, messages: [] });

  chat.messages.push({ type: 'user', text, time: new Date() });
  const reply = await processBotLogic(chat, text);
  
  if (reply) chat.messages.push({ type: 'bot', ...reply, time: new Date() });
  await chat.save();
  res.json({ success: true, reply });
});

app.post('/api/chat/admin/reply', async (req, res) => {
  const { userId, text } = req.body;
  const chat = await Chat.findOne({ userId });
  if (!chat) return res.status(404).json({ success: false });
  
  if (chat.messages.length && chat.messages[chat.messages.length-1].extra?.type === 'processing') chat.messages.pop();
  chat.messages.push({ type: 'bot', text: `[Оператор] ${text}`, time: new Date() });
  
  chat.waitingForOperator = false;
  chat.botStep = 'greet';
  chat.selectedGirl = null;
  
  await chat.save();
  res.json({ success: true });
});

app.put('/api/chat/:uid/clear', async (req, res) => {
  await Chat.findOneAndUpdate({ userId: req.params.uid }, { messages: [], botStep: 'greet', waitingForOperator: false, selectedGirl: null });
  res.json({ success: true });
});

app.get('/api/admin/chats', async (req, res) => {
  res.json(await Chat.find().sort({ updatedAt: -1 }));
});

app.get('/api/settings', async (req, res) => { res.json(await Settings.findOne() || {}); });

// SPA Fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
