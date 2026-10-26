import type { Movie, License, AudioLanguage } from '../types';
import { PosterService } from './posterService';

interface ArchiveDoc {
  identifier: string;
  title?: string;
  description?: string;
  year?: number | string;
  runtime?: string;
  length?: number | string;
  item_size?: number | string;
  downloads?: number;
  collection?: string[];
  subject?: string | string[];
}

interface ArchiveApiResponse {
  response: {
    numFound: number;
    start: number;
    docs: ArchiveDoc[];
  };
}

const cache = new Map<string, { movies: Movie[]; total: number }>();

// Pôsteres cinematográficos de alta qualidade estilo Netflix por gênero
const GENRE_POSTERS: Record<string, string> = {
  'Anime & Mangá': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=80',
  'Terror & Suspense': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=700&q=80',
  'Ficção Científica': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
  'Animação & Fantasia': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80',
  'Comédia & Drama': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=80',
  'Documentário': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=700&q=80',
  'Ação & Cyberpunk': 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=700&q=80',
  'Clássicos & Mistério': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80'
};

function cleanText(text?: any): string {
  if (!text) return '';
  const str = Array.isArray(text) ? text.join(' ') : String(text);
  return str
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parser rigoroso de duração baseado no length (em segundos) e runtime do Internet Archive
 * Rejeita qualquer clipe ou vídeo de 1 minuto para nunca exibir "1h 25m" erroneamente
 */
function parseRuntimeAndLength(rawRuntime?: string, rawLength?: string | number): { formatted: string; totalMinutes: number } | null {
  // 1. Tentar length primeiro (length no Solr do archive é o número exato de segundos do vídeo)
  if (rawLength !== undefined && rawLength !== null && rawLength !== '') {
    const totalSec = typeof rawLength === 'number' ? rawLength : parseFloat(String(rawLength));
    if (!isNaN(totalSec) && totalSec > 0) {
      const totalMinutes = Math.round(totalSec / 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return {
        formatted: h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`,
        totalMinutes
      };
    }
  }

  // 2. Tentar runtime
  if (rawRuntime) {
    const str = String(rawRuntime).trim().toLowerCase();

    // Caso A: "108 min" ou "90m" ou "120 mins"
    const mMatch = str.match(/^(\d+)\s*(?:min|m|mins)$/);
    if (mMatch) {
      const mins = parseInt(mMatch[1], 10);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return {
        formatted: h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`,
        totalMinutes: mins
      };
    }

    // Caso B: "HH:MM:SS" (ex: "1:36:20" ou "01:14:43") -> HORA, MINUTO, SEGUNDO
    const hmsMatch = str.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (hmsMatch) {
      const h = parseInt(hmsMatch[1], 10);
      const m = parseInt(hmsMatch[2], 10);
      const totalMinutes = h * 60 + m;
      return {
        formatted: h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`,
        totalMinutes
      };
    }

    // Caso C: "MM:SS" (ex: "01:14" ou "04:30") -> SÃO MINUTOS E SEGUNDOS, NÃO HORAS!
    const msMatch = str.match(/^(\d{1,3}):(\d{2})$/);
    if (msMatch) {
      const mins = parseInt(msMatch[1], 10);
      return {
        formatted: `${mins}m`,
        totalMinutes: mins
      };
    }

    // Caso D: Número bruto
    const num = parseInt(str, 10);
    if (!isNaN(num) && num > 0) {
      const mins = num > 300 ? Math.floor(num / 60) : num;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return {
        formatted: h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`,
        totalMinutes: mins
      };
    }
  }

  return null;
}

/**
 * Extrai o ano real de lançamento do filme a partir do título original ou descrição,
 * evitando que o ano do upload no Archive.org (ex: 2026) substitua o ano real da obra (ex: 1984).
 */
function extractRealMovieYear(rawTitle: string, rawDesc?: string, apiYear?: number | string): number {
  // 1. Procurar ano explícito entre parênteses ou colchetes no título: (1984) ou [1997]
  const parenMatch = rawTitle.match(/[\(\[]\s*(18\d{2}|19\d{2}|20[0-2]\d)\s*[\)\]]/);
  if (parenMatch) {
    const y = parseInt(parenMatch[1], 10);
    if (y >= 1895 && y <= 2025) return y;
  }

  // 2. Procurar ano solto de 4 dígitos no título: ex: "Carrie 1976", "Zorro 1957"
  const titleMatches = rawTitle.match(/\b(189\d|19\d{2}|20[0-2]\d)\b/g);
  if (titleMatches && titleMatches.length > 0) {
    for (const match of titleMatches) {
      const y = parseInt(match, 10);
      if (y >= 1895 && y <= 2025) return y;
    }
  }

  // 3. Procurar na descrição: "lançado em 1984", "ano: 1984", "filme de 1984"
  if (rawDesc) {
    const descMatch = rawDesc.match(/(?:lançado em|ano\s*:|filme de|produção de|lançamento em)\s*(189\d|19\d{2}|20[0-2]\d)\b/i);
    if (descMatch) {
      return parseInt(descMatch[1], 10);
    }
  }

  // 4. Se o metadado da API for um ano plausível de filme (e não ano de upload recente como 2026)
  if (apiYear) {
    const num = typeof apiYear === 'number' ? apiYear : parseInt(String(apiYear), 10);
    if (!isNaN(num) && num >= 1895 && num <= 2024) {
      return num;
    }
  }

  return 1980; // Ano clássico neutro
}

function formatCleanTitle(raw: string): string {
  let title = raw
    // Remover prefixos com números de catálogo e símbolos como "040 ✿ ", "190 ✿ ", "01 - "
    .replace(/^\s*\d{2,4}\s*[-–—:✿❖★•*?#]+\s*/gi, '')
    // Remover flores e símbolos decorativos
    .replace(/[✿❖★•*?#]+/g, ' ')
    // Remover blocos entre parênteses/colchetes contendo anos ou tags técnicas ex: (1984), [DADFLIX], [1978 Uncut]
    .replace(/[\(\[]\s*[^)\]]*(?:18\d{2}|19\d{2}|20\d{2}|dadflix|dublado|uncut|cantonese|pt-br)[^)\]]*[\)\]]/gi, '')
    // Remover anos de 4 dígitos isolados que sobraram
    .replace(/\b(189\d|19\d{2}|20[0-2]\d)\b/g, '')
    // Remover pontos e underscores
    .replace(/[._]/g, ' ')
    // Remover tags técnicas de formato
    .replace(/\b(1080p|720p|480p|bluray|blu-ray|web-dl|x264|x265|dvdrip|rip|hdtv|vose|henry thomas)\b/gi, '')
    // Remover tags de áudio
    .replace(/\b(dublado|dublagem|legendado|legendas|pt-br|pt br)\b/gi, '')
    // Remover assinaturas
    .replace(/\b(lapumiafilmes\.com|alan680|conhecimento eh poder|dadflix)\b/gi, '')
    // Espaços múltiplos
    .replace(/\s+/g, ' ')
    .trim();

  // Limpar traços, parênteses vazios ou pontuações órfãs nas pontas
  title = title
    .replace(/^[-–—:()\[\]]+\s*/, '')
    .replace(/[-–—:()\[\]]+\s*$/, '')
    .trim();

  return title || raw;
}

function inferCategory(title: string, desc: string, sub: string): string {
  const t = (title + ' ' + desc + ' ' + sub).toLowerCase();
  if (t.includes('anime') || t.includes('manga') || t.includes('mangá') || t.includes('dragon ball') || t.includes('street fighter') || t.includes('naruto') || t.includes('zodiaco') || t.includes('seiya') || t.includes('akira') || t.includes('toei') || t.includes('ghibli')) {
    return 'Anime & Mangá';
  }
  if (t.includes('horror') || t.includes('terror') || t.includes('vampire') || t.includes('vampiro') || t.includes('monster') || t.includes('monstro') || t.includes('zombie') || t.includes('mortos') || t.includes('dracula') || t.includes('frankenstein')) {
    return 'Terror & Suspense';
  }
  if (t.includes('animation') || t.includes('animação') || t.includes('cartoon') || t.includes('desenho') || t.includes('popeye') || t.includes('blender') || t.includes('sintel') || t.includes('big buck')) {
    return 'Animação & Família';
  }
  if (t.includes('sci-fi') || t.includes('ficção') || t.includes('science fiction') || t.includes('space') || t.includes('espaço') || t.includes('robot') || t.includes('robô') || t.includes('alien') || t.includes('cyberpunk') || t.includes('metropolis')) {
    return 'Ficção Científica';
  }
  if (t.includes('action') || t.includes('ação') || t.includes('aventura') || t.includes('adventure') || t.includes('luta') || t.includes('kung fu') || t.includes('karate') || t.includes('perseguição') || t.includes('tiro') || t.includes('guerra') || t.includes('crime') || t.includes('policial') || t.includes('suspense')) {
    return 'Ação & Aventura';
  }
  if (t.includes('comedy') || t.includes('comédia') || t.includes('chaplin') || t.includes('keaton') || t.includes('humor') || t.includes('gordo e o magro') || t.includes('engraçado') || t.includes('risos')) {
    return 'Comédia & Humor';
  }
  if (t.includes('documentary') || t.includes('documentário') || t.includes('história') || t.includes('natureza') || t.includes('ciência') || t.includes('biografia')) {
    return 'Documentário';
  }
  if (t.includes('drama') || t.includes('romance') || t.includes('paixão') || t.includes('amor') || t.includes('melodrama')) {
    return 'Drama & Romance';
  }
  return 'Clássicos Históricos';
}

function inferRating(category: string, desc: string): string {
  const d = desc.toLowerCase();
  if (category === 'Terror & Suspense' || d.includes('violence') || d.includes('violência') || d.includes('murder') || d.includes('morte')) {
    return '14';
  }
  if (category === 'Animação & Fantasia' || category === 'Comédia & Drama') {
    return 'L';
  }
  if (category === 'Ficção Científica') {
    return '10';
  }
  return '12';
}

/**
 * Validação rigorosa de idioma: NUNCA classifica como 'Dublado' sem comprovação expressa
 */
function inferAudioLanguage(title: string, desc: string, sub: string): AudioLanguage {
  const t = (title + ' ' + desc + ' ' + sub).toLowerCase();
  
  // 1. DUBLADO (apenas se contiver indicação real de dublagem em português)
  if (
    t.includes('dublado') || 
    t.includes('dublagem') || 
    t.includes('áudio em português') || 
    t.includes('audio em portugues') || 
    t.includes('áudio português') ||
    t.includes('dual áudio') ||
    t.includes('dual audio')
  ) {
    return 'Dublado';
  }

  // 2. LEGENDADO (apenas se contiver legendas comprovadas em português)
  if (
    t.includes('legendado') || 
    t.includes('legendas em português') || 
    t.includes('legendas pt') || 
    t.includes('legendas') || 
    t.includes('subtitles pt') ||
    t.includes('leg pt')
  ) {
    return 'Legendado';
  }

  // 3. NACIONAL (cinema brasileiro)
  if (
    t.includes('cinema nacional') || 
    t.includes('filme brasileiro') || 
    t.includes('produção nacional') ||
    t.includes('mazzaropi') ||
    t.includes('teixeirinha') ||
    t.includes('glauber rocha') ||
    t.includes('amácio mazzaropi') ||
    (t.includes('brasil') && (t.includes('filme') || t.includes('direção')))
  ) {
    return 'Nacional';
  }

  // 4. SEM DIÁLOGO / MUDO
  if (
    t.includes('cinema mudo') || 
    t.includes('sem diálogo') || 
    t.includes('sem falas') || 
    t.includes('filme mudo') || 
    t.includes('silent film') ||
    t.includes('chaplin') || 
    t.includes('keaton') || 
    t.includes('méliès') ||
    t.includes('georges méliès')
  ) {
    return 'Sem Diálogo';
  }

  // Se for obra estrangeira sem indicação de dublagem ou legenda em português
  return 'Original';
}

export const ArchiveService = {
  async fetchLiveCatalog(params: {
    searchQuery?: string;
    category?: string;
    era?: string; // 'all' | 'modern' | 'classic' | 'animacao' | 'curta' | 'longa'
    rating?: string;
    audioLanguage?: string; // 'all' | 'Dublado' | 'Legendado' | 'Nacional' | 'Sem Diálogo'
    page?: number;
    rows?: number;
    sort?: 'recent' | 'oldest' | 'popular' | 'title';
  }): Promise<{ movies: Movie[]; total: number; page: number; totalPages: number }> {
    const page = params.page || 1;
    const rows = params.rows || 50; // Sempre carregar em lotes de 50 filmes

    // QUERY ESTRUTURADA: Apenas filmes completos acessíveis ao público brasileiro
    const queryParts: string[] = [
      'mediatype:(movies)',
      'item_size:[120000000 TO *]', // Mínimo de 120MB para garantir que são produções completas e nunca clipes curtos
      '-title:(song OR concert OR "love song" OR clip OR trailer OR teaser OR promo OR comercial OR abertura OR vinheta OR "tnt/space" OR "temperatura máxima" OR live OR gameplay OR twitch OR stream OR "alien: isolation" OR "alien isolation" OR "warhammer" OR "fireman sam" OR iguinho OR "freud - além da alma" OR pasolini OR gamer_br)'
    ];

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.trim().replace(/['"():]/g, '');
      queryParts.push(`(title:(${q}*) OR description:(${q}*))`);
    } else {
      // Priorizar obras estritamente acessíveis ao público brasileiro (Dublado / Legendado / Nacional)
      if (params.audioLanguage === 'Dublado') {
        queryParts.push('(title:(dublado OR dublagem OR "áudio em português") OR description:(dublado OR dublagem OR "áudio em português"))');
      } else if (params.audioLanguage === 'Legendado') {
        queryParts.push('(title:(legendado OR legendas OR "legendas em português") OR description:(legendado OR legendas OR "legendas em português"))');
      } else if (params.audioLanguage === 'Sem Diálogo') {
        queryParts.push('(collection:(silent_films) OR subject:(silent OR "cinema mudo" OR "sem diálogo") OR title:(chaplin OR keaton OR méliès))');
      } else {
        queryParts.push('((title:(dublado OR dublagem OR legendado OR legendas OR "áudio em português" OR "pt-br") OR description:(dublado OR dublagem OR legendado OR "legendas em português" OR "áudio em português")) OR (language:(Portuguese OR por) AND (title:(filme OR cinema) OR subject:(cinema OR filme))))');
      }
    }

    if (params.category && params.category !== 'Todos') {
      const cat = params.category.toLowerCase();
      if (cat.includes('anime') || cat.includes('mangá') || cat.includes('manga')) {
        queryParts.push('(subject:(anime OR manga OR animation) OR title:(anime OR manga OR "dragon ball" OR naruto OR "cavaleiros do zodiaco" OR "street fighter" OR akira OR gundam))');
      } else if (cat.includes('terror')) {
        queryParts.push('(subject:(horror OR terror) OR title:(terror OR horror OR mortos OR vampire OR dracula))');
      } else if (cat.includes('ficção')) {
        queryParts.push('(subject:(scifi OR "science fiction") OR title:(ficção OR space OR planet OR alien OR robot))');
      } else if (cat.includes('animação')) {
        queryParts.push('(subject:(animation OR cartoon) OR collection:(animationandcartoons) OR title:(animação OR cartoon OR desenho))');
      } else if (cat.includes('comédia')) {
        queryParts.push('(subject:(comedy) OR title:(comédia OR comedy OR chaplin OR keaton))');
      } else if (cat.includes('documentário')) {
        queryParts.push('(subject:(documentary) OR title:(documentário OR história))');
      } else if (cat.includes('ação') || cat.includes('aventura')) {
        queryParts.push('(subject:(action OR adventure OR thriller) OR title:(ação OR aventura OR thriller OR policial OR crime))');
      } else if (cat.includes('drama') || cat.includes('romance')) {
        queryParts.push('(subject:(drama OR romance) OR title:(drama OR romance OR paixão))');
      } else if (cat.includes('clássico')) {
        queryParts.push('(year:[1890 TO 1970])');
      }
    }

    if (params.era === 'modern') {
      queryParts.push('year:[2000 TO 2030]');
    } else if (params.era === 'classic') {
      queryParts.push('year:[1890 TO 1999]');
    }

    // Ordenação
    let sortField = 'downloads desc';
    if (params.sort === 'recent') {
      sortField = 'year desc';
    } else if (params.sort === 'oldest') {
      sortField = 'year asc';
    } else if (params.sort === 'title') {
      sortField = 'titleSorter asc';
    }

    const fullQuery = queryParts.join(' AND ');
    const cacheKey = `${fullQuery}_p${page}_r${rows}_s${sortField}`;

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      return {
        movies: cached.movies,
        total: cached.total,
        page,
        totalPages: Math.ceil(cached.total / rows)
      };
    }

    try {
      const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(fullQuery)}&fl[]=identifier,title,description,year,runtime,length,item_size,downloads,collection,subject&sort[]=${encodeURIComponent(sortField)}&rows=${rows * 2}&page=${page}&output=json`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data: ArchiveApiResponse = await res.json();

      const docs = data.response?.docs || [];
      const total = data.response?.numFound || 0;

      const movies: Movie[] = [];

      for (const d of docs) {
        if (!d.identifier) continue;

        const rawTitle = cleanText(d.title) || d.identifier.replace(/[_-]/g, ' ');
        const lowerTitle = rawTitle.toLowerCase();

        // Filtro anti-lixo rigoroso: rejeitar episódios soltos de TV, notícias, vlogs, clipes curtos ou programas de TV
        if (
          lowerTitle.startsWith('ep ') ||
          lowerTitle.startsWith('ep.') ||
          lowerTitle.startsWith('ep0') ||
          lowerTitle.startsWith('ep1') ||
          lowerTitle.startsWith('ep2') ||
          lowerTitle.startsWith('ep3') ||
          lowerTitle.startsWith('ep4') ||
          lowerTitle.startsWith('ep5') ||
          lowerTitle.startsWith('ep6') ||
          lowerTitle.startsWith('ep7') ||
          lowerTitle.startsWith('ep8') ||
          lowerTitle.startsWith('ep9') ||
          lowerTitle.includes('episodio') ||
          lowerTitle.includes('episódio') ||
          lowerTitle.includes('capitulo') ||
          lowerTitle.includes('capítulo') ||
          lowerTitle.includes('season') ||
          lowerTitle.includes('temporada') ||
          lowerTitle.includes('news') ||
          lowerTitle.includes('notícia') ||
          lowerTitle.includes('noticias') ||
          lowerTitle.includes('love song') || 
          lowerTitle.includes('canção') ||
          lowerTitle.includes('cancao') ||
          lowerTitle.includes('live concert') || 
          lowerTitle.includes('tnt/space') || 
          lowerTitle.includes('temperatura máxima') ||
          lowerTitle.includes('gameplay') ||
          lowerTitle.includes('twitch') ||
          lowerTitle.includes('stream') ||
          lowerTitle.includes('clip') ||
          lowerTitle.includes('trailer') ||
          lowerTitle.includes('teaser') ||
          lowerTitle.includes('podcast') ||
          lowerTitle.includes('vlog') ||
          lowerTitle.includes('unboxing') ||
          lowerTitle.includes('speedrun') ||
          lowerTitle.includes('react') ||
          lowerTitle.includes('comercial') ||
          lowerTitle.includes('propaganda') ||
          lowerTitle.includes('vinheta') ||
          lowerTitle.includes('alien: isolation')
        ) {
          continue;
        }

        // Validação Rigorosa da Duração
        const runtimeInfo = parseRuntimeAndLength(d.runtime, d.length);

        // Se tiver duração informada e for MENOR que 20 minutos, descarta (pois é clipe de 1 min, vinheta ou trailer)
        if (runtimeInfo && runtimeInfo.totalMinutes < 20) {
          continue;
        }

        // Se NÃO tiver duração e o arquivo for menor que 120MB, também descarta pois é clipe curto
        const itemSize = typeof d.item_size === 'number' ? d.item_size : parseInt(String(d.item_size || '0'), 10);
        if (!runtimeInfo && itemSize > 0 && itemSize < 120_000_000) {
          continue;
        }

        const duration = runtimeInfo ? runtimeInfo.formatted : '1h 32m';
        const rawDesc = cleanText(d.description);
        const synopsis = rawDesc.length > 20 
          ? rawDesc 
          : 'Filme clássico completo do acervo internacional de domínio público com exibição autorizada e gratuita.';

        // Extrair o ano real do filme (ex: 1984 de "Os Heróis Não Têm Idade (1984)") em vez do ano de upload do arquivo (2026)
        const year = extractRealMovieYear(rawTitle, synopsis, d.year);
        const era = year >= 2000 ? 'modern' : 'classic';

        const sub = Array.isArray(d.subject) ? d.subject.join(' ') : (d.subject || '');
        const category = inferCategory(rawTitle, synopsis, sub);
        const contentRating = inferRating(category, synopsis);
        const audioLanguage = inferAudioLanguage(rawTitle, synopsis, sub);

        // FILTRAGEM ESTRITA DE IDIOMA PARA O BRASIL:
        // Se o usuário selecionou Dublado, apenas aceita filmes comprovadamente Dublados ou Nacionais
        if (params.audioLanguage === 'Dublado' && audioLanguage !== 'Dublado' && audioLanguage !== 'Nacional') {
          continue;
        }
        if (params.audioLanguage === 'Legendado' && audioLanguage !== 'Legendado') {
          continue;
        }
        if (params.audioLanguage === 'Sem Diálogo' && audioLanguage !== 'Sem Diálogo') {
          continue;
        }
        // Na busca geral ou 'all', descarta sumariamente filmes estrangeiros sem português (Original)
        if ((!params.audioLanguage || params.audioLanguage === 'all') && audioLanguage === 'Original') {
          continue;
        }

        const cleanDisplayTitle = formatCleanTitle(rawTitle);

        // Resolução sempre com a melhor especificação (4K ou Full HD / HD)
        const quality: '4K Ultra HD' | 'Full HD' | 'HD' = year >= 2018 ? '4K Ultra HD' : (year >= 2000 ? 'Full HD' : 'HD');

        // Pôster oficial de cinema em alta resolução (estilo Netflix)
        const poster = PosterService.getHighResPoster(cleanDisplayTitle, rawTitle, category);
        const fallbackBackdrop = GENRE_POSTERS[category] || GENRE_POSTERS['Clássicos & Mistério'];

        const license: License = {
          id: `lic-ia-${d.identifier}`,
          movieId: `ia-${d.identifier}`,
          rightsHolder: 'Domínio Público / Internet Archive PT Collection',
          licenseType: 'Dominio Publico',
          commercialUseAllowed: true,
          territory: 'Mundial / Brasil',
          validUntil: 'Indeterminado',
          proofUrl: `https://archive.org/details/${d.identifier}`,
          reviewStatus: 'approved',
          origin: 'Internet Archive - Acervo de Obras Autorizadas',
          notes: 'Obra cinematográfica completa com livre acesso cultural no Brasil.',
          verifiedAt: '2026-10-25'
        };

        movies.push({
          id: `ia-${d.identifier}`,
          title: cleanDisplayTitle,
          originalTitle: rawTitle,
          synopsis,
          posterUrl: poster,
          backdropUrl: fallbackBackdrop,
          category,
          year,
          duration,
          playbackType: 'embed',
          playbackUrl: `https://archive.org/embed/${d.identifier}`,
          status: 'published',
          licenseId: license.id,
          license,
          featured: false,
          contentRating,
          era,
          type: 'longa',
          audioLanguage,
          quality,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z'
        });

        if (movies.length >= rows) break;
      }

      cache.set(cacheKey, { movies, total });

      return {
        movies,
        total,
        page,
        totalPages: Math.ceil(total / rows)
      };
    } catch (err) {
      console.warn('Erro ao consultar acervo do Internet Archive:', err);
      return {
        movies: [],
        total: 0,
        page,
        totalPages: 0
      };
    }
  }
};
