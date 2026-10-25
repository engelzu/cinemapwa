import type { Movie, License, MovieStatus } from '../types';
import { INITIAL_MOVIES, INITIAL_LICENSES } from '../data/initialMovies';
import { PosterService } from './posterService';
import { db, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';

const MOVIES_LOCAL_KEY = 'cinepwa_movies_v1';
const LICENSES_LOCAL_KEY = 'cinepwa_licenses_v1';
const FAVORITES_LOCAL_KEY = 'cinepwa_favorites_v1';

// Inicializar armazenamento local com os filmes de domínio público e modernos se estiver vazio ou atualizar acervo
function initializeLocalStorage() {
  if (!localStorage.getItem(MOVIES_LOCAL_KEY)) {
    localStorage.setItem(MOVIES_LOCAL_KEY, JSON.stringify(INITIAL_MOVIES));
  } else {
    try {
      const stored: Movie[] = JSON.parse(localStorage.getItem(MOVIES_LOCAL_KEY) || '[]');
      let updated = false;

      // 1. Atualizar campos dos filmes já existentes e higienizar clipes antigos
      const newStored = stored
        .filter(sm => {
          const t = (sm.title || '').toLowerCase();
          return !t.includes('love song') && 
                 !t.includes('live concert') && 
                 !t.includes('tnt/space') && 
                 !t.includes('temperatura máxima') &&
                 !t.startsWith('ep ') &&
                 !t.startsWith('ep.') &&
                 !t.includes('news') &&
                 !t.includes('canção') &&
                 !t.includes('cancao') &&
                 !t.includes('episodio') &&
                 !t.includes('episódio');
        })
        .map(sm => {
          const initialMatch = INITIAL_MOVIES.find(im => im.id === sm.id);
          if (initialMatch) {
            updated = true;
            return {
              ...sm,
              title: initialMatch.title || sm.title,
              originalTitle: initialMatch.originalTitle || sm.originalTitle,
              posterUrl: initialMatch.posterUrl || sm.posterUrl,
              backdropUrl: initialMatch.backdropUrl || sm.backdropUrl,
              playbackUrl: initialMatch.playbackUrl,
              playbackType: initialMatch.playbackType,
              contentRating: initialMatch.contentRating || sm.contentRating,
              era: initialMatch.era || sm.era,
              type: initialMatch.type || sm.type,
              audioLanguage: initialMatch.audioLanguage || sm.audioLanguage,
              quality: initialMatch.quality || sm.quality || 'Full HD',
              license: initialMatch.license || sm.license,
              featured: !!initialMatch.featured,
              year: initialMatch.year || sm.year,
              duration: initialMatch.duration || sm.duration
            };
          }
          // Substituir capturas de vídeo borradas do Internet Archive por pôsteres em alta resolução
          if (sm.posterUrl && sm.posterUrl.includes('archive.org/services/img/')) {
            sm.posterUrl = PosterService.getHighResPoster(sm.title, sm.originalTitle, sm.category);
            updated = true;
          }
          if (sm.featured && sm.id !== 'mov-jurassic-2022') {
            sm.featured = false;
            updated = true;
          }
          if (!sm.quality) {
            sm.quality = (sm.year && sm.year >= 2018) ? '4K Ultra HD' : (sm.year && sm.year >= 2000) ? 'Full HD' : 'HD';
            updated = true;
          }
          return sm;
        });

      // Garantir que o filme destaque moderno em 4K Ultra HD seja Jurassic World: Domínio
      const jw = newStored.find(m => m.id === 'mov-jurassic-2022');
      if (jw && !jw.featured) {
        jw.featured = true;
        updated = true;
      }

      // 2. Adicionar novos filmes do acervo inicial que ainda não constavam no localStorage
      INITIAL_MOVIES.forEach(initM => {
        if (!newStored.some(m => m.id === initM.id)) {
          newStored.unshift(initM);
          updated = true;
        }
      });

      if (updated || newStored.length !== stored.length) {
        localStorage.setItem(MOVIES_LOCAL_KEY, JSON.stringify(newStored));
      }
    } catch {
      localStorage.setItem(MOVIES_LOCAL_KEY, JSON.stringify(INITIAL_MOVIES));
    }
  }

  if (!localStorage.getItem(LICENSES_LOCAL_KEY)) {
    localStorage.setItem(LICENSES_LOCAL_KEY, JSON.stringify(INITIAL_LICENSES));
  } else {
    try {
      const storedLics: License[] = JSON.parse(localStorage.getItem(LICENSES_LOCAL_KEY) || '[]');
      let updatedLic = false;
      const newLics = storedLics.map(sl => {
        const initLic = INITIAL_LICENSES.find(il => il.id === sl.id);
        if (initLic && initLic.proofUrl !== sl.proofUrl) {
          updatedLic = true;
          return { ...sl, proofUrl: initLic.proofUrl };
        }
        return sl;
      });

      INITIAL_LICENSES.forEach(initL => {
        if (!newLics.some(l => l.id === initL.id)) {
          newLics.unshift(initL);
          updatedLic = true;
        }
      });

      if (updatedLic) {
        localStorage.setItem(LICENSES_LOCAL_KEY, JSON.stringify(newLics));
      }
    } catch {
      localStorage.setItem(LICENSES_LOCAL_KEY, JSON.stringify(INITIAL_LICENSES));
    }
  }
}

initializeLocalStorage();

function getLocalMovies(): Movie[] {
  try {
    const raw = localStorage.getItem(MOVIES_LOCAL_KEY);
    return raw ? JSON.parse(raw) : INITIAL_MOVIES;
  } catch {
    return INITIAL_MOVIES;
  }
}

function getLocalLicenses(): License[] {
  try {
    const raw = localStorage.getItem(LICENSES_LOCAL_KEY);
    return raw ? JSON.parse(raw) : INITIAL_LICENSES;
  } catch {
    return INITIAL_LICENSES;
  }
}

function saveLocalMovies(movies: Movie[]) {
  localStorage.setItem(MOVIES_LOCAL_KEY, JSON.stringify(movies));
}

function saveLocalLicenses(licenses: License[]) {
  localStorage.setItem(LICENSES_LOCAL_KEY, JSON.stringify(licenses));
}

export const MovieService = {
  // Retorna somente filmes publicados para o público visitante
  async getPublicMovies(): Promise<Movie[]> {
    // 1. Tentar carregar da API Serverless do Neon Postgres (Vercel)
    try {
      const res = await fetch('/api/movies');
      if (res.ok) {
        const data = await res.json();
        if (data.movies && data.movies.length > 0) {
          return data.movies;
        }
      }
    } catch {
      // Falha silenciosa de rede/offline
    }

    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'movies'), where('status', '==', 'published'));
        const querySnapshot = await getDocs(q);
        const list: Movie[] = [];
        
        for (const docSnap of querySnapshot.docs) {
          const movieData = docSnap.data() as Movie;
          // Buscar licença associada
          let license = movieData.license;
          if (!license && movieData.licenseId) {
            try {
              const licDoc = await getDoc(doc(db, 'licenses', movieData.licenseId));
              if (licDoc.exists()) {
                license = licDoc.data() as License;
              }
            } catch {
              // Se a regra de segurança bloquear leitura pública de licença, usa dados resumidos
            }
          }
          list.push({ ...movieData, id: docSnap.id, license });
        }
        
        if (list.length > 0) return list;
      } catch (err) {
        console.warn('Falha ao consultar Firestore, usando acervo local:', err);
      }
    }

    // Modo local / fallback
    const movies = getLocalMovies();
    const licenses = getLocalLicenses();
    return movies
      .filter(m => m.status === 'published')
      .map(m => ({
        ...m,
        license: m.license || licenses.find(l => l.id === m.licenseId)
      }));
  },

  // Retorna todos os filmes para o painel administrativo (draft, published, disabled)
  async getAllMoviesForAdmin(): Promise<Movie[]> {
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'movies'));
        const list: Movie[] = [];
        for (const docSnap of querySnapshot.docs) {
          const movieData = docSnap.data() as Movie;
          let license = movieData.license;
          if (movieData.licenseId) {
            try {
              const licDoc = await getDoc(doc(db, 'licenses', movieData.licenseId));
              if (licDoc.exists()) {
                license = licDoc.data() as License;
              }
            } catch {
              // Admin pode ver licença
            }
          }
          list.push({ ...movieData, id: docSnap.id, license });
        }
        if (list.length > 0) return list;
      } catch (err) {
        console.warn('Erro ao carregar filmes do Firestore para admin:', err);
      }
    }

    const movies = getLocalMovies();
    const licenses = getLocalLicenses();
    return movies.map(m => ({
      ...m,
      license: m.license || licenses.find(l => l.id === m.licenseId)
    }));
  },

  async getMovieById(id: string): Promise<Movie | null> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, 'movies', id));
        if (snap.exists()) {
          const movie = snap.data() as Movie;
          if (movie.licenseId) {
            const licSnap = await getDoc(doc(db, 'licenses', movie.licenseId));
            if (licSnap.exists()) {
              movie.license = licSnap.data() as License;
            }
          }
          return { ...movie, id: snap.id };
        }
      } catch (err) {
        console.warn('Falha ao buscar filme no Firestore:', err);
      }
    }

    const movies = getLocalMovies();
    const licenses = getLocalLicenses();
    const found = movies.find(m => m.id === id);
    if (!found) return null;
    return {
      ...found,
      license: found.license || licenses.find(l => l.id === found.licenseId)
    };
  },

  // Salvar ou atualizar filme com verificação estrita de direitos
  async saveMovieWithLicense(
    movieData: Omit<Movie, 'id' | 'licenseId' | 'license' | 'createdAt' | 'updatedAt'> & { id?: string },
    licenseData: Omit<License, 'id' | 'movieId'> & { id?: string }
  ): Promise<{ movie: Movie; license: License }> {
    // REGRA DE OURO: Impedir publicação enquanto a autorização não estiver validada
    if (movieData.status === 'published' && licenseData.reviewStatus !== 'approved') {
      throw new Error(
        'Publicação bloqueada! A licença precisa estar com status "Aprovado" e ter comprovação jurídica válida para disponibilizar o filme publicamente.'
      );
    }

    const now = new Date().toISOString();
    const movieId = movieData.id || `mov-${Date.now()}`;
    const licenseId = licenseData.id || `lic-${Date.now()}`;

    const completeLicense: License = {
      ...licenseData,
      id: licenseId,
      movieId: movieId,
      verifiedAt: licenseData.reviewStatus === 'approved' ? (licenseData.verifiedAt || now) : undefined
    };

    const completeMovie: Movie = {
      ...movieData,
      id: movieId,
      licenseId: licenseId,
      license: completeLicense,
      createdAt: (movieData as any).createdAt || now,
      updatedAt: now
    };

    // Tentar persistência no banco Neon Postgres (Vercel)
    try {
      await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie: completeMovie, license: completeLicense })
      });
    } catch {
      // Falha silenciosa de rede/offline
    }

    if (isFirebaseConfigured && db) {
      try {
        // Salvar licença no Firestore
        await setDoc(doc(db, 'licenses', licenseId), completeLicense);
        // Salvar filme no Firestore (com referência e cópia da licença para consultas rápidas)
        await setDoc(doc(db, 'movies', movieId), completeMovie);
        return { movie: completeMovie, license: completeLicense };
      } catch (err) {
        console.warn('Erro ao salvar no Firestore, salvando localmente:', err);
      }
    }

    // Persistência local
    const movies = getLocalMovies();
    const licenses = getLocalLicenses();

    const movieIndex = movies.findIndex(m => m.id === movieId);
    if (movieIndex >= 0) {
      movies[movieIndex] = completeMovie;
    } else {
      movies.unshift(completeMovie);
    }

    const licenseIndex = licenses.findIndex(l => l.id === licenseId);
    if (licenseIndex >= 0) {
      licenses[licenseIndex] = completeLicense;
    } else {
      licenses.unshift(completeLicense);
    }

    saveLocalMovies(movies);
    saveLocalLicenses(licenses);

    return { movie: completeMovie, license: completeLicense };
  },

  async updateMovieStatus(id: string, newStatus: MovieStatus): Promise<void> {
    const movie = await this.getMovieById(id);
    if (!movie) throw new Error('Filme não encontrado.');

    if (newStatus === 'published') {
      if (!movie.license || movie.license.reviewStatus !== 'approved') {
        throw new Error(
          'Não é permitido publicar filme sem autorização previamente validada e aprovada pelo administrador!'
        );
      }
    }

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'movies', id), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
        return;
      } catch (err) {
        console.warn('Erro ao atualizar status no Firestore:', err);
      }
    }

    const movies = getLocalMovies();
    const index = movies.findIndex(m => m.id === id);
    if (index >= 0) {
      movies[index].status = newStatus;
      movies[index].updatedAt = new Date().toISOString();
      saveLocalMovies(movies);
    }
  },

  async deleteMovie(id: string): Promise<void> {
    try {
      await fetch(`/api/movies?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // offline
    }

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'movies', id));
        return;
      } catch (err) {
        console.warn('Erro ao deletar no Firestore:', err);
      }
    }

    const movies = getLocalMovies().filter(m => m.id !== id);
    saveLocalMovies(movies);
  },

  // Gerenciamento de Favoritos (persistência de conveniência no navegador do visitante)
  getFavoriteIds(): string[] {
    try {
      const raw = localStorage.getItem(FAVORITES_LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  toggleFavorite(movieId: string): boolean {
    const list = this.getFavoriteIds();
    const index = list.indexOf(movieId);
    let isNowFav = false;
    if (index >= 0) {
      list.splice(index, 1);
      isNowFav = false;
    } else {
      list.push(movieId);
      isNowFav = true;
    }
    localStorage.setItem(FAVORITES_LOCAL_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('cinepwa:favorites-changed', { detail: { movieId, isNowFav } }));
    return isNowFav;
  },

  isFavorite(movieId: string): boolean {
    return this.getFavoriteIds().includes(movieId);
  }
};
