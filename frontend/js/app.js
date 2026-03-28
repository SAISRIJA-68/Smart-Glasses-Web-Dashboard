/**
 * Smart Glasses Dashboard — Core JS
 * API client, auth, storage, utilities
 */

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = window.location.origin + '/api';

// ─── Auth Store ───────────────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('sg_token'),
  getUser: () => JSON.parse(localStorage.getItem('sg_user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('sg_token', token);
    localStorage.setItem('sg_user', JSON.stringify(user));
  },
  clearAuth: () => {
    localStorage.removeItem('sg_token');
    localStorage.removeItem('sg_user');
  },
  isLoggedIn: () => !!localStorage.getItem('sg_token'),
  requireAuth: () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }
};

// ─── API Client ───────────────────────────────────────────────────────────────
const API = {
  req: async (method, path, body, isFormData = false) => {
    const headers = {};
    if (Auth.getToken()) headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
    });
    if (res.status === 401) {
      Auth.clearAuth();
      window.location.href = '/login.html';
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get: (path) => API.req('GET', path),
  post: (path, body) => API.req('POST', path, body),
  patch: (path, body) => API.req('PATCH', path, body),
  delete: (path) => API.req('DELETE', path),

  // Auth
  signup: (data) => API.post('/auth/signup', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),

  // Media
  uploadMedia: (data) => API.post('/media/upload', data),
  getMedia: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return API.get('/media' + (q ? '?' + q : ''));
  },
  updateMedia: (id, data) => API.patch('/media/' + id, data),
  deleteMedia: (id) => API.delete('/media/' + id),
  shareMedia: (id) => API.post('/media/' + id + '/share', {}),
  getShared: (shareId) => API.get('/share/' + shareId),

  // Stats
  getStats: () => API.get('/stats')
};

// ─── Toast Notifications ──────────────────────────────────────────────────────
const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 3500) {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
    this.container.appendChild(toast);
    requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },
  success: (m) => Toast.show(m, 'success'),
  error: (m) => Toast.show(m, 'error'),
  info: (m) => Toast.show(m, 'info')
};

// ─── Modal Manager ────────────────────────────────────────────────────────────
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-backdrop.open').forEach(el => {
      el.classList.remove('open');
    });
    document.body.style.overflow = '';
  }
};

// ─── Theme Manager ────────────────────────────────────────────────────────────
const Theme = {
  init() {
    const saved = localStorage.getItem('sg_theme') || 'dark';
    if (saved === 'light') document.body.classList.add('light-mode');
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => Theme.toggle());
    });
  },
  toggle() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('sg_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
  }
};

// ─── HUD Clock ────────────────────────────────────────────────────────────────
const HUD = {
  battery: 85,
  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.updateBattery();
  },
  updateClock() {
    const el = document.getElementById('hud-time');
    if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateEl = document.getElementById('hud-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  },
  updateBattery() {
    const fill = document.querySelector('.battery-fill');
    const pct = document.querySelector('.battery-pct');
    if (fill) fill.style.width = this.battery + '%';
    if (pct) pct.textContent = this.battery + '%';
  }
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = {
  init() {
    const toggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
      });
    }

    // Highlight active link
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href.includes(path) || (path === 'index.html' && href === '/') || (path === '' && href === '/')) {
        a.classList.add('active');
      }
    });

    // User info
    const user = Auth.getUser();
    if (user) {
      const nameEl = document.getElementById('sidebar-username');
      const avatarEl = document.getElementById('sidebar-avatar');
      if (nameEl) nameEl.textContent = user.username;
      if (avatarEl) avatarEl.textContent = user.username.slice(0, 2).toUpperCase();
    }

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      Auth.clearAuth();
      window.location.href = '/login.html';
    });
  }
};

