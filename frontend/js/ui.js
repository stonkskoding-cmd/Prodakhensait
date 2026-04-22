export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export const renderGirls = (girls, container, onOrder) => {
  container.innerHTML = girls.map(girl => `
    <article class="girl-card glass glow-hover" data-id="${girl._id}">
      <img class="girl-photo" src="${girl.photo}" alt="${girl.name}" loading="lazy" />
      <div class="girl-info">
        <div class="girl-name">${girl.name}</div>
        <div class="girl-meta">
          <span>${girl.city}</span> • <span>${girl.age} лет</span>
        </div>
        <div class="girl-rating">⭐ ${girl.rating}</div>
        <div class="girl-services">
          ${girl.services.slice(0, 2).map(s => 
            `<span class="service-tag">${s.name}</span>`
          ).join('')}
        </div>
      </div>
      <button class="btn btn-primary btn-block order-btn">Заказать 💫</button>
    </article>
  `).join('');

  $$('.order-btn', container).forEach((btn, i) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      onOrder(girls[i]);
    };
  });
};

export const renderMessage = (msg, isOwn) => `
  <div class="message ${msg.sender} ${isOwn ? 'own' : ''}">
    <div class="message-text">${escapeHtml(msg.text || '')}</div>
    ${msg.payload?.options ? `
      <div class="quick-replies">
        ${msg.payload.options.map(opt => 
          `<button class="quick-reply" data-value="${opt.value}">${opt.text}</button>`
        ).join('')}
      </div>
    ` : ''}
    <div class="message-meta">${formatTime(msg.createdAt)}</div>
  </div>
`;

export const renderChatItem = (chat) => {
  const girl = chat.girlId || {};
  const last = chat.lastMessage;
  return `
    <div class="chat-item glass" data-chat-id="${chat._id}">
      <img class="chat-avatar" src="${girl.photo || '/assets/default.jpg'}" alt="${girl.name}" />
      <div class="chat-item-preview">
        <div class="chat-item-name">${girl.name || '—'}</div>
        <div class="chat-item-last">${last?.text || 'Новый чат'}</div>
      </div>
      <div style="text-align:right">
        <div class="chat-item-time">${formatTime(chat.lastMessageAt || chat.createdAt)}</div>
        <span class="chat-item-status ${chat.status}"></span>
      </div>
    </div>
  `;
};

export const showModal = (content) => {
  const modal = $('#modal');
  const backdrop = $('#modalBackdrop');
  const modalContent = $('#modalContent');
  
  modalContent.innerHTML = content;
  modal.classList.add('active', 'modal-in');
  
  const close = () => {
    modal.classList.remove('active', 'modal-in');
    modalContent.innerHTML = '';
  };
  
  backdrop.onclick = close;
  document.onkeydown = (e) => { if (e.key === 'Escape') close(); };
  
  return close;
};

export const switchView = (viewId) => {
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view-${viewId}`)?.classList.add('active');
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  $(`.nav-btn[data-view="${viewId}"]`)?.classList.add('active');
};

// Helpers
const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};