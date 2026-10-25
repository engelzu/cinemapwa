import './style.css';
import type { Movie } from './types';
import { MovieService } from './services/movieService';
import { ArchiveService } from './services/archiveService';
import { AuthService } from './services/authService';
import { renderHeader } from './components/header';
import { renderHeroBanner } from './components/heroBanner';
import { renderMovieCard } from './components/movieCard';
import { adminPanelModal } from './components/adminPanel';
import { supportModal } from './components/supportModal';
import { registerPWA } from './pwa';

class CineApp {
  private appEl: HTMLElement;
  private localMovies: Movie[] = [];
  private liveArchiveMovies: Movie[] = [];
  private currentLivePage: number = 1;
  private totalLiveFound: number = 0;
  private isLoadingLive: boolean = false;

  private searchQuery: string = '';
  private selectedCategory: string = 'Todos';
  private selectedEraTab: string = 'all'; // 'all', 'modern', 'classic', 'animacao', 'curta', 'longa'
  private selectedRating: string = 'all'; // 'all', 'L', '10', '12', '14', '16'
  private selectedAudio: string = 'all'; // 'all', 'Dublado', 'Legendado', 'Nacional', 'Sem Diálogo'
  private sortBy: 'recent' | 'oldest' | 'title' = 'recent';
  private viewingFavoritesOnly: boolean = false;

  constructor() {
    const el = document.getElementById('app');
    if (!el) throw new Error('#app root element not found');
    this.appEl = el;
    this.init();
  }

  private async init() {
    AuthService.init();
    registerPWA();

    // 1. Carregar acervo local e inicial
    this.localMovies = await MovieService.getPublicMovies();
    this.render();

    // 2. Carregar primeira página do acervo dinâmico em português
    await this.fetchLivePage(1, false);

    // Escutar eventos globais de atualização
    window.addEventListener('cinepwa:catalog-updated', async () => {
      this.localMovies = await MovieService.getPublicMovies();
      this.renderCatalogView();
    });

    window.addEventListener('cinepwa:favorites-changed', () => {
      if (this.viewingFavoritesOnly) {
        this.renderCatalogView();
      }
    });
  }

  private async fetchLivePage(page: number, append: boolean = false) {
    if (this.isLoadingLive) return;
    this.isLoadingLive = true;
    this.updateLoadMoreButtonState();

    try {
      const res = await ArchiveService.fetchLiveCatalog({
        searchQuery: this.searchQuery,
        category: this.selectedCategory,
        era: this.selectedEraTab,
        rating: this.selectedRating,
        audioLanguage: this.selectedAudio,
        page,
        rows: 50, // Carregar sempre de 50 em 50 conforme solicitado
        sort: this.sortBy
      });

      this.currentLivePage = page;
      this.totalLiveFound = res.total;

      const newMovies = res.movies.filter(
        rm => !this.localMovies.some(lm => lm.id === rm.id || lm.playbackUrl === rm.playbackUrl)
      );

      if (append) {
        this.liveArchiveMovies = [...this.liveArchiveMovies, ...newMovies];
        // Adicionar suavemente aos grids SEM recarregar a tela e SEM voltar para o topo!
        this.appendMoviesToCurrentView(newMovies);
      } else {
        this.liveArchiveMovies = newMovies;
        this.renderCatalogView();
      }
    } catch (e) {
      console.warn('Erro ao carregar acervo online em português:', e);
    } finally {
      this.isLoadingLive = false;
      this.updateLoadMoreButtonState();
    }
  }

