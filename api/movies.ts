import { neon } from '@neondatabase/serverless';

function getDatabaseConnection() {
  const connString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.STORAGE_DATABASE_URL ||
    process.env.STORAGE_URL;
  
  if (!connString) {
    return null;
  }
  return neon(connString);
}

export default async function handler(req: any, res: any) {
  // Configurar cabeçalhos CORS para permitir requisições seguras
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDatabaseConnection();
  if (!sql) {
    res.status(503).json({ 
      error: 'Variáveis de banco de dados não configuradas no ambiente Vercel/Neon',
      status: 'offline_fallback' 
    });
    return;
  }

  try {
    // ==========================================
    // 1. GET: Buscar todos os filmes cadastrados
    // ==========================================
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT 
          m.*,
          l.rights_holder,
          l.license_type,
          l.proof_url,
          l.valid_until,
          l.commercial_use_allowed,
          l.territory,
          l.review_status,
          l.origin,
          l.notes,
          l.verified_at
        FROM movies m
        LEFT JOIN licenses l ON m.license_id = l.id
        ORDER BY m.year DESC, m.created_at DESC
      `;

      // Mapear colunas do SQL para o formato Movie do TypeScript
      const movies = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        originalTitle: r.original_title,
        synopsis: r.synopsis,
        posterUrl: r.poster_url,
        backdropUrl: r.backdrop_url,
        category: r.category,
        year: r.year,
        duration: r.duration,
        playbackType: r.playback_type,
        playbackUrl: r.playback_url,
        status: r.status,
        featured: r.featured,
        contentRating: r.content_rating,
        era: r.era,
        type: r.type,
        audioLanguage: r.audio_language,
        quality: r.quality,
        licenseId: r.license_id,
        license: r.license_id ? {
          id: r.license_id,
          movieId: r.id,
          rightsHolder: r.rights_holder,
          licenseType: r.license_type,
          commercialUseAllowed: r.commercial_use_allowed,
          territory: r.territory,
          validUntil: r.valid_until,
          proofUrl: r.proof_url,
          reviewStatus: r.review_status,
          origin: r.origin,
          notes: r.notes,
          verifiedAt: r.verified_at
        } : undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));

      res.status(200).json({ movies, total: movies.length });
      return;
    }

    // ==========================================
    // 2. POST / PUT: Salvar ou editar um filme
    // ==========================================
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const movie = body.movie;
      const license = body.license;

      if (!movie || !movie.id || !movie.title || !movie.playbackUrl) {
        res.status(400).json({ error: 'Campos obrigatórios ausentes (id, title, playbackUrl)' });
        return;
      }

      // Se tiver licença associada, salvar primeiro a licença
      if (license && license.id) {
        await sql`
          INSERT INTO licenses (
            id, movie_id, rights_holder, license_type, commercial_use_allowed, 
            territory, valid_until, proof_url, review_status, origin, notes, verified_at
          ) VALUES (
            ${license.id}, ${movie.id}, ${license.rightsHolder || ''}, ${license.licenseType || 'Dominio Publico'},
            ${!!license.commercialUseAllowed}, ${license.territory || 'Mundial / Brasil'}, ${license.validUntil || 'Indeterminado'},
            ${license.proofUrl || ''}, ${license.reviewStatus || 'approved'}, ${license.origin || ''},
            ${license.notes || ''}, ${license.verifiedAt || ''}
          )
          ON CONFLICT (id) DO UPDATE SET
            rights_holder = EXCLUDED.rights_holder,
            license_type = EXCLUDED.license_type,
            commercial_use_allowed = EXCLUDED.commercial_use_allowed,
            territory = EXCLUDED.territory,
            valid_until = EXCLUDED.valid_until,
            proof_url = EXCLUDED.proof_url,
            review_status = EXCLUDED.review_status,
            origin = EXCLUDED.origin,
            notes = EXCLUDED.notes,
            verified_at = EXCLUDED.verified_at
        `;
      }

      // Salvar ou atualizar o filme
      await sql`
        INSERT INTO movies (
          id, title, original_title, synopsis, poster_url, backdrop_url, category, 
          year, duration, playback_type, playback_url, status, license_id, featured, 
          content_rating, era, type, audio_language, quality, updated_at
        ) VALUES (
          ${movie.id}, ${movie.title}, ${movie.originalTitle || ''}, ${movie.synopsis || ''},
          ${movie.posterUrl || ''}, ${movie.backdropUrl || ''}, ${movie.category || 'Outros'},
          ${Number(movie.year) || 2024}, ${movie.duration || '1h 30m'}, ${movie.playbackType || 'embed'},
          ${movie.playbackUrl}, ${movie.status || 'published'}, ${license?.id || movie.licenseId || null},
          ${!!movie.featured}, ${movie.contentRating || 'L'}, ${movie.era || 'modern'},
          ${movie.type || 'longa'}, ${movie.audioLanguage || 'Dublado'}, ${movie.quality || 'Full HD'},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          original_title = EXCLUDED.original_title,
          synopsis = EXCLUDED.synopsis,
          poster_url = EXCLUDED.poster_url,
          backdrop_url = EXCLUDED.backdrop_url,
          category = EXCLUDED.category,
          year = EXCLUDED.year,
          duration = EXCLUDED.duration,
          playback_type = EXCLUDED.playback_type,
          playback_url = EXCLUDED.playback_url,
          status = EXCLUDED.status,
          license_id = EXCLUDED.license_id,
          featured = EXCLUDED.featured,
          content_rating = EXCLUDED.content_rating,
          era = EXCLUDED.era,
          type = EXCLUDED.type,
          audio_language = EXCLUDED.audio_language,
          quality = EXCLUDED.quality,
          updated_at = CURRENT_TIMESTAMP
      `;

      res.status(200).json({ success: true, movie });
      return;
    }

    // ==========================================
    // 3. DELETE: Excluir um filme por ID
    // ==========================================
    if (req.method === 'DELETE') {
      const id = req.query.id || (typeof req.body === 'string' ? JSON.parse(req.body).id : req.body?.id);
      if (!id) {
        res.status(400).json({ error: 'ID do filme não fornecido' });
        return;
      }

      await sql`DELETE FROM movies WHERE id = ${String(id)}`;
      res.status(200).json({ success: true, message: `Filme ${id} excluído com sucesso` });
      return;
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (error: any) {
    console.error('Erro na API Serverless do Neon Postgres:', error);
    res.status(500).json({ error: error.message || 'Erro interno no banco de dados' });
  }
}
