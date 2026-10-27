import type { Movie, AudioLanguage } from '../types';
import { MovieService } from '../services/movieService';
import { PosterService } from '../services/posterService';
import { movieDetailsModal } from './movieModal';
import { videoPlayerModal } from './videoPlayer';

export function getContentRatingHtml(rating?: string): string {
  if (!rating) return '';
  const r = String(rating).toUpperCase().replace('+', '');
  let className = 'rating-l';
  let label = 'L';
  let desc = 'Classificação Indicativa: Livre para todos os públicos';

  if (r === '10') {
    className = 'rating-10';
    label = '10';
    desc = 'Classificação Indicativa: Não recomendado para menores de 10 anos';
  } else if (r === '12') {
    className = 'rating-12';
    label = '12';
    desc = 'Classificação Indicativa: Não recomendado para menores de 12 anos';
  } else if (r === '14') {
    className = 'rating-14';
    label = '14';
    desc = 'Classificação Indicativa: Não recomendado para menores de 14 anos';
  } else if (r === '16') {
    className = 'rating-16';
    label = '16';
    desc = 'Classificação Indicativa: Não recomendado para menores de 16 anos';
  } else if (r === '18') {
    className = 'rating-18';
    label = '18';
    desc = 'Classificação Indicativa: Não recomendado para menores de 18 anos';
  }

  return `<span class="rating-badge ${className}" title="${desc}">${label}</span>`;
}

export function getAudioBadgeHtml(audio?: AudioLanguage | string): string {
  if (!audio) return '';
  if (audio === 'Dublado') {
    return `<span class="badge-audio dublado" title="Áudio Dublado em Português Brasileiro">🎙️ DUBLADO</span>`;
  }
  if (audio === 'Legendado') {
    return `<span class="badge-audio legendado" title="Legendas em Português Brasileiro">💬 LEGENDADO</span>`;
  }
  if (audio === 'Nacional') {
    return `<span class="badge-audio nacional" title="Filme Nacional Falado em Português">🇧🇷 NACIONAL</span>`;
  }
  if (audio === 'Sem Diálogo') {
    return `<span class="badge-audio mudo" title="Narrativa Visual / Musical (Sem Barreira de Idioma)">🎼 SEM DIÁLOGO</span>`;
  }
  if (audio === 'Original') {
    return `<span class="badge-audio original" title="Áudio Original Internacional">🌐 ORIGINAL</span>`;
  }
  return '';
}

export function getQualityBadgeHtml(quality?: string, year?: number): string {
  let q = quality || '';
  if (!q) {
    if (year && year >= 2018) q = '4K';
    else if (year && year >= 2000) q = 'Full HD';
    else q = 'HD';
  } else if (q.includes('4K')) {
    q = '4K';
  } else if (q.includes('Full HD') || q.includes('1080')) {
    q = 'Full HD';
  } else {
    q = 'HD';
  }

  return `<span class="badge-quality" title="Resolução máxima disponível: ${q}">${q}</span>`;
}

import { ProgressService } from '../services/progressService';

export function getCountryBadgeHtml(country?: string, code?: string): string {
  if (!country && !code) return '';
  const c = (code || country || '').toUpperCase();
  let flag = '🌍';
  let short = code || '';
  if (c.includes('BR') || country === 'Brasil') { flag = '🇧🇷'; short = 'BR'; }
  else if (c.includes('JP') || country === 'Japão') { flag = '🇯🇵'; short = 'JP'; }
  else if (c.includes('KR') || country === 'Coreia do Sul') { flag = '🇰🇷'; short = 'KR'; }
  else if (c.includes('US') || country === 'Estados Unidos') { flag = '🇺🇸'; short = 'US'; }
  else if (c.includes('MX') || country === 'México') { flag = '🇲🇽'; short = 'MX'; }
  else if (c.includes('GB') || country === 'Reino Unido') { flag = '🇬🇧'; short = 'GB'; }
  else if (c.includes('FR') || country === 'França') { flag = '🇫🇷'; short = 'FR'; }
  else if (c.includes('DE') || country === 'Alemanha') { flag = '🇩🇪'; short = 'DE'; }
  else if (c.includes('NL')) { flag = '🇳🇱'; short = 'NL'; }
  else if (c.includes('NO')) { flag = '🇳🇴'; short = 'NO'; }

  return `<span class="badge-country" title="Origem: ${country || short}">${flag} ${short}</span>`;
}