  private render() {
    this.appEl.innerHTML = '';

    // 1. Cabeçalho Principal
    const header = renderHeader({
      onSearch: async (q) => {
        this.searchQuery = q.trim();
        this.viewingFavoritesOnly = false;
        this.liveArchiveMovies = [];
        this.currentLivePage = 1;
        this.renderCatalogView();
        await this.fetchLivePage(1, false);
      },
      onFilterCategory: async (cat) => {
        this.selectedCategory = cat;
        this.viewingFavoritesOnly = false;
        this.liveArchiveMovies = [];
        this.currentLivePage = 1;
        this.renderCatalogView();
        await this.fetchLivePage(1, false);
      },
      onShowFavorites: () => {
        this.viewingFavoritesOnly = true;
        this.searchQuery = '';
        this.renderCatalogView();
      },
      onOpenAdmin: () => {
        adminPanelModal.open();
      },
      onNavigateHome: async () => {
        this.searchQuery = '';
        this.selectedCategory = 'Todos';
        this.selectedEraTab = 'all';
        this.selectedRating = 'all';
        this.selectedAudio = 'all';
        this.sortBy = 'recent';
        this.viewingFavoritesOnly = false;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await this.fetchLivePage(1, false);
      }
    });
    this.appEl.appendChild(header);

    // 2. Hero Banner (apenas na visualização padrão da Home)
    if (!this.searchQuery && !this.viewingFavoritesOnly && this.selectedEraTab === 'all' && this.selectedCategory === 'Todos' && this.selectedRating === 'all' && this.selectedAudio === 'all') {
      const featuredMovie = this.localMovies.find(m => m.featured) || this.localMovies[0];
      if (featuredMovie) {
        const hero = renderHeroBanner(featuredMovie);
        this.appEl.appendChild(hero);
      }
    }

    // 3. Container Principal do Catálogo
    const catalogContainer = document.createElement('main');
    catalogContainer.className = 'main-catalog-container';
    catalogContainer.id = 'catalog-section';
    this.appEl.appendChild(catalogContainer);

    this.renderCatalogView();

    // 4. Rodapé Informativo & Legal
    this.renderFooter();

    // 5. Botão Flutuante de Informações & Suporte EngelMobile (?)
    const floatingBtn = document.createElement('button');
    floatingBtn.className = 'floating-help-btn';
    floatingBtn.id = 'floating-support-btn';
    floatingBtn.setAttribute('title', 'EngelMobile Sistemas e Apps personalizados (51) 99740-3703');
    floatingBtn.setAttribute('aria-label', 'Informações e Suporte EngelMobile');
    floatingBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
    floatingBtn.addEventListener('click', () => supportModal.open());
    this.appEl.appendChild(floatingBtn);
  }

