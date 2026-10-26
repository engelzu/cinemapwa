import type { Movie, MovieStatus, LicenseReviewStatus, PlaybackType, LicenseType } from '../types';
import { MovieService } from '../services/movieService';
import { AuthService } from '../services/authService';
import { isFirebaseConfigured, config as fbConfig } from '../firebase';
import { videoPlayerModal } from './videoPlayer';

export class AdminPanelModal {
  private container: HTMLElement | null = null;
  private currentTab: 'movies' | 'form' | 'firebase' = 'movies';
  private editingMovie: Movie | null = null;
  private allMovies: Movie[] = [];
  private searchQuery: string = '';
  private filterStatus: string = 'all';

  constructor() {
    this.createDom();
  }

  private createDom() {
    let el = document.getElementById('cine-admin-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cine-admin-modal';
      el.className = 'admin-modal-backdrop hidden';
      document.body.appendChild(el);
    }
    this.container = el;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.container?.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  public async open() {
    if (!this.container) return;
    this.container.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (!AuthService.isAdminLoggedIn()) {
      this.renderLoginForm();
    } else {
      await this.loadAdminData();
      this.renderDashboard();
    }
  }

  public close() {
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
    }
    document.body.style.overflow = '';
  }

  private renderLoginForm() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="admin-login-card animate-scale-up">
        <button class="modal-close-floating" id="admin-login-close-btn" title="Fechar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="admin-login-header">
          <div class="admin-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <circle cx="12" cy="11" r="3"></circle>
            </svg>
          </div>
          <h2>Painel Administrativo</h2>
          <p class="admin-login-subtitle">Gestão de catálogo, validação de direitos e publicações</p>
        </div>

        <form id="admin-login-form" class="admin-form">
          <div class="form-group">
            <label for="admin-pass">Senha de Acesso do Administrador</label>
            <input 
              type="password" 
              id="admin-pass" 
              required 
              placeholder="Digite a senha..." 
              class="form-input"
              autocomplete="current-password"
              autofocus
            />
          </div>

          <div id="login-error-msg" class="form-error-msg hidden"></div>

          <button type="submit" class="btn btn-primary btn-block" id="btn-login-submit">
            <span>Acessar Painel</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>

