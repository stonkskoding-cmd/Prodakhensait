import mongoose from 'mongoose';

export const connectDB = async () => {
  // === ОТЛАДКА ===
  console.log('🔍 Пытаюсь подключиться к MongoDB...');
  console.log('🔍 process.env.MONGODB_URI =', process.env.MONGODB_URI ? 'НАЙДЕНА ✅' : 'НЕ НАЙДЕНА ❌ (undefined)');
  if (process.env.MONGODB_URI) {
    console.log('🔗 Значение:', process.env.MONGODB_URI.substring(0, 30) + '...');
  }
  // ===============
  
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI не найдена в .env файле!');
    }
    
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
    
    // Handle connection events
    mongoose.connection.on('error', err => console.error('❌ DB Error:', err));
    mongoose.connection.on('disconnected', () => console.log('⚠️ DB disconnected'));
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 DB connection closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};