export type PlaybackType = 'mp4' | 'embed' | 'hls';
export type MovieStatus = 'draft' | 'published' | 'disabled';
export type LicenseReviewStatus = 'approved' | 'pending' | 'rejected';
export type LicenseType = 
  | 'Dominio Publico' 
  | 'Creative Commons (CC BY / CC0)' 
  | 'Autorizacao Direta do Produtor' 
  | 'Licenca Nao-Comercial' 
  | 'Outra Autorizada';

export interface License {
  id: string;
  movieId: string;
  rightsHolder: string; // Titular dos direitos autorais ou certificador
  licenseType: LicenseType;
  commercialUseAllowed: boolean;
  territory: string; // Ex: 'Brasil', 'Mundial'
  validUntil: string; // Data YYYY-MM-DD ou 'Indeterminado'
  proofUrl: string; // Link para documento/acervo/contrato
  reviewStatus: LicenseReviewStatus;
  origin: string; // Ex: 'Internet Archive', 'Acervo Nacional', 'Produtor Independente'
  notes?: string;
  verifiedAt?: string;
}

export type ContentRating = 'L' | '10' | '12' | '14' | '16' | '18';
export type MovieEra = 'modern' | 'classic';
export type MovieWorkType = 'longa' | 'curta' | 'animacao' | 'documentario' | 'anime';
export type AudioLanguage = 'Dublado' | 'Legendado' | 'Nacional' | 'Sem Diálogo' | 'Original';

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl?: string;
  category: string;
  year: number;
  duration: string; // Ex: '1h 36m'
  playbackType: PlaybackType;
  playbackUrl: string;
  status: MovieStatus;
  licenseId: string;
  license?: License;
  featured?: boolean;
  contentRating?: ContentRating | string; // 'L', '10', '12', '14', '16'
  era?: MovieEra; // 'modern' (anos 2000+) ou 'classic' (histórico)
  type?: MovieWorkType; // 'longa' | 'curta' | 'animacao' | 'documentario'
  audioLanguage?: AudioLanguage; // 'Dublado' | 'Legendado' | 'Nacional' | 'Sem Diálogo'
  quality?: 'HD' | 'Full HD' | '4K Ultra HD';
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin';
  active: boolean;
}