        <div class="admin-login-footer">
          <p>Ambiente restrito protegido por senha. Apenas administradores autorizados.</p>
        </div>
      </div>
    `;

    document.getElementById('admin-login-close-btn')?.addEventListener('click', () => this.close());

    const form = document.getElementById('admin-login-form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = (document.getElementById('admin-pass') as HTMLInputElement).value;
      const errorEl = document.getElementById('login-error-msg');
      const submitBtn = document.getElementById('btn-login-submit') as HTMLButtonElement;

      if (errorEl) errorEl.classList.add('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Autenticando...';
      }

      try {
        await AuthService.loginWithPassword(pass);
        await this.loadAdminData();
        this.renderDashboard();
      } catch (err: any) {
        if (errorEl) {
          errorEl.textContent = err.message || 'Senha incorreta! Acesso restrito.';
          errorEl.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Acessar Painel</span>`;
        }
      }
    });
  }

  private async loadAdminData() {
    this.allMovies = await MovieService.getAllMoviesForAdmin();
  }

  private renderDashboard() {
    if (!this.container) return;
    const admin = AuthService.getCurrentAdmin();

    this.container.innerHTML = `
      <div class="admin-dashboard-container animate-fade-in">
        <!-- Barra Superior Admin -->
        <header class="admin-topbar">
          <div class="admin-topbar-left">
            <div class="admin-brand-tag">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e50914" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
              </svg>
              <span>CinePWA <strong>Administração</strong></span>
            </div>
            <span class="admin-user-pill">
              <span class="online-indicator"></span>
              ${admin?.email}
            </span>
          </div>

          <div class="admin-topbar-tabs">
            <button class="admin-tab-btn ${this.currentTab === 'movies' ? 'active' : ''}" id="tab-btn-movies">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              </svg>
              <span>Gerenciar Filmes (${this.allMovies.length})</span>
            </button>
            <button class="admin-tab-btn ${this.currentTab === 'form' ? 'active' : ''}" id="tab-btn-new">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>${this.editingMovie ? 'Editar Filme' : 'Cadastrar Filme'}</span>
            </button>
            <button class="admin-tab-btn ${this.currentTab === 'firebase' ? 'active' : ''}" id="tab-btn-firebase">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <span>Firebase / Regras</span>
            </button>
          </div>

          <div class="admin-topbar-right">
            <button class="btn btn-sm btn-ghost" id="admin-logout-btn" title="Encerrar sessão de admin">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sair</span>
            </button>
            <button class="admin-close-btn" id="admin-close-panel-btn" title="Voltar ao catálogo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <!-- Corpo das Abas -->
        <main class="admin-content-body" id="admin-tab-content">
          <!-- Renderizado dinamicamente -->
        </main>
      </div>
    `;

    // Eventos topo
    document.getElementById('admin-close-panel-btn')?.addEventListener('click', () => this.close());
    document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
      await AuthService.logout();
      this.renderLoginForm();
    });

    document.getElementById('tab-btn-movies')?.addEventListener('click', () => {
      this.currentTab = 'movies';
      this.editingMovie = null;
      this.renderDashboard();
    });

    document.getElementById('tab-btn-new')?.addEventListener('click', () => {
      this.currentTab = 'form';
      this.renderDashboard();
    });

    document.getElementById('tab-btn-firebase')?.addEventListener('click', () => {
      this.currentTab = 'firebase';
      this.renderDashboard();
    });

    this.renderCurrentTabContent();
  }

  private renderCurrentTabContent() {
    const main = document.getElementById('admin-tab-content');
    if (!main) return;

    if (this.currentTab === 'movies') {
      this.renderMoviesManagement(main);
    } else if (this.currentTab === 'form') {
      this.renderMovieForm(main);
    } else if (this.currentTab === 'firebase') {
      this.renderFirebaseInfo(main);
    }
  }

  // TELA 1: Gerenciar Filmes
  private renderMoviesManagement(container: HTMLElement) {
    const filtered = this.allMovies.filter(m => {
      const matchSearch = m.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          m.category.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchStatus = this.filterStatus === 'all' || m.status === this.filterStatus;
      return matchSearch && matchStatus;
    });

    container.innerHTML = `
      <div class="admin-panel-section">
        <div class="admin-toolbar">
          <div class="admin-search-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              id="admin-filter-search" 
              class="form-input" 
              placeholder="Filtrar por título ou gênero..." 
              value="${this.searchQuery}"
            />
          </div>

          <div class="admin-status-filters">
            <button class="status-pill ${this.filterStatus === 'all' ? 'active' : ''}" data-status="all">Todos (${this.allMovies.length})</button>
            <button class="status-pill ${this.filterStatus === 'published' ? 'active' : ''}" data-status="published">Publicados (${this.allMovies.filter(m => m.status === 'published').length})</button>
            <button class="status-pill ${this.filterStatus === 'draft' ? 'active' : ''}" data-status="draft">Rascunhos (${this.allMovies.filter(m => m.status === 'draft').length})</button>
            <button class="status-pill ${this.filterStatus === 'disabled' ? 'active' : ''}" data-status="disabled">Desativados (${this.allMovies.filter(m => m.status === 'disabled').length})</button>
          </div>

          <button class="btn btn-primary" id="btn-add-movie-quick">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Cadastrar Novo Filme
          </button>
        </div>

        <div class="admin-table-card">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Capa & Título</th>
                <th>Categoria / Ano</th>
                <th>Situação</th>
                <th>Validação da Licença</th>
                <th>Player</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="6" class="table-empty-msg">Nenhum filme encontrado com os filtros aplicados.</td>
                </tr>
              ` : filtered.map(movie => `
                <tr class="admin-row-${movie.status}">
                  <td class="col-movie-main">
                    <img src="${movie.posterUrl}" class="admin-poster-thumb" alt="${movie.title}" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=120&q=80'" />
                    <div class="admin-movie-titles">
                      <strong>${movie.title}</strong>
                      <small>${movie.duration} • ID: ${movie.id}</small>
                    </div>
                  </td>
                  <td>
                    <span class="badge-cat-sm">${movie.category}</span>
                    <div><small class="text-muted">${movie.year}</small></div>
                  </td>
                  <td>
                    <span class="badge-status badge-${movie.status}">
                      ${movie.status === 'published' ? '● Publicado' : movie.status === 'draft' ? '○ Rascunho' : '✕ Desativado'}
                    </span>
                  </td>
                  <td>
                    <div class="license-status-cell">
                      <span class="badge-review badge-review-${movie.license?.reviewStatus || 'pending'}">
                        ${movie.license?.reviewStatus === 'approved' ? '✓ Aprovada' : movie.license?.reviewStatus === 'rejected' ? '✕ Rejeitada' : '⏱ Pendente'}
                      </span>
                      <small class="license-type-sub" title="${movie.license?.rightsHolder || ''}">
                        ${movie.license?.licenseType || 'Sem licença'}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span class="badge-format-sm">${movie.playbackType.toUpperCase()}</span>
                  </td>
                  <td style="text-align: right;">
                    <div class="row-actions">
                      <button class="action-btn test-play-btn" data-action="test" data-id="${movie.id}" title="Testar Reprodução">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      </button>

                      <button class="action-btn edit-btn" data-action="edit" data-id="${movie.id}" title="Editar Dados e Licença">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>

                      <button class="action-btn toggle-status-btn" data-action="toggle" data-id="${movie.id}" title="${movie.status === 'published' ? 'Despublicar para Rascunho' : 'Publicar'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          ${movie.status === 'published' ? `
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                          ` : `
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          `}
                        </svg>
                      </button>

                      <button class="action-btn delete-btn" data-action="delete" data-id="${movie.id}" title="Excluir Filme">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Listeners da Tela 1
    const searchInput = container.querySelector('#admin-filter-search') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.renderMoviesManagement(container);
    });

    container.querySelectorAll('.status-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        this.filterStatus = target.getAttribute('data-status') || 'all';
        this.renderMoviesManagement(container);
      });
    });

    container.querySelector('#btn-add-movie-quick')?.addEventListener('click', () => {
      this.editingMovie = null;
      this.currentTab = 'form';
      this.renderDashboard();
    });

    // Ações de cada linha
    container.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');
        const movie = this.allMovies.find(m => m.id === id);
        if (!movie) return;

        if (action === 'test') {
          videoPlayerModal.open(movie);
        } else if (action === 'edit') {
          this.editingMovie = movie;
          this.currentTab = 'form';
          this.renderDashboard();
        } else if (action === 'toggle') {
          try {
            const nextStatus: MovieStatus = movie.status === 'published' ? 'draft' : 'published';
            await MovieService.updateMovieStatus(movie.id, nextStatus);
            await this.loadAdminData();
            this.renderMoviesManagement(container);
            window.dispatchEvent(new CustomEvent('cinepwa:catalog-updated'));
          } catch (err: any) {
            alert(err.message || 'Erro ao alterar situação do filme.');
          }
        } else if (action === 'delete') {
          if (confirm(`Tem certeza que deseja excluir o filme "${movie.title}"?`)) {
            await MovieService.deleteMovie(movie.id);
            await this.loadAdminData();
            this.renderMoviesManagement(container);
            window.dispatchEvent(new CustomEvent('cinepwa:catalog-updated'));
          }
        }
      });
    });
  }

  // TELA 2 & 3: Cadastrar / Editar Filme + Validação Rigorosa de Direitos
  private renderMovieForm(container: HTMLElement) {
    const movie = this.editingMovie;
    const license = movie?.license;

    container.innerHTML = `
      <div class="admin-panel-section">
        <div class="form-page-header">
          <div>
            <h2 class="form-page-title">${movie ? `Editar Obra: ${movie.title}` : 'Cadastrar Nova Obra Autorizada'}</h2>
            <p class="form-page-subtitle">Preencha os metadados técnicos e certifique a licença jurídica antes de disponibilizar ao público.</p>
          </div>
          <button class="btn btn-secondary" id="btn-cancel-form">Cancelar / Voltar</button>
        </div>

        <form id="movie-editor-form" class="movie-editor-layout">
          <!-- Coluna 1: Dados do Filme -->
          <div class="form-column">
            <div class="form-card">
              <h3 class="form-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                1. Metadados do Filme
              </h3>

              <div class="form-group">
                <label for="f-title">Título em Português *</label>
                <input type="text" id="f-title" required class="form-input" placeholder="ex: A Noite dos Mortos-Vivos" value="${movie?.title || ''}">
              </div>

              <div class="form-group">
                <label for="f-orig-title">Título Original</label>
                <input type="text" id="f-orig-title" class="form-input" placeholder="ex: Night of the Living Dead" value="${movie?.originalTitle || ''}">
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="f-year">Ano de Lançamento *</label>
                  <input type="number" id="f-year" required class="form-input" min="1890" max="2030" placeholder="1968" value="${movie?.year || 2026}">
                </div>
                <div class="form-group">
                  <label for="f-duration">Duração (ex: 1h 36m) *</label>
                  <input type="text" id="f-duration" required class="form-input" placeholder="1h 36m" value="${movie?.duration || '1h 30m'}">
                </div>
              </div>

              <div class="form-group">
                <label for="f-category">Categoria / Gênero *</label>
                <select id="f-category" class="form-input" required>
                  <option value="Séries & Minisséries" ${movie?.category === 'Séries & Minisséries' ? 'selected' : ''}>📺 Séries & Minisséries</option>
                  <option value="Anime & Mangá" ${movie?.category === 'Anime & Mangá' ? 'selected' : ''}>⛩️ Anime & Mangá</option>
                  <option value="Terror & Suspense" ${movie?.category === 'Terror & Suspense' ? 'selected' : ''}>Terror & Suspense</option>
                  <option value="Ficção Científica" ${movie?.category === 'Ficção Científica' ? 'selected' : ''}>Ficção Científica</option>
                  <option value="Ação & Aventura" ${movie?.category === 'Ação & Aventura' ? 'selected' : ''}>Ação & Aventura</option>
                  <option value="Clássicos & Mistério" ${movie?.category === 'Clássicos & Mistério' ? 'selected' : ''}>Clássicos & Mistério</option>
                  <option value="Comédia & Drama" ${movie?.category === 'Comédia & Drama' ? 'selected' : ''}>Comédia & Drama</option>
                  <option value="Documentário" ${movie?.category === 'Documentário' ? 'selected' : ''}>Documentário</option>
                  <option value="Cinema Independente Brasileiro" ${movie?.category === 'Cinema Independente Brasileiro' ? 'selected' : ''}>Cinema Independente Brasileiro</option>
                  <option value="Animação Histórica" ${movie?.category === 'Animação Histórica' ? 'selected' : ''}>Animação Histórica</option>
                </select>
              </div>

              <div class="form-group">
                <label for="f-synopsis">Sinopse Completa *</label>
                <textarea id="f-synopsis" required class="form-textarea" rows="4" placeholder="Descrição clara e envolvente da obra...">${movie?.synopsis || ''}</textarea>
              </div>

              <div class="form-group">
                <label for="f-poster">URL da Capa / Poster (Proporção 2:3) *</label>
                <input type="url" id="f-poster" required class="form-input" placeholder="https://..." value="${movie?.posterUrl || ''}">
              </div>

              <div class="form-group">
                <label for="f-backdrop">URL do Backdrop (Horizontal / Destaque)</label>
                <input type="url" id="f-backdrop" class="form-input" placeholder="https://..." value="${movie?.backdropUrl || ''}">
              </div>
            </div>

            <!-- Fonte de Reprodução -->
            <div class="form-card">
              <h3 class="form-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                2. Fonte de Reprodução Externa Autorizada
              </h3>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="f-playtype">Tipo de Player *</label>
                  <select id="f-playtype" class="form-input" required>
                    <option value="embed" ${movie?.playbackType === 'embed' ? 'selected' : ''}>Embed Iframe (Internet Archive / YouTube / Vimeo)</option>
                    <option value="mp4" ${movie?.playbackType === 'mp4' ? 'selected' : ''}>MP4 Direto (HTML5 Video)</option>
                    <option value="hls" ${movie?.playbackType === 'hls' ? 'selected' : ''}>HLS Stream (.m3u8)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="f-featured">Destacar no Banner Principal?</label>
                  <select id="f-featured" class="form-input">
                    <option value="false" ${!movie?.featured ? 'selected' : ''}>Não</option>
                    <option value="true" ${movie?.featured ? 'selected' : ''}>Sim (Hero Banner)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="f-playurl">Endereço da Reprodução (URL) *</label>
                <div class="url-input-test-wrap">
                  <input type="url" id="f-playurl" required class="form-input" placeholder="https://archive.org/embed/..." value="${movie?.playbackUrl || ''}">
                  <button type="button" class="btn btn-secondary" id="btn-test-url">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Testar Link
                  </button>
                </div>
              </div>

              <!-- Área de pré-visualização do teste -->
              <div id="test-preview-box" class="test-preview-box hidden">
                <div class="test-preview-header">
                  <span>Pré-visualização do Link:</span>
                  <button type="button" class="btn-text-sm" id="btn-close-preview">Fechar Teste ✕</button>
                </div>
                <div id="test-preview-viewport" class="test-preview-viewport"></div>
              </div>
            </div>
          </div>

          <!-- Coluna 2: Validação de Direitos & Licenças (TELA 3) -->
          <div class="form-column">
            <div class="form-card legal-validation-card">
              <div class="legal-card-badge-header">
                <div class="legal-badge-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 class="form-card-title text-success">3. Validação de Direitos e Licença</h3>
                  <p class="form-card-hint">Obrigatório para conformidade legal. Publicação bloqueada sem aprovação.</p>
                </div>
              </div>

              <div class="form-group">
                <label for="f-lic-status">Situação da Verificação de Direitos *</label>
                <select id="f-lic-status" class="form-input highlight-select" required>
                  <option value="pending" ${(license?.reviewStatus === 'pending' || !license) ? 'selected' : ''}>⏱ Pendente (Aguardando comprovação)</option>
                  <option value="approved" ${license?.reviewStatus === 'approved' ? 'selected' : ''}>✓ Aprovado (Direitos Validados e Comprovados)</option>
                  <option value="rejected" ${license?.reviewStatus === 'rejected' ? 'selected' : ''}>✕ Rejeitado (Sem autorização válida)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="f-lic-type">Tipo de Licença / Regime Jurídico *</label>
                <select id="f-lic-type" class="form-input" required>
                  <option value="Dominio Publico" ${license?.licenseType === 'Dominio Publico' ? 'selected' : ''}>Domínio Público (Sem copyright / Prazo expirado)</option>
                  <option value="Creative Commons (CC BY / CC0)" ${license?.licenseType === 'Creative Commons (CC BY / CC0)' ? 'selected' : ''}>Creative Commons (CC BY / CC0)</option>
                  <option value="Autorizacao Direta do Produtor" ${license?.licenseType === 'Autorizacao Direta do Produtor' ? 'selected' : ''}>Autorização Direta por Contrato / Termo do Produtor</option>
                  <option value="Licenca Nao-Comercial" ${license?.licenseType === 'Licenca Nao-Comercial' ? 'selected' : ''}>Licença Não-Comercial Autorizada</option>
                  <option value="Outra Autorizada" ${license?.licenseType === 'Outra Autorizada' ? 'selected' : ''}>Outra Licença Específica Documentada</option>
                </select>
              </div>

              <div class="form-group">
                <label for="f-lic-holder">Titular dos Direitos / Cedente / Certificador *</label>
                <input type="text" id="f-lic-holder" required class="form-input" placeholder="ex: Domínio Público / Produtora Aurora Ltda" value="${license?.rightsHolder || ''}">
              </div>

              <div class="form-group">
                <label for="f-lic-origin">Origem do Acervo *</label>
                <input type="text" id="f-lic-origin" required class="form-input" placeholder="ex: Internet Archive / Cineclube Brasil" value="${license?.origin || 'Internet Archive'}">
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="f-lic-territory">Território Autorizado *</label>
                  <input type="text" id="f-lic-territory" required class="form-input" placeholder="Brasil e Internacional" value="${license?.territory || 'Brasil e Internacional'}">
                </div>
                <div class="form-group">
                  <label for="f-lic-valid">Prazo de Validade *</label>
                  <input type="text" id="f-lic-valid" required class="form-input" placeholder="Indeterminado ou YYYY-MM-DD" value="${license?.validUntil || 'Indeterminado'}">
                </div>
              </div>

              <div class="form-group">
                <label for="f-lic-proof">Link para Comprovante / Registro de Licença *</label>
                <input type="url" id="f-lic-proof" required class="form-input" placeholder="https://archive.org/details/... ou link do contrato" value="${license?.proofUrl || ''}">
              </div>

              <div class="form-group">
                <label for="f-lic-commercial">Uso Comercial Permitido?</label>
                <select id="f-lic-commercial" class="form-input">
                  <option value="false" ${!license?.commercialUseAllowed ? 'selected' : ''}>Não (Exclusivo Não-Comercial / Educacional)</option>
                  <option value="true" ${license?.commercialUseAllowed ? 'selected' : ''}>Sim</option>
                </select>
              </div>

              <div class="form-group">
                <label for="f-lic-notes">Parecer / Notas da Auditoria</label>
                <textarea id="f-lic-notes" class="form-textarea" rows="3" placeholder="Informações adicionais sobre o titular, contrato, ou detalhes da certidão de domínio público...">${license?.notes || ''}</textarea>
              </div>
            </div>

            <!-- Situação de Publicação no App -->
            <div class="form-card publish-card">
              <h3 class="form-card-title">4. Situação no Catálogo CinePWA</h3>

              <div class="form-group">
                <label for="f-status">Visibilidade Pública *</label>
                <select id="f-status" class="form-input select-status-action">
                  <option value="draft" ${movie?.status === 'draft' || !movie ? 'selected' : ''}>Rascunho (Salvar sem expor ao público)</option>
                  <option value="published" ${movie?.status === 'published' ? 'selected' : ''}>Publicado (Disponível no catálogo)</option>
                  <option value="disabled" ${movie?.status === 'disabled' ? 'selected' : ''}>Desativado (Oculto temporariamente)</option>
                </select>
                <small id="publish-warning" class="help-warning-text hidden">
                  ⚠️ AVISO: Só é permitido publicar se a licença acima estiver marcada como "✓ Aprovado"!
                </small>
              </div>

              <div class="form-submit-actions">
                <button type="submit" class="btn btn-primary btn-lg" id="btn-save-movie">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Salvar Obra & Licença
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    `;

    // Listeners do formulário
    container.querySelector('#btn-cancel-form')?.addEventListener('click', () => {
      this.currentTab = 'movies';
      this.editingMovie = null;
      this.renderDashboard();
    });

    // Testador de Link
    const testBtn = container.querySelector('#btn-test-url');
    const previewBox = container.querySelector('#test-preview-box');
    const previewViewport = container.querySelector('#test-preview-viewport');
    const closePreviewBtn = container.querySelector('#btn-close-preview');

    testBtn?.addEventListener('click', () => {
      const urlInput = (container.querySelector('#f-playurl') as HTMLInputElement).value.trim();
      const playType = (container.querySelector('#f-playtype') as HTMLSelectElement).value as PlaybackType;

      if (!urlInput) {
        alert('Por favor, informe a URL de reprodução primeiro.');
        return;
      }

      if (previewBox && previewViewport) {
        previewBox.classList.remove('hidden');
        previewViewport.innerHTML = '';

        if (playType === 'embed' || urlInput.includes('archive.org') || urlInput.includes('youtube') || urlInput.includes('vimeo')) {
          const iframe = document.createElement('iframe');
          iframe.src = urlInput;
          iframe.style.width = '100%';
          iframe.style.height = '280px';
          iframe.style.border = 'none';
          iframe.allow = 'autoplay; fullscreen';
          previewViewport.appendChild(iframe);
        } else {
          const video = document.createElement('video');
          video.src = urlInput;
          video.controls = true;
          video.style.width = '100%';
          video.style.maxHeight = '280px';
          previewViewport.appendChild(video);
        }
      }
    });

    closePreviewBtn?.addEventListener('click', () => {
      if (previewBox && previewViewport) {
        previewViewport.innerHTML = '';
        previewBox.classList.add('hidden');
      }
    });

    // Validador de Bloqueio de Publicação na interface
    const statusSelect = container.querySelector('#f-status') as HTMLSelectElement;
    const licStatusSelect = container.querySelector('#f-lic-status') as HTMLSelectElement;
    const warnText = container.querySelector('#publish-warning') as HTMLElement;

    function checkPublishRule() {
      if (statusSelect.value === 'published' && licStatusSelect.value !== 'approved') {
        warnText.classList.remove('hidden');
      } else {
        warnText.classList.add('hidden');
      }
    }

    statusSelect?.addEventListener('change', checkPublishRule);
    licStatusSelect?.addEventListener('change', checkPublishRule);

    // Submissão do formulário
    const form = container.querySelector('#movie-editor-form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      let targetStatus = statusSelect.value as MovieStatus;
      const reviewStatus = licStatusSelect.value as LicenseReviewStatus;

      // REGRA ESTRITA: Impedir publicação se licença não for aprovada
      if (targetStatus === 'published' && reviewStatus !== 'approved') {
        alert('ATENÇÃO: A publicação foi impedida pois a licença ainda não foi homologada como "Aprovada". O filme será salvo como Rascunho para garantir a segurança jurídica.');
        targetStatus = 'draft';
        statusSelect.value = 'draft';
      }

      const moviePayload = {
        id: movie?.id,
        title: (container.querySelector('#f-title') as HTMLInputElement).value.trim(),
        originalTitle: (container.querySelector('#f-orig-title') as HTMLInputElement).value.trim() || undefined,
        synopsis: (container.querySelector('#f-synopsis') as HTMLTextAreaElement).value.trim(),
        year: Number((container.querySelector('#f-year') as HTMLInputElement).value),
        duration: (container.querySelector('#f-duration') as HTMLInputElement).value.trim(),
        category: (container.querySelector('#f-category') as HTMLSelectElement).value,
        posterUrl: (container.querySelector('#f-poster') as HTMLInputElement).value.trim(),
        backdropUrl: (container.querySelector('#f-backdrop') as HTMLInputElement).value.trim() || undefined,
        playbackType: (container.querySelector('#f-playtype') as HTMLSelectElement).value as PlaybackType,
        playbackUrl: (container.querySelector('#f-playurl') as HTMLInputElement).value.trim(),
        featured: (container.querySelector('#f-featured') as HTMLSelectElement).value === 'true',
        status: targetStatus
      };

      const licensePayload = {
        id: license?.id,
        rightsHolder: (container.querySelector('#f-lic-holder') as HTMLInputElement).value.trim(),
        licenseType: (container.querySelector('#f-lic-type') as HTMLSelectElement).value as LicenseType,
        origin: (container.querySelector('#f-lic-origin') as HTMLInputElement).value.trim(),
        territory: (container.querySelector('#f-lic-territory') as HTMLInputElement).value.trim(),
        validUntil: (container.querySelector('#f-lic-valid') as HTMLInputElement).value.trim(),
        proofUrl: (container.querySelector('#f-lic-proof') as HTMLInputElement).value.trim(),
        commercialUseAllowed: (container.querySelector('#f-lic-commercial') as HTMLSelectElement).value === 'true',
        reviewStatus: reviewStatus,
        notes: (container.querySelector('#f-lic-notes') as HTMLTextAreaElement).value.trim() || undefined
      };

      const submitBtn = container.querySelector('#btn-save-movie') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.innerText = 'Salvando e validando...';

      try {
        await MovieService.saveMovieWithLicense(moviePayload, licensePayload);
        alert(targetStatus === 'published' ? 'Filme publicado com sucesso no catálogo!' : 'Filme e licença salvos como rascunho com sucesso!');
        await this.loadAdminData();
        this.currentTab = 'movies';
        this.editingMovie = null;
        this.renderDashboard();
        window.dispatchEvent(new CustomEvent('cinepwa:catalog-updated'));
      } catch (err: any) {
        alert(err.message || 'Erro ao salvar o filme.');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Salvar Obra & Licença';
      }
    });
  }

  // TELA FIREBASE: Informações e Status de Nuvem
  private renderFirebaseInfo(container: HTMLElement) {
    container.innerHTML = `
      <div class="admin-panel-section">
        <div class="firebase-info-card">
          <div class="firebase-header-row">
            <div class="firebase-logo-tag">
              <span class="fb-fire">🔥</span>
              <h3>Integração Cloud Firestore & Firebase Auth</h3>
            </div>
            <span class="badge-fb-status ${isFirebaseConfigured ? 'status-connected' : 'status-demo'}">
              ${isFirebaseConfigured ? '✓ Conectado à Nuvem' : '⚡ Modo Demonstração Local'}
            </span>
          </div>

          <p class="fb-intro-text">
            O CinePWA foi projetado para funcionar de forma independente e resiliente. Quando o arquivo <code>.env</code> está configurado, o app sincroniza em tempo real com o Cloud Firestore e protege os dados via regras de segurança server-side.
          </p>

          <div class="fb-grid-info">
            <div class="fb-card-mini">
              <h4>Coleções no Firestore</h4>
              <ul>
                <li><code>movies</code>: Documentos públicos com <code>status == 'published'</code>.</li>
                <li><code>licenses</code>: Registros privados com permissão de leitura restrita a administradores.</li>
                <li><code>admins</code>: Lista de administradores com <code>uid</code>, <code>role == 'admin'</code> e <code>active == true</code>.</li>
              </ul>
            </div>

            <div class="fb-card-mini">
              <h4>Configuração Atual (.env)</h4>
              <table class="fb-env-table">
                <tr><td>VITE_FIREBASE_PROJECT_ID:</td><td><code>${fbConfig.projectId || '(não informado / demo)'}</code></td></tr>
                <tr><td>VITE_FIREBASE_AUTH_DOMAIN:</td><td><code>${fbConfig.authDomain || '(não informado / demo)'}</code></td></tr>
                <tr><td>VITE_FIREBASE_API_KEY:</td><td><code>${fbConfig.apiKey ? '••••••••••••' : '(não informada)'}</code></td></tr>
              </table>
            </div>
          </div>

          <div class="fb-rules-preview">
            <h4>Regras de Segurança Aplicadas (firestore.rules)</h4>
            <pre class="rules-code-block">
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.active == true;
    }
    match /movies/{movieId} {
      allow read: if resource.data.status == 'published' || isAdmin();
      allow write: if isAdmin();
    }
    match /licenses/{licenseId} {
      allow read, write: if isAdmin();
    }
    match /admins/{adminId} {
      allow read: if request.auth != null && request.auth.uid == adminId;
      allow write: if false; // Criado apenas pelo console do Firebase
    }
  }
}
            </pre>
          </div>
        </div>
      </div>
    `;
  }
}

export const adminPanelModal = new AdminPanelModal();
