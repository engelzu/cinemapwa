import type { Movie } from '../types';

export interface WatchProgress {
  movieId: string;
  episodeId?: string;
  currentTime: number;
  duration: number;
  percent: number;
  updatedAt: string;
}

const STORAGE_KEY = 'cinepwa_continue_watching';

export const ProgressService = {
  getAllProgress(): Record<string, WatchProgress> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getProgress(movieId: string): WatchProgress | null {
    const all = this.getAllProgress();
    return all[movieId] || null;
  },

  saveProgress(movieId: string, currentTime: number, duration: number, episodeId?: string): void {
    if (!movieId || isNaN(currentTime) || isNaN(duration) || duration <= 0) return;

    const percent = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));
    const all = this.getAllProgress();

    // Se o vídeo foi assistido mais de 92%, considera concluído e remove da lista de retomar
    if (percent >= 92) {
      delete all[movieId];
    } else if (currentTime > 10) { // Salva apenas se assistiu ao menos 10 segundos
      all[movieId] = {
        movieId,
        episodeId,
        currentTime: Math.round(currentTime),
        duration: Math.round(duration),
        percent,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('cinepwa:progress-updated', { detail: { movieId } }));
    } catch (e) {
      console.warn('Erro ao salvar progresso:', e);
    }
  },

  clearProgress(movieId: string): void {
    const all = this.getAllProgress();
    if (all[movieId]) {
      delete all[movieId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        window.dispatchEvent(new CustomEvent('cinepwa:progress-updated', { detail: { movieId } }));
      } catch (e) {
        console.warn('Erro ao limpar progresso:', e);
      }
    }
  },

  getContinueWatchingMovies(availableMovies: Movie[]): Array<{ movie: Movie; progress: WatchProgress }> {
    const all = this.getAllProgress();
    const movieMap = new Map<string, Movie>();
    availableMovies.forEach(m => movieMap.set(m.id, m));

    const list: Array<{ movie: Movie; progress: WatchProgress }> = [];

    Object.values(all).forEach(prog => {
      const m = movieMap.get(prog.movieId);
      if (m) {
        list.push({ movie: m, progress: prog });
      }
    });

    // Ordenar pelo mais recente assistido
    list.sort((a, b) => new Date(b.progress.updatedAt).getTime() - new Date(a.progress.updatedAt).getTime());

    return list;
  }
};
