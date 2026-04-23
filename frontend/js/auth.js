import { api } from './api.js';

const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');

const loginBtn = document.querySelector('#loginBtn');
const registerBtn = document.querySelector('#registerBtn');

async function login() {
  try {
    const data = await api.post('/auth/login', {
      email: emailInput.value,
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
      email: emailInput.value,
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
