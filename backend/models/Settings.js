import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'BABYGIRL_LNR' },
  welcomeText: { type: String, default: 'Премиум знакомства' },
  contactTelegram: { type: String, default: '@support' },
  maintenanceMode: { type: Boolean, default: false },
  botMessages: {
    greet: { type: String, default: 'Привет! 👋 Выбери город:' },
    cityPrompt: { type: String, default: 'Где ищем? 💫' },
    girlSelected: { type: String, default: 'Отличный выбор! 🔥 Ожидай подключения оператора...' }
  }
}, { timestamps: true });

// Singleton pattern - only one settings document
settingsSchema.statics.get = async function() {
  let settings = await this.findOne();
  if (!settings) settings = await this.create({});
  return settings;
};

export default mongoose.model('Settings', settingsSchema);