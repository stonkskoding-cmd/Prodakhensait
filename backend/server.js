import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { SocketService } from './services/socketService.js';
import { connectDB } from './config/db.js';

// 1. Настройка путей
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 2. ЗАГРУЗКА .env
const envPath = join(__dirname, '.env');
dotenv.config({ path: envPath });

// 3. Проверка
if (!process.env.MONGODB_URI) {
  console.error('❌ ОШИБКА: MONGODB_URI не найдена в .env!');
  process.exit(1);
}

console.log('✅ .env загружен. Подключаюсь к БД...');

// 4. Глобальная переменная для io
let io;

// 5. Запуск
async function startServer() {
  try {
    // Подключаем БД
    await connectDB();
    console.log('✅ БД подключена!');

    const PORT = process.env.PORT || 3000;
    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.io
    io = new Server(server, {
      cors: { 
        origin: process.env.FRONTEND_URL || 'http://localhost:8080', 
        methods: ['GET', 'POST'] 
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    const socketService = new SocketService(io);
    socketService.init();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received, shutting down...');
      server.close(() => {
        console.log('🔌 Server closed');
        process.exit(0);
      });
    });

    // Слушаем все интерфейсы (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🔗 Network: http://127.0.0.1:${PORT}`);
});

  } catch (err) {
    console.error('❌ Ошибка запуска сервера:', err);
    process.exit(1);
  }
}

// Запускаем
startServer();

// Экспорт (на верхнем уровне!)
export { io };