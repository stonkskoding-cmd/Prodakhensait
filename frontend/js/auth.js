import { api } from './api.js';

const usernameInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');

const loginBtn = document.querySelector('#loginBtn');
const registerBtn = document.querySelector('#registerBtn');

async function login() {
  try {
    const data = await api.post('/auth/login', {
      username: usernameInput.value,
      password: passwordInput.value
    });

    localStorage.setItem('token', data.token);
    alert('Вход успешен');
    location.reload();
  } catch (e) {
    alert('Ошибка логина: ' + e.message);
  }
}

async function register() {
  try {
    const data = await api.post('/auth/register', {
      username: usernameInput.value,
      password: passwordInput.value
    });

    localStorage.setItem('token', data.token);
    alert('Регистрация успешна');
    location.reload();
  } catch (e) {
    alert('Ошибка регистрации: ' + e.message);
  }
}

loginBtn.onclick = login;
registerBtn.onclick = register;
