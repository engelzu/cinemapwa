import { AuthService } from '../services/authService';
import { supportModal } from './supportModal';

export interface HeaderCallbacks {
  onSearch: (query: string) => void;
  onFilterCategory: (category: string) => void;
  onShowFavorites: () => void;
  onOpenAdmin: () => void;
  onNavigateHome: () => void;
}

export function renderHeader(callbacks: HeaderCallbacks): HTMLElement {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.id = 'main-nav-header';

  header.innerHTML = `
    <div class="header-inner">
      <div class="header-left">
        <a href="#home" class="brand-logo" id="brand-logo-link">
          <div class="logo-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="2" y1="7" x2="7" y2="7"></line>
              <line x1="2" y1="17" x2="7" y2="17"></line>
              <line x1="17" y1="17" x2="22" y2="17"></line>
              <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
          </div>
          <span class="brand-name">Cine<strong>PWA</strong></span>
          <span class="brand-badge-br">BRASIL</span>
        </a>

        <nav class="nav-links">
          <button class="nav-link active" id="nav-btn-home">Início</button>
          <button class="nav-link" id="nav-btn-catalog">Catálogo</button>
          <button class="nav-link" id="nav-btn-favorites">Minha Lista</button>
        </nav>
      </div>

      <div class="header-center">
        <div class="search-box">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="search" 
            id="global-search-input" 
            class="search-input" 
            placeholder="Buscar filmes autorizados..." 
            autocomplete="off"
          />
          <button class="search-clear-btn hidden" id="search-clear-btn" title="Limpar busca">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="header-right">
        <!-- Indicador de Rede Online / Offline -->
        <div class="network-badge online" id="network-status-indicator" title="Conexão ativa">
          <span class="network-dot"></span>
          <span class="network-text">Online</span>
        </div>

        <!-- Botão Instalar PWA -->
        <button class="btn btn-pwa-install hidden" id="pwa-install-btn" title="Instalar aplicativo no seu celular ou PC">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Instalar App</span>
        </button>

        <!-- Botão Suporte / Sobre EngelMobile (?) -->
        <button class="btn-help-header" id="header-help-btn" title="EngelMobile Sistemas e Apps personalizados (51) 99740-3703">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none"></circle>
          </svg>
        </button>

        <!-- Botão Painel Admin -->
        <button class="btn btn-admin-header" id="header-admin-btn" title="Acessar painel administrativo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span id="header-admin-label">Admin</span>
        </button>
      </div>
    </div>
  `;

  // Listeners
  header.querySelector('#header-help-btn')?.addEventListener('click', () => {
    supportModal.open();
  });
  header.querySelector('#brand-logo-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onNavigateHome();
  });

  header.querySelector('#nav-btn-home')?.addEventListener('click', () => {
    header.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    header.querySelector('#nav-btn-home')?.classList.add('active');
    callbacks.onNavigateHome();
  });

  header.querySelector('#nav-btn-catalog')?.addEventListener('click', () => {
    header.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    header.querySelector('#nav-btn-catalog')?.classList.add('active');
    const catalogEl = document.getElementById('catalog-section');
    catalogEl?.scrollIntoView({ behavior: 'smooth' });
  });

  header.querySelector('#nav-btn-favorites')?.addEventListener('click', () => {
    header.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    header.querySelector('#nav-btn-favorites')?.classList.add('active');
    callbacks.onShowFavorites();
  });

  const searchInput = header.querySelector('#global-search-input') as HTMLInputElement;
  const searchClear = header.querySelector('#search-clear-btn') as HTMLButtonElement;

  const triggerSearch = () => {
    const val = searchInput.value;
    if (val.trim()) {
      searchClear.classList.remove('hidden');
    } else {
      searchClear.classList.add('hidden');
    }
    callbacks.onSearch(val);
  };

  searchInput?.addEventListener('input', triggerSearch);
  searchInput?.addEventListener('search', triggerSearch);
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchInput.blur();
    }
  });

  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    callbacks.onSearch('');
    searchInput.focus();
  });

  header.querySelector('#header-admin-btn')?.addEventListener('click', () => {
    callbacks.onOpenAdmin();
  });

  // Atualizar label do admin quando logado
  AuthService.onStateChange((admin) => {
    const label = header.querySelector('#header-admin-label');
    const btn = header.querySelector('#header-admin-btn');
    if (label && btn) {
      if (admin) {
        label.textContent = 'Painel Admin';
        btn.classList.add('is-logged-in');
      } else {
        label.textContent = 'Admin';
        btn.classList.remove('is-logged-in');
      }
    }
  });

  // Atualizar status de rede online / offline
  const netBadge = header.querySelector('#network-status-indicator');
  const netText = header.querySelector('.network-text');

  function updateNetworkStatus() {
    if (!netBadge || !netText) return;
    if (navigator.onLine) {
      netBadge.className = 'network-badge online';
      netText.textContent = 'Online';
      netBadge.setAttribute('title', 'Conexão ativa');
    } else {
      netBadge.className = 'network-badge offline';
      netText.textContent = 'Offline';
      netBadge.setAttribute('title', 'Modo offline - navegando com dados em cache');
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  return header;
}