// ─── Tags Input ───────────────────────────────────────────────────────────────
class TagsInput {
  constructor(container) {
    this.container = container;
    this.tags = [];
    this.input = document.createElement('input');
    this.input.className = 'tags-input';
    this.input.placeholder = 'Add tag...';
    container.appendChild(this.input);
    container.addEventListener('click', () => this.input.focus());
    this.input.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && this.input.value.trim()) {
        e.preventDefault();
        this.add(this.input.value.trim().replace(',', ''));
      }
      if (e.key === 'Backspace' && !this.input.value && this.tags.length) {
        this.remove(this.tags[this.tags.length - 1]);
      }
    });
  }
  add(tag) {
    if (!tag || this.tags.includes(tag)) return;
    this.tags.push(tag);
    const span = document.createElement('span');
    span.className = 'tag';
    span.innerHTML = `${tag}<button class="tag-remove" data-tag="${tag}">×</button>`;
    span.querySelector('.tag-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      this.remove(tag);
    });
    this.container.insertBefore(span, this.input);
    this.input.value = '';
  }
  remove(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this.container.querySelectorAll('.tag').forEach(el => {
      if (el.querySelector('[data-tag="' + tag + '"]')) el.remove();
    });
  }
  setTags(arr) {
    this.tags = [];
    this.container.querySelectorAll('.tag').forEach(el => el.remove());
    arr.forEach(t => this.add(t));
  }
  getTags() { return [...this.tags]; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Helpers = {
  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  },
  formatDateTime(dateStr) {
    return `${this.formatDate(dateStr)} ${this.formatTime(dateStr)}`;
  },
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },
  getTimeOfDay(dateStr) {
    const h = new Date(dateStr).getHours();
    if (h < 6)  return 'Night';
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    if (h < 21) return 'Evening';
    return 'Night';
  },
  groupByDate(items) {
    const groups = {};
    items.forEach(item => {
      const key = new Date(item.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      if (!groups[key]) groups[key] = {};
      const tod = this.getTimeOfDay(item.createdAt);
      if (!groups[key][tod]) groups[key][tod] = [];
      groups[key][tod].push(item);
    });
    return groups;
  },
  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => Toast.success('Copied to clipboard!'));
  },
  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }
};

// ─── Media Card Renderer ──────────────────────────────────────────────────────
function renderMediaCard(item, onClick, onDelete, onShare) {
  const card = document.createElement('div');
  card.className = 'media-card fade-in';
  card.dataset.id = item.id;

  const isVideo = item.type === 'video';
  const thumbHtml = isVideo
    ? `<video src="${item.url}" muted preload="metadata" style="pointer-events:none"></video>`
    : `<img src="${item.url}" alt="Captured photo" loading="lazy">`;

  card.innerHTML = `
    <div class="media-thumbnail">
      ${thumbHtml}
      <span class="media-type-badge">${isVideo ? '▶ VID' : '◉ PHO'}</span>
      <div class="media-overlay">
        <button class="btn btn-primary btn-icon" title="View" onclick="event.stopPropagation()">👁</button>
        <button class="btn btn-ghost btn-icon" title="Share" onclick="event.stopPropagation()">🔗</button>
        <button class="btn btn-danger btn-icon" title="Delete" onclick="event.stopPropagation()">🗑</button>
      </div>
    </div>
    <div class="media-info">
      <div class="media-date">${Helpers.formatDateTime(item.createdAt)}</div>
      ${item.location ? `<div class="media-date">📍 ${item.location}</div>` : ''}
      <div class="media-tags">${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
    </div>
  `;

  const [viewBtn, shareBtn, deleteBtn] = card.querySelectorAll('.media-overlay button');
  card.addEventListener('click', () => onClick && onClick(item));
  viewBtn.addEventListener('click', (e) => { e.stopPropagation(); onClick && onClick(item); });
  shareBtn.addEventListener('click', (e) => { e.stopPropagation(); onShare && onShare(item); });
  deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); onDelete && onDelete(item); });

  return card;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  Theme.init();

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) Modal.close(backdrop.id);
    });
  });
});
