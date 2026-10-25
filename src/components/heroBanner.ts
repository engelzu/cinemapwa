import type { Movie } from '../types';
import { videoPlayerModal } from './videoPlayer';
import { movieDetailsModal } from './movieModal';
import { MovieService } from '../services/movieService';
import { getContentRatingHtml } from './movieCard';

export function renderHeroBanner(movie: Movie): HTMLElement {
  const hero = document.createElement('section');
  hero.className = 'hero-section';
  hero.id = 'hero-featured-banner';

  const isFav = MovieService.isFavorite(movie.id);

  hero.innerHTML = `
    <div class="hero-backdrop" style="background-image: url('${movie.backdropUrl || movie.posterUrl}');">
      <div class="hero-overlay-horizontal"></div>
      <div class="hero-overlay-vertical"></div>
    </div>

    <div class="hero-content-container">
      <div class="hero-meta-badges">
        <span class="hero-badge-tag">EM DESTAQUE</span>
        <span class="hero-badge-legal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          ${movie.license?.licenseType || 'Domínio Público Verificado'}
        </span>
      </div>

      <h1 class="hero-title">${movie.title}</h1>
      
      <div class="hero-meta-details">
        <span class="hero-quality-badge">${movie.quality || '4K Ultra HD'}</span>
        ${getContentRatingHtml(movie.contentRating)}
        <span class="hero-year">${movie.year}</span>
        <span class="meta-dot">•</span>
        <span class="hero-category">${movie.category}</span>
        <span class="meta-dot">•</span>
        <span class="hero-duration">${movie.duration}</span>
        <span class="meta-dot">•</span>
        <span class="hero-audio-badge">${movie.audioLanguage || 'Dublado'}</span>
        <span class="meta-dot">•</span>
        <span class="badge-free">100% Gratuito</span>
      </div>

      <p class="hero-synopsis">${movie.synopsis}</p>

      <div class="hero-cta-group">
        <button class="btn btn-primary btn-hero-play" id="hero-play-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Assistir Agora
        </button>

        <button class="btn btn-secondary btn-hero-info" id="hero-info-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          Mais Informações
        </button>

        <button class="btn btn-icon-round ${isFav ? 'is-fav' : ''}" id="hero-fav-btn" title="Minha Lista">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav ? '#e50914' : 'none'}" stroke="${isFav ? '#e50914' : 'currentColor'}" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  hero.querySelector('#hero-play-btn')?.addEventListener('click', () => {
    videoPlayerModal.open(movie);
  });

  hero.querySelector('#hero-info-btn')?.addEventListener('click', () => {
    movieDetailsModal.open(movie);
  });

  const favBtn = hero.querySelector('#hero-fav-btn');
  favBtn?.addEventListener('click', () => {
    const isNow = MovieService.toggleFavorite(movie.id);
    favBtn.classList.toggle('is-fav', isNow);
    const svg = favBtn.querySelector('svg');
    if (svg) {
      svg.setAttribute('fill', isNow ? '#e50914' : 'none');
      svg.setAttribute('stroke', isNow ? '#e50914' : 'currentColor');
    }
  });

  return hero;
}
