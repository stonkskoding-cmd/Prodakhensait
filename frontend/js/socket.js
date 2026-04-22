export class SocketClient {
  constructor(url, getToken) {
    this.url = url;
    this.getToken = getToken;
    this.socket = null;
    this.handlers = new Map();
  }

  connect() {
    const token = this.getToken();
    if (!token) return console.warn('Socket: no token');

    this.socket = new WebSocket(`${this.url}?token=${token}`);
    
    this.socket.onopen = () => {
      console.log('🔌 WebSocket connected');
      this._emit('connected');
    };

    this.socket.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data);
        this._emit(event, data);
      } catch (err) {
        console.error('Socket parse error:', err);
      }
    };

    this.socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this._emit('disconnected');
      // Auto-reconnect after 3s
      setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (err) => console.error('Socket error:', err);
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
    return () => {
      const list = this.handlers.get(event);
      const idx = list.indexOf(handler);
      if (idx > -1) list.splice(idx, 1);
    };
  }

  emit(event, data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  joinChat(chatId) { this.emit('chat:join', chatId); }
  sendMessage(chatId, text, payload) { this.emit('message:send', { chatId, text, payload }); }
  operatorAccept(chatId) { this.emit('operator:accept', chatId); }
  operatorClose(chatId) { this.emit('operator:close', chatId); }

  _emit(event, data) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(h => {
      try { h(data); }
      catch (e) { console.error(`Handler error for ${event}:`, e); }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// Note: For production, use socket.io-client library instead of raw WebSocket
// This is a simplified version for demonstration