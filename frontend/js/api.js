const API_BASE = 'http://localhost:3000/api';;

export class ApiClient {
  constructor(getToken) {
    this.getToken = getToken;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      console.error('API Error:', err.message);
      throw err;
    }
  }

  get(endpoint, options) { return this.request(endpoint, { ...options, method: 'GET' }); }
  post(endpoint, body, options) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }
  put(endpoint, body, options) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }
  delete(endpoint, options) { return this.request(endpoint, { ...options, method: 'DELETE' }); }
}

export const api = new ApiClient(() => {
  // Dynamic import to avoid circular deps
  return (globalThis.appState || {}).token || localStorage.getItem('token');
});