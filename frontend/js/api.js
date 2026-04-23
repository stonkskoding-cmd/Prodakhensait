const API_BASE = 'https://prodakhen.onrender.com/api';

export class ApiClient {
  constructor(getToken) {
    this.getToken = getToken;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  }

  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}

export const api = new ApiClient(() => localStorage.getItem('token'));
