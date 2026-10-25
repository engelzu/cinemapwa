import type { Movie } from '../types';
import { MovieService } from '../services/movieService';
import { videoPlayerModal } from './videoPlayer';
import { getContentRatingHtml, getAudioBadgeHtml } from './movieCard';

export class MovieDetailsModal {
  private container: HTMLElement | null = null;
  private currentMovie: Movie | null = null;

  constructor() {
    this.createDom();
  }

  private createDom() {
    let el = document.getElementById('cine-details-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cine-details-modal';
      el.className = 'modal-backdrop hidden';
      document.body.appendChild(el);
    }
    this.container = el;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.container?.classList.contains('hidden')) {
        this.close();
      }
    });

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });
  }

  public open(movie: Movie) {
    this.currentMovie = movie;
    if (!this.container) return;

    const isFav = MovieService.isFavorite(movie.id);
    const lic = movie.license;

    this.container.innerHTML = `
      <div class="modal-card animate-scale-up">
        <button class="modal-close-floating" id="modal-close-btn" title="Fechar (ESC)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="modal-hero-cover" style="background-image: url('${movie.backdropUrl || movie.posterUrl}')">
          <div class="modal-hero-overlay"></div>
          <div class="modal-hero-content">
            <span class="badge-accent">${movie.category}</span>
            <h1 class="modal-movie-title">${movie.title}</h1>
            ${movie.originalTitle ? `<p class="modal-original-title">${movie.originalTitle}</p>` : ''}
            
            <div class="modal-meta-row">
              ${getAudioBadgeHtml(movie.audioLanguage)}
              ${getContentRatingHtml(movie.contentRating)}
              <span class="meta-tag year">${movie.year}</span>
              <span class="meta-tag duration">${movie.duration}</span>
              <span class="meta-tag quality">${movie.year >= 2000 ? '4K Ultra HD' : 'HD 1080p'}</span>
              <span class="meta-tag status-verified">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Autorização Verificada
              </span>
            </div>

            <div class="modal-cta-row">
              <button class="btn btn-primary btn-play-large" id="modal-play-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Assistir Agora
              </button>
              <button class="btn btn-secondary" id="modal-fav-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? '#e50914' : 'none'}" stroke="${isFav ? '#e50914' : 'currentColor'}" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span id="modal-fav-label">${isFav ? 'Na Minha Lista' : 'Adicionar à Lista'}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-body-grid">
          <div class="modal-synopsis-col">
            <h3 class="section-title-sm">Sinopse da Obra</h3>
            <p class="modal-synopsis-text">${movie.synopsis}</p>

            <div class="modal-technical-specs">
              <div class="spec-item">
                <span class="spec-label">Formato de Reprodução</span>
                <span class="spec-value">${movie.playbackType.toUpperCase()} (Transmissão Externa)</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Ano de Lançamento</span>
                <span class="spec-value">${movie.year}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Acessibilidade</span>
                <span class="spec-value">Gratuito • Sem Anúncios • Sem Assinatura</span>
              </div>
            </div>
          </div>

          <div class="modal-legal-col">
            <div class="legal-card-verified">
              <div class="legal-card-header">
                <div class="legal-icon-wrap">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                </div>
                <div>
                  <h4 class="legal-card-title">Transparência & Direitos</h4>
                  <p class="legal-card-subtitle">Conformidade e licença registrada</p>
                </div>
              </div>

              <div class="legal-details-list">
                <div class="legal-item">
                  <span class="legal-key">Tipo de Licença:</span>
                  <span class="legal-val badge-legal">${lic?.licenseType || 'Domínio Público Certificado'}</span>
                </div>
                <div class="legal-item">
                  <span class="legal-key">Titular / Certificador:</span>
                  <span class="legal-val">${lic?.rightsHolder || 'Internet Archive / Domínio Público'}</span>
                </div>
                <div class="legal-item">
                  <span class="legal-key">Território Permitido:</span>
                  <span class="legal-val">${lic?.territory || 'Brasil e Internacional'}</span>
                </div>
                <div class="legal-item">
                  <span class="legal-key">Origem do Acervo:</span>
                  <span class="legal-val">${lic?.origin || 'Internet Archive'}</span>
                </div>
                <div class="legal-item">
                  <span class="legal-key">Validade Jurídica:</span>
                  <span class="legal-val">${lic?.validUntil || 'Indeterminada'}</span>
                </div>
                ${lic?.notes ? `
                  <div class="legal-notes">
                    <p><strong>Nota legal:</strong> ${lic.notes}</p>
                  </div>
                ` : ''}
              </div>

              ${lic?.proofUrl ? `
                <a href="${lic.proofUrl}" target="_blank" rel="noopener noreferrer" class="legal-proof-link">
                  <span>Ver registro / comprovação de direitos</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Ações
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close());
    
    document.getElementById('modal-play-btn')?.addEventListener('click', () => {
      this.close();
      if (this.currentMovie) {
        videoPlayerModal.open(this.currentMovie);
      }
    });

    const favBtn = document.getElementById('modal-fav-btn');
    favBtn?.addEventListener('click', () => {
      if (!this.currentMovie) return;
      const isNow = MovieService.toggleFavorite(this.currentMovie.id);
      const favLabel = document.getElementById('modal-fav-label');
      if (favLabel) favLabel.textContent = isNow ? 'Na Minha Lista' : 'Adicionar à Lista';
      
      const heartSvg = favBtn.querySelector('svg');
      if (heartSvg) {
        heartSvg.setAttribute('fill', isNow ? '#e50914' : 'none');
        heartSvg.setAttribute('stroke', isNow ? '#e50914' : 'currentColor');
      }
    });
  }

  public close() {
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
    }
    document.body.style.overflow = '';
    this.currentMovie = null;
  }
}

export const movieDetailsModal = new MovieDetailsModal();