export function renderMovieCard(movie: Movie): HTMLElement {
  const card = document.createElement('article');
  card.className = 'movie-card';
  card.setAttribute('data-id', movie.id);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Ver detalhes de ${movie.title}`);

  const isFav = MovieService.isFavorite(movie.id);
  const ratingHtml = getContentRatingHtml(movie.contentRating);
  const audioBadge = getAudioBadgeHtml(movie.audioLanguage);
  const qualityBadge = getQualityBadgeHtml(movie.quality, movie.year);
  const countryBadge = getCountryBadgeHtml(movie.country, movie.countryCode);
  const hasEpisodes = Boolean(movie.episodes && movie.episodes.length > 0);
  const episodesBadge = hasEpisodes ? `<span class="badge-series" title="${movie.episodes!.length} episódios disponíveis">📺 ${movie.episodes!.length} EPS</span>` : '';

  const progress = ProgressService.getProgress(movie.id);
  const hasProgress = Boolean(progress && progress.percent > 0 && progress.percent < 92);

  // Obter poster em alta resolução cinematográfica (eliminando capturas borradas de vídeo)
  let initialPoster = movie.posterUrl;
  if (!initialPoster || initialPoster.includes('archive.org/services/img/')) {
    initialPoster = PosterService.getHighResPoster(movie.title, movie.originalTitle, movie.category);
  }
  const fallbackImg = PosterService.getGenrePoolFallback(movie.title, movie.category);

  card.innerHTML = `
    <div class="poster-wrapper">
      <img 
        src="${initialPoster}" 
        alt="Capa do filme ${movie.title}" 
        class="movie-poster" 
        loading="lazy" 
        referrerpolicy="no-referrer"
        onerror="this.onerror=null; this.src='${fallbackImg}';"
      />
      <div class="poster-gradient-overlay"></div>
      
      <div class="card-top-badges">
        <div class="badges-group-left">
          ${audioBadge}
          ${countryBadge}
          ${episodesBadge}
        </div>
        <button class="card-fav-btn ${isFav ? 'is-fav' : ''}" data-movie-id="${movie.id}" title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" aria-label="Favoritar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? '#e50914' : 'none'}" stroke="${isFav ? '#e50914' : '#fff'}" stroke-width="2.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>

      ${hasProgress ? `
        <div class="card-progress-bar" title="${progress!.percent}% assistido">
          <div class="card-progress-fill" style="width: ${progress!.percent}%"></div>
        </div>
      ` : ''}

      <div class="card-hover-actions">
        <button class="btn-play-circle" data-play-id="${movie.id}" title="${hasProgress ? `Continuar (${progress!.percent}%)` : `Assistir ${movie.title}`}" aria-label="Assistir filme">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
        <span class="hover-label-play">${hasProgress ? `Retomar ${progress!.percent}%` : 'Assistir'}</span>
      </div>
    </div>

    <div class="movie-card-info">
      <h3 class="movie-card-title" title="${movie.title}">${movie.title}</h3>
      <div class="movie-card-meta">
        ${ratingHtml}
        <span class="movie-year">${movie.year}</span>
        <span class="meta-dot">•</span>
        <span class="movie-duration">${movie.duration}</span>
        <span class="meta-dot">•</span>
        ${qualityBadge}
      </div>
      <div class="movie-card-subinfo">
        <span class="movie-card-genre">${movie.category}</span>
      </div>
    </div>
  `;

  // Clique no card abre detalhes
  card.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.card-fav-btn') || target.closest('.btn-play-circle')) {
      return;
    }
    movieDetailsModal.open(movie);
  });

  // Tecla Enter abre detalhes
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      movieDetailsModal.open(movie);
    }
  });

  // Botão Play Rápido
  const playBtn = card.querySelector('.btn-play-circle');
  playBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    videoPlayerModal.open(movie);
  });

  // Botão Favorito
  const favBtn = card.querySelector('.card-fav-btn');
  favBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const updatedStatus = MovieService.toggleFavorite(movie.id);
    favBtn.classList.toggle('is-fav', updatedStatus);
    const svg = favBtn.querySelector('svg');
    if (svg) {
      svg.setAttribute('fill', updatedStatus ? '#e50914' : 'none');
      svg.setAttribute('stroke', updatedStatus ? '#e50914' : '#fff');
    }
    favBtn.setAttribute('title', updatedStatus ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    window.dispatchEvent(new CustomEvent('cinepwa:favorites-changed'));
  });

  // Busca assíncrona de capa oficial de estúdio em alta resolução caso seja um filme novo
  PosterService.fetchLivePoster(movie.title, movie.year).then(livePoster => {
    if (livePoster) {
      const img = card.querySelector('.movie-poster') as HTMLImageElement;
      if (img && img.src !== livePoster) {
        img.src = livePoster;
        movie.posterUrl = livePoster;
      }
    }
  });

  return card;
}