  private getAllCombinedMovies(): Movie[] {
    const combined = [...this.localMovies, ...this.liveArchiveMovies];
    const uniqueMap = new Map<string, Movie>();
    combined.forEach(m => {
      if (!uniqueMap.has(m.id)) {
        uniqueMap.set(m.id, m);
      }
    });

    let list = Array.from(uniqueMap.values());

    // Filtro de Busca
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
        m.synopsis.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        String(m.year).includes(q)
      );
    }

    // Filtro de Favoritos
    if (this.viewingFavoritesOnly) {
      const favIds = MovieService.getFavoriteIds();
      list = list.filter(m => favIds.includes(m.id));
    }

    // Filtro de Áudio / Idioma (Dublado / Legendado / Nacional / Sem Diálogo)
    if (this.selectedAudio !== 'all') {
      list = list.filter(m => m.audioLanguage === this.selectedAudio);
    }

    // Filtro por Aba de Época / Tipo
    if (this.selectedEraTab === 'modern') {
      list = list.filter(m => m.era === 'modern' || m.year >= 2000);
    } else if (this.selectedEraTab === 'classic') {
      list = list.filter(m => m.era === 'classic' || m.year < 2000);
    } else if (this.selectedEraTab === 'animacao') {
      list = list.filter(m => m.type === 'animacao' || m.category.toLowerCase().includes('animação'));
    } else if (this.selectedEraTab === 'curta') {
      list = list.filter(m => m.type === 'curta' || (m.duration && !m.duration.includes('h')));
    } else if (this.selectedEraTab === 'longa') {
      list = list.filter(m => m.type === 'longa' || m.type === 'documentario' || (m.duration && m.duration.includes('h')));
    }

    // Filtro de Categoria / Gênero
    if (this.selectedCategory !== 'Todos') {
      list = list.filter(m => m.category.toLowerCase().includes(this.selectedCategory.toLowerCase()));
    }

    // Filtro de Classificação Indicativa (Etária)
    if (this.selectedRating !== 'all') {
      list = list.filter(m => {
        const r = String(m.contentRating || '').toUpperCase().replace('+', '');
        return r === this.selectedRating;
      });
    }

    // Ordenação
    if (this.sortBy === 'recent') {
      list.sort((a, b) => b.year - a.year);
    } else if (this.sortBy === 'oldest') {
      list.sort((a, b) => a.year - b.year);
    } else if (this.sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }

  private renderCatalogView() {
    const container = document.getElementById('catalog-section');
    if (!container) return;
    container.innerHTML = '';

    // MODO BUSCA
    if (this.searchQuery) {
      const filtered = this.getAllCombinedMovies();
      container.innerHTML = `
        <div class="section-header-row">
          <h2 class="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Resultados em Português para "${this.searchQuery}" (${filtered.length} ${this.totalLiveFound > filtered.length ? `de ${this.totalLiveFound} no acervo` : ''})
          </h2>
          <button class="btn-clear-filters" id="btn-cancel-search">Voltar ao Catálogo</button>
        </div>
        <div class="movies-grid" id="search-grid"></div>
      `;

      container.querySelector('#btn-cancel-search')?.addEventListener('click', () => {
        this.searchQuery = '';
        const searchInput = document.getElementById('global-search-input') as HTMLInputElement | null;
        if (searchInput) searchInput.value = '';
        this.renderCatalogView();
      });

      const grid = container.querySelector('#search-grid') as HTMLElement;
      if (filtered.length === 0 && !this.isLoadingLive) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
            <p style="font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 8px;">Nenhum título em português encontrado para "${this.searchQuery}"</p>
            <p>Tente buscar por termos como "Dublado", "Mortos Vivos", "Dracula", "Chaplin" ou "História".</p>
          </div>
        `;
      } else {
        filtered.forEach(movie => grid.appendChild(renderMovieCard(movie)));
      }

      this.renderLoadMoreSection(container);
      return;
    }

    // MODO FAVORITOS
    if (this.viewingFavoritesOnly) {
      const favMovies = this.getAllCombinedMovies();
      container.innerHTML = `
        <div class="section-header-row">
          <h2 class="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#e50914" stroke="#e50914" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            Minha Lista de Filmes (${favMovies.length})
          </h2>
          <button class="btn-clear-filters" id="btn-back-all">Ver Todos os Filmes</button>
        </div>
        <div class="movies-grid" id="fav-grid"></div>
      `;

      container.querySelector('#btn-back-all')?.addEventListener('click', () => {
        this.viewingFavoritesOnly = false;
        this.renderCatalogView();
      });

      const grid = container.querySelector('#fav-grid') as HTMLElement;
      if (favMovies.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
            <p style="font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 8px;">Sua lista está vazia</p>
            <p>Clique no ícone de coração nos cards de filmes do catálogo para salvar e assistir quando quiser.</p>
          </div>
        `;
      } else {
        favMovies.forEach(movie => grid.appendChild(renderMovieCard(movie)));
      }
      return;
    }

    // =========================================================
    // BARRA DE NAVEGAÇÃO RÁPIDA POR CATEGORIA (PILLS ESTILO NETFLIX)
    // =========================================================
    const categoryBar = document.createElement('div');
    categoryBar.className = 'category-pills-bar';

    const CATEGORIES = [
      { id: 'Todos', label: '🎬 Todos os Filmes' },
      { id: 'Dublado', label: '🎙️ Dublados PT-BR' },
      { id: 'Ação', label: '🚀 Ação & Aventura' },
      { id: 'Ficção', label: '👽 Ficção Científica' },
      { id: 'Terror', label: '👻 Terror & Suspense' },
      { id: 'Animação', label: '🎨 Animações' },
      { id: 'Comédia', label: '😂 Comédia & Humor' },
      { id: 'Drama', label: '🎭 Drama & Romance' },
      { id: 'Clássicos', label: '🏛️ Clássicos de Ouro' },
      { id: 'Documentário', label: '📜 Documentários' },
      { id: 'Legendado', label: '💬 Legendados' },
      { id: 'Modernos', label: '🌟 2020-2026' }
    ];

    const isCurrentActive = (catId: string) => {
      if (catId === 'Todos') return this.selectedCategory === 'Todos' && this.selectedAudio === 'all' && this.selectedEraTab === 'all';
      if (catId === 'Dublado') return this.selectedAudio === 'Dublado';
      if (catId === 'Legendado') return this.selectedAudio === 'Legendado';
      if (catId === 'Modernos') return this.selectedEraTab === 'modern';
      return this.selectedCategory.toLowerCase().includes(catId.toLowerCase());
    };

    categoryBar.innerHTML = CATEGORIES.map(cat => `
      <button class="category-chip-btn ${isCurrentActive(cat.id) ? 'active' : ''}" data-nav-cat="${cat.id}">
        ${cat.label}
      </button>
    `).join('');

    categoryBar.querySelectorAll('[data-nav-cat]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const catId = (e.currentTarget as HTMLElement).getAttribute('data-nav-cat') || 'Todos';
        if (catId === 'Todos') {
          this.selectedCategory = 'Todos';
          this.selectedAudio = 'all';
          this.selectedEraTab = 'all';
        } else if (catId === 'Dublado') {
          this.selectedAudio = 'Dublado';
          this.selectedCategory = 'Todos';
          this.selectedEraTab = 'all';
        } else if (catId === 'Legendado') {
          this.selectedAudio = 'Legendado';
          this.selectedCategory = 'Todos';
          this.selectedEraTab = 'all';
        } else if (catId === 'Modernos') {
          this.selectedEraTab = 'modern';
          this.selectedCategory = 'Todos';
          this.selectedAudio = 'all';
        } else {
          this.selectedCategory = catId;
          this.selectedAudio = 'all';
          this.selectedEraTab = 'all';
        }
        this.liveArchiveMovies = [];
        this.currentLivePage = 1;
        this.renderCatalogView();
        await this.fetchLivePage(1, false);
      });
    });

    container.appendChild(categoryBar);

    // =========================================================
    // PAINEL DE FILTROS AVANÇADOS (ETÁRIA & ORDENAÇÃO)
    // =========================================================
    const filterPanel = document.createElement('div');
    filterPanel.className = 'catalog-nav-panel';

    const hasActiveFilters = this.selectedEraTab !== 'all' || this.selectedCategory !== 'Todos' || this.selectedRating !== 'all' || this.selectedAudio !== 'all' || this.sortBy !== 'recent';
    const totalLoaded = this.getAllCombinedMovies().length;
    const totalEstimate = this.totalLiveFound > 0 ? this.totalLiveFound : '8.800+';

    filterPanel.innerHTML = `
      <div class="filter-row-secondary" style="border-top: none; padding-top: 0;">
        <div class="filter-secondary-left">
          <!-- Classificação Indicativa Oficial Brasileira -->
          <div class="filter-label-group">
            <span class="filter-inline-label">Classificação:</span>
            <div class="rating-filter-pill-group">
              <button class="rating-pill-btn ${this.selectedRating === 'all' ? 'active' : ''}" data-rating="all">Todas</button>
              <button class="rating-pill-btn ${this.selectedRating === 'L' ? 'active' : ''}" data-rating="L" title="Livre para todos os públicos">
                <span class="rating-badge rating-l">L</span> Livre
              </button>
              <button class="rating-pill-btn ${this.selectedRating === '10' ? 'active' : ''}" data-rating="10" title="10 anos">
                <span class="rating-badge rating-10">10</span> 10+
              </button>
              <button class="rating-pill-btn ${this.selectedRating === '12' ? 'active' : ''}" data-rating="12" title="12 anos">
                <span class="rating-badge rating-12">12</span> 12+
              </button>
              <button class="rating-pill-btn ${this.selectedRating === '14' ? 'active' : ''}" data-rating="14" title="14 anos">
                <span class="rating-badge rating-14">14</span> 14+
              </button>
              <button class="rating-pill-btn ${this.selectedRating === '16' ? 'active' : ''}" data-rating="16" title="16 anos">
                <span class="rating-badge rating-16">16</span> 16+
              </button>
            </div>
          </div>
        </div>

        <div class="filter-secondary-right">
          <!-- Ordenação -->
          <div class="filter-label-group">
            <span class="filter-inline-label">Ordenar:</span>
            <select class="filter-dropdown" id="filter-sort-select">
              <option value="recent" ${this.sortBy === 'recent' ? 'selected' : ''}>Mais Recentes (2026-1900)</option>
              <option value="oldest" ${this.sortBy === 'oldest' ? 'selected' : ''}>Mais Antigos Primeiro</option>
              <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Alfabética (A - Z)</option>
            </select>
          </div>

          <span class="filter-count-text">
            <strong>${totalLoaded}</strong> filmes exibidos (${totalEstimate} no acervo)
          </span>

          ${hasActiveFilters ? `
            <button class="btn-clear-filters" id="btn-reset-filters" title="Limpar todos os filtros">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Limpar Filtros
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Eventos Classificação Indicativa
    filterPanel.querySelectorAll('[data-rating]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const rating = (e.currentTarget as HTMLElement).getAttribute('data-rating') || 'all';
        this.selectedRating = rating;
        this.liveArchiveMovies = [];
        this.currentLivePage = 1;
        this.renderCatalogView();
        await this.fetchLivePage(1, false);
      });
    });

    // Evento Dropdown Ordenação
    filterPanel.querySelector('#filter-sort-select')?.addEventListener('change', async (e) => {
      this.sortBy = (e.target as HTMLSelectElement).value as 'recent' | 'oldest' | 'title';
      this.liveArchiveMovies = [];
      this.currentLivePage = 1;
      this.renderCatalogView();
      await this.fetchLivePage(1, false);
    });

    // Botão Limpar Filtros
    filterPanel.querySelector('#btn-reset-filters')?.addEventListener('click', async () => {
      this.selectedEraTab = 'all';
      this.selectedCategory = 'Todos';
      this.selectedRating = 'all';
      this.selectedAudio = 'all';
      this.sortBy = 'recent';
      this.liveArchiveMovies = [];
      this.currentLivePage = 1;
      this.renderCatalogView();
      await this.fetchLivePage(1, false);
    });

    container.appendChild(filterPanel);

    // =========================================================
    // EXIBIÇÃO DO CATÁLOGO DE FILMES
    // =========================================================
    const allFiltered = this.getAllCombinedMovies();

    // CASO 1: SE UMA CATEGORIA ESPECÍFICA OU FILTRO FOR SELECIONADO
    const isSingleCategoryMode = this.selectedCategory !== 'Todos' || this.selectedAudio !== 'all' || this.selectedEraTab !== 'all' || this.selectedRating !== 'all';

    if (isSingleCategoryMode) {
      const section = document.createElement('section');
      section.className = 'catalog-section';

      let sectionTitle = 'Filmes Disponíveis';
      if (this.selectedAudio === 'Dublado') sectionTitle = '🎙️ Filmes 100% Dublados em Português';
      else if (this.selectedAudio === 'Legendado') sectionTitle = '💬 Filmes com Legendas em Português';
      else if (this.selectedEraTab === 'modern') sectionTitle = '🌟 Lançamentos & Produções Modernas (2020-2026)';
      else if (this.selectedCategory !== 'Todos') sectionTitle = `Filmes de ${this.selectedCategory}`;

      section.innerHTML = `
        <div class="section-header-row">
          <div>
            <h2 class="section-title">${sectionTitle}</h2>
            <span class="load-more-info" id="category-count-badge" style="display:block; margin-top: 4px;">
              Exibindo ${allFiltered.length} títulos (carregando em lotes de 50)
            </span>
          </div>
          <button class="btn-clear-filters" id="btn-back-to-all-categories">
            ← Ver Todas as Categorias
          </button>
        </div>
        <div class="movies-grid" id="single-category-grid"></div>
      `;

      section.querySelector('#btn-back-to-all-categories')?.addEventListener('click', async () => {
        this.selectedCategory = 'Todos';
        this.selectedAudio = 'all';
        this.selectedEraTab = 'all';
        this.selectedRating = 'all';
        this.liveArchiveMovies = [];
        this.currentLivePage = 1;
        this.renderCatalogView();
        await this.fetchLivePage(1, false);
      });

      const grid = section.querySelector('#single-category-grid') as HTMLElement;
      if (allFiltered.length === 0 && !this.isLoadingLive) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
            <p style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 6px;">Nenhum título corresponde a este filtro específico.</p>
            <p>Clique em "Ver Todas as Categorias" acima para explorar todo o catálogo em português.</p>
          </div>
        `;
      } else {
        allFiltered.forEach(m => grid.appendChild(renderMovieCard(m)));
      }

      container.appendChild(section);
      this.renderLoadMoreSection(container);
      return;
    }

    // CASO 2: VISUALIZAÇÃO PADRÃO "TODOS" — DIVIDIDO EM CATEGORIAS NÍTIDAS
    const modernMovies = allFiltered.filter(m => m.year >= 2020 || m.era === 'modern');
    const dubbedMovies = allFiltered.filter(m => m.audioLanguage === 'Dublado' || m.audioLanguage === 'Nacional');
    const acaoFiccaoMovies = allFiltered.filter(m => {
      const c = (m.category || '').toLowerCase();
      return c.includes('ação') || c.includes('ficção') || c.includes('aventura');
    });
    const terrorMovies = allFiltered.filter(m => {
      const c = (m.category || '').toLowerCase();
      const t = (m.title + ' ' + m.synopsis).toLowerCase();
      return c.includes('terror') || c.includes('suspense') || t.includes('mortos') || t.includes('horror');
    });
    const animacaoMovies = allFiltered.filter(m => {
      const c = (m.category || '').toLowerCase();
      const t = (m.title + ' ' + m.synopsis).toLowerCase();
      return c.includes('animação') || t.includes('animação') || t.includes('cartoon') || t.includes('desenho');
    });
    const comediaMovies = allFiltered.filter(m => {
      const c = (m.category || '').toLowerCase();
      const t = (m.title + ' ' + m.synopsis).toLowerCase();
      return c.includes('comédia') || t.includes('comédia') || t.includes('humor') || t.includes('chaplin') || t.includes('keaton');
    });
    const dramaMovies = allFiltered.filter(m => {
      const c = (m.category || '').toLowerCase();
      return c.includes('drama') || c.includes('romance');
    });
    const classicMovies = allFiltered.filter(m => {
      return m.year < 1980 && !animacaoMovies.includes(m);
    });
    const docMovies = allFiltered.filter(m => {
      const c = (m.category || '').toLowerCase();
      return c.includes('documentário');
    });

    const categorySections = [
      { id: 'grid-modernos', title: '🌟 Lançamentos & Cinema Moderno (2020-2026)', catFilter: 'Modernos', movies: modernMovies },
      { id: 'grid-dublados', title: '🎙️ Filmes 100% Dublados em Português', catFilter: 'Dublado', movies: dubbedMovies },
      { id: 'grid-acao', title: '🚀 Ação, Aventura & Ficção Científica', catFilter: 'Ação', movies: acaoFiccaoMovies },
      { id: 'grid-terror', title: '👻 Terror, Suspense & Sobrenatural', catFilter: 'Terror', movies: terrorMovies },
      { id: 'grid-animacao', title: '🎨 Animações & Família', catFilter: 'Animação', movies: animacaoMovies },
      { id: 'grid-comedia', title: '😂 Comédias & Cinema Clássico do Riso', catFilter: 'Comédia', movies: comediaMovies },
      { id: 'grid-drama', title: '🎭 Dramas & Histórias Reais', catFilter: 'Drama', movies: dramaMovies },
      { id: 'grid-classicos', title: '🏛️ Grandes Clássicos de Domínio Público', catFilter: 'Clássicos', movies: classicMovies },
      { id: 'grid-documentario', title: '📜 Documentários & Registros Históricos', catFilter: 'Documentário', movies: docMovies }
    ];

    categorySections.forEach(sec => {
      if (sec.movies.length > 0) {
        const secEl = document.createElement('section');
        secEl.className = 'catalog-section';
        secEl.innerHTML = `
          <div class="section-header-row">
            <h2 class="section-title">${sec.title} (${sec.movies.length})</h2>
            <button class="btn-explore-category" data-explore-cat="${sec.catFilter}">
              Ver Todos (${sec.movies.length}+) →
            </button>
          </div>
          <div class="movies-grid" id="${sec.id}"></div>
        `;

        secEl.querySelector(`[data-explore-cat="${sec.catFilter}"]`)?.addEventListener('click', async () => {
          if (sec.catFilter === 'Dublado') {
            this.selectedAudio = 'Dublado';
            this.selectedCategory = 'Todos';
          } else if (sec.catFilter === 'Modernos') {
            this.selectedEraTab = 'modern';
            this.selectedCategory = 'Todos';
          } else {
            this.selectedCategory = sec.catFilter;
            this.selectedAudio = 'all';
          }
          this.liveArchiveMovies = [];
          this.currentLivePage = 1;
          this.renderCatalogView();
          await this.fetchLivePage(1, false);
        });

        const grid = secEl.querySelector('.movies-grid') as HTMLElement;
        // Exibir os primeiros 12 filmes nesta linha temática
        sec.movies.slice(0, 12).forEach(m => grid.appendChild(renderMovieCard(m)));
        container.appendChild(secEl);
      }
    });

    // Seção para carregar mais filmes do acervo contínuo
    const browseAllSection = document.createElement('section');
    browseAllSection.className = 'catalog-section';
    browseAllSection.innerHTML = `
      <div class="section-header-row" style="margin-top: 30px;">
        <h2 class="section-title">🎬 Explorar Acervo Completo em Português (${allFiltered.length} títulos carregados)</h2>
      </div>
      <div class="movies-grid" id="browse-all-grid"></div>
    `;
    const browseGrid = browseAllSection.querySelector('#browse-all-grid') as HTMLElement;
    allFiltered.forEach(m => browseGrid.appendChild(renderMovieCard(m)));
    container.appendChild(browseAllSection);

    this.renderLoadMoreSection(container);
  }

  /**
   * Adiciona novos filmes recebidos diretamente aos grids existentes
   * SEM limpar innerHTML, garantindo que o scroll NUNCA pule para o topo!
   */
  private appendMoviesToCurrentView(newMovies: Movie[]) {
    // 1. Se estiver na visualização de busca
    const searchGrid = document.getElementById('search-grid');
    if (searchGrid) {
      newMovies.forEach(m => searchGrid.appendChild(renderMovieCard(m)));
      return;
    }

    // 2. Se estiver em uma categoria específica
    const singleGrid = document.getElementById('single-category-grid');
    if (singleGrid) {
      newMovies.forEach(m => singleGrid.appendChild(renderMovieCard(m)));
      const badge = document.getElementById('category-count-badge');
      if (badge) {
        badge.textContent = `Exibindo ${this.getAllCombinedMovies().length} títulos (carregando em lotes de 50)`;
      }
      return;
    }

    // 3. Se estiver na visualização geral "Todos os Filmes"
    const browseGrid = document.getElementById('browse-all-grid');
    newMovies.forEach(m => {
      if (browseGrid) {
        browseGrid.appendChild(renderMovieCard(m));
      }

      const cat = (m.category || '').toLowerCase();
      const title = (m.title + ' ' + m.synopsis).toLowerCase();

      if (m.audioLanguage === 'Dublado' || m.audioLanguage === 'Nacional') {
        document.getElementById('grid-dublados')?.appendChild(renderMovieCard(m));
      }
      if (m.year >= 2020) {
        document.getElementById('grid-modernos')?.appendChild(renderMovieCard(m));
      }
      if (cat.includes('terror') || title.includes('terror') || title.includes('mortos')) {
        document.getElementById('grid-terror')?.appendChild(renderMovieCard(m));
      } else if (cat.includes('animação') || title.includes('cartoon') || title.includes('desenho')) {
        document.getElementById('grid-animacao')?.appendChild(renderMovieCard(m));
      } else if (cat.includes('ficção') || title.includes('sci-fi')) {
        document.getElementById('grid-ficcao')?.appendChild(renderMovieCard(m));
      } else if (cat.includes('ação') || cat.includes('aventura')) {
        document.getElementById('grid-acao')?.appendChild(renderMovieCard(m));
      } else if (cat.includes('comédia') || title.includes('humor')) {
        document.getElementById('grid-comedia')?.appendChild(renderMovieCard(m));
      } else if (cat.includes('documentário')) {
        document.getElementById('grid-documentario')?.appendChild(renderMovieCard(m));
      } else if (cat.includes('drama')) {
        document.getElementById('grid-drama')?.appendChild(renderMovieCard(m));
      } else {
        document.getElementById('grid-classicos')?.appendChild(renderMovieCard(m));
      }
    });

    const info = document.querySelector('.load-more-info');
    if (info) {
      info.textContent = `Exibindo ${this.getAllCombinedMovies().length} filmes (carregando de 50 em 50 sem recarregar a tela)`;
    }
  }

  private renderLoadMoreSection(container: HTMLElement) {
    const wrap = document.createElement('div');
    wrap.className = 'load-more-container';
    wrap.id = 'load-more-section';

    const currentCount = this.getAllCombinedMovies().length;
    const totalEstimate = this.totalLiveFound > 0 ? this.totalLiveFound : '8.800+';

    wrap.innerHTML = `
      <button class="btn-load-more" id="btn-load-more-movies" ${this.isLoadingLive ? 'disabled' : ''}>
        ${this.isLoadingLive 
          ? `<span class="live-loading-spinner"></span> Carregando Próximos 50 Filmes...` 
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> Carregar Mais 50 Filmes (+50)`}
      </button>
      <span class="load-more-info">Exibindo ${currentCount} de ${totalEstimate} títulos disponíveis (carregando de 50 em 50 sem recarregar a tela)</span>
    `;

    wrap.querySelector('#btn-load-more-movies')?.addEventListener('click', async () => {
      await this.fetchLivePage(this.currentLivePage + 1, true);
    });

    // Rolagem Suave: aciona o carregamento dos próximos 50 filmes sem dar salto de tela
    if ('IntersectionObserver' in window) {
      let scrollDebounce: any = null;
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !this.isLoadingLive && this.totalLiveFound > this.liveArchiveMovies.length) {
          clearTimeout(scrollDebounce);
          scrollDebounce = setTimeout(() => {
            if (!this.isLoadingLive) {
              this.fetchLivePage(this.currentLivePage + 1, true);
            }
          }, 350);
        }
      }, { rootMargin: '250px' });
      observer.observe(wrap);
    }

    container.appendChild(wrap);
  }

  private updateLoadMoreButtonState() {
    const btn = document.getElementById('btn-load-more-movies') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = this.isLoadingLive;
      if (this.isLoadingLive) {
        btn.innerHTML = `<span class="live-loading-spinner"></span> Carregando Filmes em Português...`;
      }
    }
  }

  private renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand">
          <h4>CinePWA — Cinema Autorizado Brasil</h4>
          <p>Plataforma progressiva (PWA) com catálogo especializado para o público brasileiro: filmes dublados em português, legendados em PT-BR e obras visuais universais de domínio público e código aberto (Creative Commons), 100% gratuitos.</p>
        </div>

        <div class="footer-col">
          <h5>Navegação</h5>
          <ul>
            <li><a href="#home" id="ft-home">Página Inicial</a></li>
            <li><a href="#dublados" id="ft-dublados">Filmes Dublados</a></li>
            <li><a href="#legendados" id="ft-legendados">Filmes Legendados</a></li>
            <li><a href="#favorites" id="ft-fav">Minha Lista de Filmes</a></li>
            <li><a href="#admin" id="ft-admin">Painel Administrativo</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h5>Acessibilidade & Idioma</h5>
          <ul>
            <li><span class="footer-badge-item">Áudio Dublado (PT-BR)</span></li>
            <li><span class="footer-badge-item">Legendas em Português</span></li>
            <li><span class="footer-badge-item">Classificação Indicativa Nacional</span></li>
            <li><span class="footer-badge-item">Licenças Livres & Domínio Público</span></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; 2026 CinePWA Brasil. Curadoria e indexação focada na acessibilidade para o público brasileiro.</p>
      </div>
    `;

    footer.querySelector('#ft-home')?.addEventListener('click', async (e) => {
      e.preventDefault();
      this.searchQuery = '';
      this.selectedEraTab = 'all';
      this.selectedCategory = 'Todos';
      this.selectedRating = 'all';
      this.selectedAudio = 'all';
      this.viewingFavoritesOnly = false;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await this.fetchLivePage(1, false);
    });

    footer.querySelector('#ft-dublados')?.addEventListener('click', async (e) => {
      e.preventDefault();
      this.selectedAudio = 'Dublado';
      this.viewingFavoritesOnly = false;
      this.renderCatalogView();
      await this.fetchLivePage(1, false);
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    footer.querySelector('#ft-legendados')?.addEventListener('click', async (e) => {
      e.preventDefault();
      this.selectedAudio = 'Legendado';
      this.viewingFavoritesOnly = false;
      this.renderCatalogView();
      await this.fetchLivePage(1, false);
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    footer.querySelector('#ft-fav')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.viewingFavoritesOnly = true;
      this.renderCatalogView();
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    footer.querySelector('#ft-admin')?.addEventListener('click', (e) => {
      e.preventDefault();
      adminPanelModal.open();
    });

    this.appEl.appendChild(footer);
  }
}

// Iniciar aplicação CinePWA
document.addEventListener('DOMContentLoaded', () => {
  new CineApp();
});
