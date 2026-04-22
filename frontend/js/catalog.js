import { state } from './state.js';
import { api } from './api.js';
import { $, $$, renderGirls, showModal } from './ui.js';

export class CatalogManager {
  constructor(onOrder) {
    this.onOrder = onOrder;
    this._initFilters();
  }

  _initFilters() {
    $('#cityFilter').onchange = () => this.load();
    $('#onlineOnly').onchange = () => this.load();
  }

  async load() {
    const container = $('#girlsGrid');
    const loading = $('#catalogLoading');
    
    try {
      state.set('loading', true);
      loading.style.display = 'flex';
      container.innerHTML = '';
      
      const params = new URLSearchParams();
      const city = $('#cityFilter').value;
      const online = $('#onlineOnly').checked;
      
      if (city) params.append('city', city);
      if (online) params.append('online', 'true');
      
      const { girls } = await api.get(`/girls?${params}`);
      state.set('girls', girls);
      
      renderGirls(girls, container, this.onOrder);
      
    } catch (err) {
      container.innerHTML = `<p style="text-align:center;color:var(--error)">❌ ${err.message}</p>`;
    } finally {
      state.set('loading', false);
      loading.style.display = 'none';
    }
  }
}