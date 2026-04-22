import { state } from './state.js';
import { api } from './api.js';
import { $, $$, renderMessage, showModal } from './ui.js';

export class ChatManager {
  constructor(socket) {
    this.socket = socket;
    this.currentChatId = null;
    this._initListeners();
  }

  _initListeners() {
    // Incoming messages
    this.socket.on('message:new', (msg) => {
      if (msg.chatId === this.currentChatId) {
        this._appendMessage(msg);
        this._scrollToBottom();
      }
      // Update chats list preview
      this._updateChatPreview(msg.chatId, msg);
    });

    // Chat status changes
    this.socket.on('chat:status', ({ status, operator }) => {
      const statusEl = $('#chatStatus');
      if (statusEl) {
        statusEl.textContent = status === 'active' ? `онлайн • ${operator}` : status;
        statusEl.className = `chat-status ${status}`;
      }
      if (status === 'closed') {
        showModal('<p>Чат завершён. <a href="#" onclick="location.reload()">Начать новый</a></p>');
      }
    });

    // Operator assigned
    this.socket.on('chat:assigned', (chat) => {
      if (chat._id === this.currentChatId) {
        this._appendSystemMessage(`Оператор ${chat.operatorId?.username} подключился`);
      }
    });
  }

  async openChat(chatId, girl) {
    try {
      const { chat, messages } = await api.get(`/chat/${chatId}`);
      this.currentChatId = chatId;
      
      // Update UI
      $('#chatName').textContent = girl?.name || chat.girlId?.name;
      $('#chatAvatar').src = girl?.photo || chat.girlId?.photo;
      $('#chatStatus').textContent = chat.status;
      
      // Render messages
      const container = $('#chatMessages');
      container.innerHTML = messages.map(m => renderMessage(m, m.sender === 'client')).join('');
      this._scrollToBottom();
      
      // Join socket room
      this.socket.joinChat(chatId);
      
      // Show chat view
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-chat').classList.add('active');
      
    } catch (err) {
      console.error('Failed to open chat:', err);
      showModal(`<p>❌ ${err.message}</p>`);
    }
  }

  async createChat(girlId) {
    try {
      const { chat, initialMessage } = await api.post('/chat', { girlId });
      await this.openChat(chat._id, { name: 'BABYGIRL Bot', photo: '/assets/bot.jpg' });
      if (initialMessage) {
        this._appendMessage(initialMessage);
        this._renderQuickReplies(initialMessage.payload?.options);
      }
      return chat;
    } catch (err) {
      console.error('Failed to create chat:', err);
      showModal(`<p>❌ ${err.message}</p>`);
    }
  }

  sendMessage(text, payload) {
    if (!this.currentChatId) return;
    this.socket.sendMessage(this.currentChatId, text, payload);
    $('#messageInput').value = '';
    $('#quickReplies').innerHTML = '';
  }

  _appendMessage(msg) {
    const container = $('#chatMessages');
    const isOwn = msg.sender === 'client';
    container.insertAdjacentHTML('beforeend', renderMessage(msg, isOwn));
    
    // Handle quick replies
    if (msg.payload?.options && msg.sender === 'bot') {
      this._renderQuickReplies(msg.payload.options);
    }
  }

  _appendSystemMessage(text) {
    const container = $('#chatMessages');
    container.insertAdjacentHTML('beforeend', `
      <div class="message system" style="align-self:center;opacity:0.7;font-size:0.9em">
        ${text}
      </div>
    `);
  }

  _renderQuickReplies(options) {
    const container = $('#quickReplies');
    container.innerHTML = options.map(opt => 
      `<button class="quick-reply" data-value="${opt.value}">${opt.text}</button>`
    ).join('');
    
    $$('.quick-reply', container).forEach(btn => {
      btn.onclick = () => {
        const value = btn.dataset.value;
        const text = btn.textContent;
        this.sendMessage(text, { value });
      };
    });
  }

  _scrollToBottom() {
    const container = $('#chatMessages');
    container.scrollTop = container.scrollHeight;
  }

  _updateChatPreview(chatId, msg) {
    // Could update chats list in real-time
    // For now, skip for brevity
  }
}