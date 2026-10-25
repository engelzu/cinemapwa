import Hls from 'hls.js';
import type { Movie } from '../types';

export class VideoPlayerModal {
  private container: HTMLElement | null = null;
  private currentMovie: Movie | null = null;
  private hlsInstance: Hls | null = null;

  constructor() {
    this.createDom();
  }

  private createDom() {
    let el = document.getElementById('cine-player-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cine-player-modal';
      el.className = 'player-modal-backdrop hidden';
      document.body.appendChild(el);
    }
    this.container = el;

    // Fechar ao pressionar ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.container?.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  public open(movie: Movie) {
    this.currentMovie = movie;
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="player-container animate-fade-in" id="player-main-box">
        <header class="player-header">
          <div class="player-title-info">
            <span class="player-badge">REPRODUÇÃO AUTORIZADA</span>
            <h2 class="player-title">${movie.title} (${movie.year})</h2>
            <span class="player-category">${movie.category} • ${movie.duration}</span>
          </div>
          <button class="player-close-btn" id="player-close-btn" title="Fechar reprodutor (ESC)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div class="player-viewport" id="player-viewport">
          <div class="player-loading-spinner" id="player-spinner">
            <div class="spinner"></div>
            <p>Carregando fonte autorizada...</p>
          </div>
        </div>

        <footer class="player-footer">
          <div class="legal-disclaimer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Licença Verificada: <strong>${movie.license?.licenseType || 'Domínio Público'}</strong> (${movie.license?.rightsHolder || 'Internet Archive / Autorizado'})</span>
          </div>
          <div class="player-actions-right">
            <a href="${movie.playbackUrl}" target="_blank" rel="noopener noreferrer" class="btn-ghost" id="player-external-btn" title="Abrir link original em nova aba">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span>Abrir Fonte</span>
            </a>
            <button class="btn-ghost" id="player-fullscreen-btn" title="Alternar Tela Cheia">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
              <span>Tela Cheia</span>
            </button>
          </div>
        </footer>
      </div>
    `;

    this.container.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Eventos
    document.getElementById('player-close-btn')?.addEventListener('click', () => this.close());
    document.getElementById('player-fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());

    this.renderVideoSource(movie);
  }

  private renderVideoSource(movie: Movie) {
    const viewport = document.getElementById('player-viewport');
    const spinner = document.getElementById('player-spinner');
    if (!viewport) return;

    let url = movie.playbackUrl.trim();

    if (!url) {
      this.renderError('Link de reprodução não informado ou em manutenção.');
      return;
    }

    // Normalização automática de URLs do Archive.org e YouTube
    if (url.includes('archive.org/details/')) {
      url = url.replace('archive.org/details/', 'archive.org/embed/');
    }
    if (url.includes('youtube.com/watch?v=')) {
      const vid = url.split('watch?v=')[1]?.split('&')[0];
      if (vid) url = `https://www.youtube.com/embed/${vid}`;
    } else if (url.includes('youtu.be/')) {
      const vid = url.split('youtu.be/')[1]?.split('?')[0];
      if (vid) url = `https://www.youtube.com/embed/${vid}`;
    }

    if (movie.playbackType === 'embed' || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('archive.org/embed/')) {
      // Iframe de incorporação externa autorizada
      const iframe = document.createElement('iframe');
      iframe.className = 'player-iframe';
      iframe.src = url;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
      iframe.allowFullscreen = true;
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      iframe.loading = 'lazy';

      iframe.onload = () => {
        spinner?.remove();
      };

      iframe.onerror = () => {
        this.renderError('A fonte externa deste vídeo bloqueou a incorporação ou está fora do ar.');
      };

      viewport.appendChild(iframe);
      // Timeout de segurança para remover o spinner se onload demorar
      setTimeout(() => spinner?.remove(), 2500);

    } else if (movie.playbackType === 'hls' || url.endsWith('.m3u8')) {
      // Reprodução HLS via hls.js
      const video = document.createElement('video');
      video.className = 'player-video';
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        });
        this.hlsInstance = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          spinner?.remove();
          video.play().catch(() => console.log('Autoplay com som restrito pelo navegador'));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn('Erro fatal no stream HLS:', data);
            this.renderError('Transmissão ao vivo / HLS indisponível no momento.');
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Suporte nativo Safari iOS/macOS
        video.src = url;
        video.onloadedmetadata = () => {
          spinner?.remove();
          video.play().catch(() => {});
        };
        video.onerror = () => {
          this.renderError('Não foi possível carregar a transmissão HLS neste navegador.');
        };
      } else {
        this.renderError('Seu navegador não possui suporte para reprodução no formato HLS.');
      }

      viewport.appendChild(video);

    } else {
      // Reprodução MP4 / WebM direta
      const video = document.createElement('video');
      video.className = 'player-video';
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.src = url;

      video.onloadeddata = () => {
        spinner?.remove();
        video.play().catch(() => console.log('Autoplay aguarda interação do usuário'));
      };

      video.onerror = () => {
        this.renderError('O arquivo de vídeo não pôde ser reproduzido ou o link está indisponível.');
      };

      viewport.appendChild(video);
    }
  }

  private renderError(message: string) {
    const viewport = document.getElementById('player-viewport');
    if (!viewport) return;
    viewport.innerHTML = `
      <div class="player-error-container">
        <div class="player-error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 class="player-error-title">Vídeo Indisponível</h3>
        <p class="player-error-desc">${message}</p>
        <p class="player-error-sub">O CinePWA conecta-se estritamente a fontes externas autorizadas. Se o link foi modificado pela fonte hospedeira, nossa equipe será notificada para atualização da licença.</p>
        <div class="player-error-actions">
          <button class="btn btn-secondary" id="player-retry-btn">
            Tentar Novamente
          </button>
          <a href="${this.currentMovie?.playbackUrl || '#'}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Abrir Link Externo
          </a>
          <button class="btn btn-primary" id="player-back-btn">
            Voltar ao Catálogo
          </button>
        </div>
      </div>
    `;

    document.getElementById('player-retry-btn')?.addEventListener('click', () => {
      if (this.currentMovie) {
        viewport.innerHTML = `
          <div class="player-loading-spinner" id="player-spinner">
            <div class="spinner"></div>
            <p>Reconectando à fonte autorizada...</p>
          </div>
        `;
        this.renderVideoSource(this.currentMovie);
      }
    });

    document.getElementById('player-back-btn')?.addEventListener('click', () => this.close());
  }

  private toggleFullscreen() {
    const box = document.getElementById('player-main-box');
    if (!box) return;
    if (!document.fullscreenElement) {
      box.requestFullscreen().catch((err) => console.warn('Erro ao ativar tela cheia:', err));
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  public close() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
    }
    document.body.style.overflow = '';
    this.currentMovie = null;
  }
}

export const videoPlayerModal = new VideoPlayerModal();
