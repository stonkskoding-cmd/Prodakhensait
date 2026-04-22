export class AppState {
  constructor() {
    this._state = {
      user: null,
      token: localStorage.getItem('token'),
      view: 'catalog',
      chats: [],
      currentChat: null,
      girls: [],
      filters: { city: '', onlineOnly: false },
      loading: false,
      socket: null
    };
    this._listeners = new Map();
  }

  get(key) { return this._state[key]; }
  
  set(key, value, notify = true) {
    this._state[key] = value;
    if (notify) this._notify(key, value);
    if (key === 'token') {
      if (value) localStorage.setItem('token', value);
      else localStorage.removeItem('token');
    }
  }

  update(partial, notify = true) {
    Object.entries(partial).forEach(([k, v]) => this.set(k, v, false));
    if (notify) Object.keys(partial).forEach(k => this._notify(k, this._state[k]));
  }

  subscribe(key, callback) {
    if (!this._listeners.has(key)) this._listeners.set(key, []);
    this._listeners.get(key).push(callback);
    return () => {
      const list = this._listeners.get(key);
      const idx = list.indexOf(callback);
      if (idx > -1) list.splice(idx, 1);
    };
  }

  _notify(key, value) {
    const listeners = this._listeners.get(key) || [];
    listeners.forEach(cb => {
      try { cb(value, this._state); }
      catch (e) { console.error('State listener error:', e); }
    });
  }

  isAuthenticated() { return !!this.token && !!this.user; }
  
  reset() {
    this.update({ user: null, token: null, currentChat: null, chats: [] });
  }
}

export const state = new AppState();