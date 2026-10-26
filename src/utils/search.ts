/**
 * Utilitários avançados de busca resiliente e instantânea para o CinePWA
 * Suporta normalização de acentos, pontuação, múltiplos tokens e busca compacta (ex: "g-force" -> "gforce").
 */

export function normalizeSearch(str?: string | number | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove todos os acentos (ã, é, ó, ç, etc.)
    .replace(/[^a-z0-9\s]/g, ' ')   // converte hífens, pontuações e símbolos em espaços
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cria a string combinada indexável para um filme ou item do acervo
 */
export function buildMovieSearchIndex(m: {
  title: string;
  originalTitle?: string;
  synopsis?: string;
  category?: string;
  year?: number | string;
  type?: string;
  audioLanguage?: string;
  quality?: string;
}): string {
  return [
    m.title || '',
    m.originalTitle || '',
    m.synopsis || '',
    m.category || '',
    m.year || '',
    m.type || '',
    m.audioLanguage || '',
    m.quality || ''
  ].join(' ');
}

/**
 * Verifica se um texto pesquisável atende à consulta digitada.
 * - Suporta 1, 2, 3, 4 ou mais letras.
 * - Suporta busca por partes de palavras (ex: "jura", "figh", "mort", "sher").
 * - Suporta múltiplos termos em qualquer ordem (ex: "street figh", "sherlock 1954").
 * - Suporta junção sem espaço/hífen (ex: "gforce" bate com "G-Force", "scifi" bate com "Sci-Fi").
 */
export function matchesSearchQuery(searchableRaw: string, queryRaw: string): boolean {
  const normQuery = normalizeSearch(queryRaw);
  if (!normQuery) return true;

  const normSearchable = normalizeSearch(searchableRaw);
  const compactSearchable = normSearchable.replace(/\s+/g, '');

  const tokens = normQuery.split(' ').filter(Boolean);

  // Cada token digitado pelo usuário deve bater com o texto normalizado ou compacto
  return tokens.every(token => {
    const compactToken = token.replace(/\s+/g, '');
    return normSearchable.includes(token) || compactSearchable.includes(compactToken);
  });
}
