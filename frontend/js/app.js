import { state } from './state.js';
import { api } from './api.js';
import { SocketClient } from './socket.js';
import { $, $$, switchView, showModal } from './ui.js';
import { AuthManager } from './auth.js';
import { CatalogManager } from './catalog.js';
import { ChatManager } from './chat.js';

// Global state access for api.js
globalThis.appState = state;

class App {
  constructor() {
    this.socket = null;
    this.auth = null;
    this.catalog = null;
    this.chat = null;
  }

  async init() {
    // Animate logo
    setTimeout(() => $('#logo')?.classList.add('logo-animate'), 300);
    
    // Check auth
    if (state.token) {
      try {
        const { user } = await api.get('/auth/me');
        state.set('user', user);
      } catch {
        state.reset();
      }
    }
    
    // Init managers
    this.auth = new AuthManager((user) => {
      this._onAuthChange(user);
    });
    this.auth.updateUI(state.user);
    
    this.catalog = new CatalogManager((girl) => {
      if (!state.isAuthenticated()) {
        showModal('<p>🔐 Войдите, чтобы заказать</p>');
        switchView('auth');
        return;
      }
      this._handleOrder(girl);
    });
    
    // Connect socket if authenticated
    if (state.token) {
      this._connectSocket();
    }
    
    // Navigation
    $$('.nav-btn').forEach(btn => {
      btn.onclick = () => {
        const view = btn.dataset.view;
        if (view === 'chats' && state.isAuthenticated()) {
          this._loadChatsList();
        }
        switchView(view);
      };
    });
    
    $('#chatBack').onclick = () => switchView(state.user ? 'catalog' : 'auth');
    
    // Chat form
    $('#chatForm').onsubmit = (e) => {
      e.preventDefault();
      const text = $('#messageInput').value.trim();
      if (text && this.chat) this.chat.sendMessage(text);
    };
    
    // Quick replies delegation
    $('#chatMessages').onclick = (e) => {
      if (e.target.classList.contains('quick-reply') && this.chat) {
        const value = e.target.dataset.value;
        const text = e.target.textContent;
        this.chat.sendMessage(text, { value });
      }
    };
    
    // Load catalog
    await this.catalog.load();
    
    // Update profile stats
    this._updateStats();
    
    console.log('✨ BABYGIRL_LNR frontend initialized');
  }

  _onAuthChange(user) {
    this.auth.updateUI(user);
    if (user) {
      this._connectSocket();
      this._updateStats();
    } else {
      this.socket?.disconnect();
      this.socket = null;
    }
  }

  _connectSocket() {
   const wsUrl = 'wss://prodakhen.onrender.com';
    this.socket = new SocketClient(wsUrl, () => state.token);
    this.socket.connect();
    this.chat = new ChatManager(this.socket);
  }

  async _handleOrder(girl) {
    try {
      const chat = await this.chat.createChat(girl._id);
      // Chat view already opened by createChat
    } catch (err) {
      console.error('Order failed:', err);
    }
  }

  async _loadChatsList() {
    try {
      const { chats } = await api.get('/chat/my');
      state.set('chats', chats);
      
      const container = $('#chatsList');
      container.innerHTML = chats.map(chat => {
        const girl = chat.girlId || {};
        return `
          <div class="chat-item glass" data-chat-id="${chat._id}">
            <img class="chat-avatar" src="${girl.photo || '/assets/default.jpg'}" alt="${girl.name}" />
            <div style="flex:1;min-width:0">
              <div style="font-weight:600">${girl.name || '—'}</div>
              <div style="font-size:0.9em;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${chat.status === 'waiting' ? 'Ожидает оператора...' : 'Активен'}
              </div>
            </div>
            <span class="chat-item-status ${chat.status}"></span>
          </div>
        `;
      }).join('') || '<p style="text-align:center;color:var(--text-muted)">Нет чатов</p>';
      
      $$('.chat-item', container).forEach(item => {
        item.onclick = async () => {
          const chatId = item.dataset.chatId;
          const chat = chats.find(c => c._id === chatId);
          if (chat?.girlId) {
            await this.chat.openChat(chatId, chat.girlId);
          }
        };
      });
      
    } catch (err) {
      $('#chatsList').innerHTML = `<p style="text-align:center;color:var(--error)">❌ ${err.message}</p>`;
    }
  }

  async _updateStats() {
    if (!state.user) return;
    try {
      const { chats } = await api.get('/chat/my');
      $('#statChats').textContent = chats.length;
      $('#statOrders').textContent = chats.filter(c => c.status !== 'closed').length;
    } catch {}
  }
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
