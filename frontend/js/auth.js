import { state } from './state.js';
import { api } from './api.js';
import { $, showModal, switchView } from './ui.js';

export class AuthManager {
  constructor(onAuthChange) {
    this.onAuthChange = onAuthChange;
    this._initForm();
    this._initToggle();
    this._initLogout();
  }

  _initForm() {
    let isRegister = false;
    
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      const username = $('#username').value.trim();
      const password = $('#password').value;
      
      try {
        const endpoint = isRegister ? '/auth/register' : '/auth/login';
        const { token, user } = await api.post(endpoint, { username, password });
        
        state.update({ token, user });
        this.onAuthChange(user);
        switchView('catalog');
        showModal('<p>✨ Добро пожаловать!</p>');
        
      } catch (err) {
        showModal(`<p>❌ ${err.message}</p>`);
      }
    };
    
    window.toggleAuthMode = (e) => {
      e?.preventDefault();
      isRegister = !isRegister;
      $('#authForm').querySelector('button').textContent = isRegister ? 'Создать аккаунт' : 'Войти';
      $('#toggleAuthMode').textContent = isRegister ? 'Войти' : 'Создать';
    };
  }

  _initToggle() {
    $('#authBtn').onclick = () => {
      if (state.isAuthenticated()) {
        switchView('profile');
      } else {
        switchView('auth');
      }
    };
  }

  _initLogout() {
    $('#logoutBtn').onclick = () => {
      state.reset();
      this.onAuthChange(null);
      switchView('catalog');
      showModal('<p>👋 Вы вышли из аккаунта</p>');
    };
  }

  updateUI(user) {
    const authBtn = $('#authBtn');
    const profileName = $('#profileUsername');
    
    if (user) {
      authBtn.textContent = user.username.slice(0, 12);
      authBtn.classList.replace('btn-secondary', 'btn-primary');
      if (profileName) profileName.textContent = user.username;
    } else {
      authBtn.textContent = 'Войти';
      authBtn.classList.replace('btn-primary', 'btn-secondary');
    }
  }
}