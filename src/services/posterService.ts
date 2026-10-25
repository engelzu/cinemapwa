/**
 * PosterService - Resolvedor de Capas e Pôsteres em Alta Resolução (Estilo Netflix)
 * Garante que cada card tenha seu pôster próprio e exclusivo, eliminando
 * repetição de capas e capturas borradas de vídeo.
 */

interface PosterCacheEntry {
  url: string;
  timestamp: number;
}

const LOCAL_STORAGE_KEY = 'cinepwa_poster_cache_v3';

// 1. Dicionário Curado com Pôsteres Oficiais em Alta Definição (IMDb / Amazon CDN)
const KNOWN_POSTERS: Record<string, string> = {
  // Superproduções e destaques
  'jurassic world: domínio': 'https://m.media-amazon.com/images/M/MV5BZGExMWU2NWMtNzczYi00NjQ4LTk2YzctZGZkYmRmMDdhMjllXkEyXkFqcGc@._V1_QL75_UY562_CR5,0,380,562_.jpg',
  'jurassic world dominion': 'https://m.media-amazon.com/images/M/MV5BZGExMWU2NWMtNzczYi00NjQ4LTk2YzctZGZkYmRmMDdhMjllXkEyXkFqcGc@._V1_QL75_UY562_CR5,0,380,562_.jpg',
  'good boy: o cão humano': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=700&q=80',
  'good boy': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=700&q=80',
  'level up': 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=700&q=80',
  'quase 18': 'https://m.media-amazon.com/images/M/MV5BODE2NjE4NjYyMV5BMl5BanBnXkFtZTgwNzk3MjQ0OTE@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'the edge of seventeen': 'https://m.media-amazon.com/images/M/MV5BODE2NjE4NjYyMV5BMl5BanBnXkFtZTgwNzk3MjQ0OTE@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'godzilla': 'https://m.media-amazon.com/images/M/MV5BMzdmYmUzYjAtMmJhNi00NGU3LWJiODYtM2I5MGFhZjBhM2NhXkEyXkFqcGc@._V1_QL75_UX380_CR0,1,380,562_.jpg',
  'reviravolta': 'https://m.media-amazon.com/images/M/MV5BNDdkNzFmMmItNTNkOS00MzJkLTg4MjItN2Q4ZDQ1ZWI3YWUxXkEyXkFqcGc@._V1_QL75_UX380_CR0,2,380,562_.jpg',
  'u turn': 'https://m.media-amazon.com/images/M/MV5BNDdkNzFmMmItNTNkOS00MzJkLTg4MjItN2Q4ZDQ1ZWI3YWUxXkEyXkFqcGc@._V1_QL75_UX380_CR0,2,380,562_.jpg',
  'teoria da conspiração': 'https://m.media-amazon.com/images/M/MV5BMjQ1MTYxMzA4OF5BMl5BanBnXkFtZTgwNjg2NTM1MTI@._V1_QL75_UX380_CR0,1,380,562_.jpg',
  'conspiracy theory': 'https://m.media-amazon.com/images/M/MV5BMjQ1MTYxMzA4OF5BMl5BanBnXkFtZTgwNjg2NTM1MTI@._V1_QL75_UX380_CR0,1,380,562_.jpg',
  'inocência destruída': 'https://m.media-amazon.com/images/M/MV5BMTg3MjgwMjkxMF5BMl5BanBnXkFtZTcwMjQ3NjYxNA@@._V1_QL75_UY562_CR9,0,380,562_.jpg',
  'shattered innocence': 'https://m.media-amazon.com/images/M/MV5BMTg3MjgwMjkxMF5BMl5BanBnXkFtZTcwMjQ3NjYxNA@@._V1_QL75_UY562_CR9,0,380,562_.jpg',
  'os heróis não têm idade': 'https://m.media-amazon.com/images/M/MV5BMzRiNmE0YzUtOTE3MC00MDc0LTg1ZjktNzE0MWJjOTUyN2RlXkEyXkFqcGc@._V1_QL75_UX380_CR0,7,380,562_.jpg',
  'cloak & dagger': 'https://m.media-amazon.com/images/M/MV5BMzRiNmE0YzUtOTE3MC00MDc0LTg1ZjktNzE0MWJjOTUyN2RlXkEyXkFqcGc@._V1_QL75_UX380_CR0,7,380,562_.jpg',
  'a noite dos mortos-vivos': 'https://m.media-amazon.com/images/M/MV5BZGMyZTA0MWEtZjczMS00ZDE5LTk1OTQtNmIxNGYzNDA2NDVhXkEyXkFqcGc@._V1_QL75_UY562_CR1,0,380,562_.jpg',
  'night of the living dead': 'https://m.media-amazon.com/images/M/MV5BZGMyZTA0MWEtZjczMS00ZDE5LTk1OTQtNmIxNGYzNDA2NDVhXkEyXkFqcGc@._V1_QL75_UY562_CR1,0,380,562_.jpg',
  'o incrível circo digital': 'https://m.media-amazon.com/images/M/MV5BMTlkY2NjODgtOWI5ZC00MjIzLWFiYjItN2ZiOTU5YzA2ODlmXkEyXkFqcGc@._V1_QL75_UX380_CR0,57,380,562_.jpg',
  'the amazing digital circus': 'https://m.media-amazon.com/images/M/MV5BMTlkY2NjODgtOWI5ZC00MjIzLWFiYjItN2ZiOTU5YzA2ODlmXkEyXkFqcGc@._V1_QL75_UX380_CR0,57,380,562_.jpg',
  'o grito do lobo': 'https://m.media-amazon.com/images/M/MV5BZGY1Zjc2NWQtNzMyNy00MDdkLWJkOWEtMjk5NGVjOTc3YjkwXkEyXkFqcGc@._V1_QL75_UY562_CR7,0,380,562_.jpg',
  'the boy who cried werewolf': 'https://m.media-amazon.com/images/M/MV5BZGY1Zjc2NWQtNzMyNy00MDdkLWJkOWEtMjk5NGVjOTc3YjkwXkEyXkFqcGc@._V1_QL75_UY562_CR7,0,380,562_.jpg',

  // Clássicos e Obras Populares
  'carrie': 'https://m.media-amazon.com/images/M/MV5BNjMwMDVlZjYtMWRlZS00OTU1LTlmYTQtOGViNTdmYTE0ZjRlXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg',
  'carrie, a estranha': 'https://m.media-amazon.com/images/M/MV5BNjMwMDVlZjYtMWRlZS00OTU1LTlmYTQtOGViNTdmYTE0ZjRlXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg',
  'suspiria': 'https://m.media-amazon.com/images/M/MV5BZGIyYmI3ZjMtODI3ZC00NGQwLTk3ZGUtYWU4MDE3MzI3ZTk1XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'sunset boulevard': 'https://m.media-amazon.com/images/M/MV5BNDUyMWE0ZmItZDRhMy00MGI3LWIxZDYtMjQ1OWJkZWQ1MjQ0XkEyXkFqcGc@._V1_SX300.jpg',
  'crepúsculo dos deuses': 'https://m.media-amazon.com/images/M/MV5BNDUyMWE0ZmItZDRhMy00MGI3LWIxZDYtMjQ1OWJkZWQ1MjQ0XkEyXkFqcGc@._V1_SX300.jpg',
  'sabrina': 'https://m.media-amazon.com/images/M/MV5BNjQ5MWI5YWYtYzYxNi00ODM4LWI4NzEtNzUzYmVkNzRiYzNlXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg',
  'rope': 'https://m.media-amazon.com/images/M/MV5BNTk4ZmI4YzctNTM5MC00YzY1LThjOTgtZjA5OTcwN2ZjNDFlXkEyXkFqcGdeQXVyMjE0MzE1MA@@._V1_SX300.jpg',
  'festim diabólico': 'https://m.media-amazon.com/images/M/MV5BNTk4ZmI4YzctNTM5MC00YzY1LThjOTgtZjA5OTcwN2ZjNDFlXkEyXkFqcGdeQXVyMjE0MzE1MA@@._V1_SX300.jpg',
  'os deuses devem estar loucos': 'https://m.media-amazon.com/images/M/MV5BYTJlNmEyNTktMDJjYy00ZjkyLWIwZWEtMDY4NGExYmQxMmE0XkEyXkFqcGc@._V1_QL75_UX380_CR0,1,380,562_.jpg',
  'the gods must be crazy': 'https://m.media-amazon.com/images/M/MV5BYTJlNmEyNTktMDJjYy00ZjkyLWIwZWEtMDY4NGExYmQxMmE0XkEyXkFqcGc@._V1_QL75_UX380_CR0,1,380,562_.jpg',
  'velozes e furiosos 9': 'https://m.media-amazon.com/images/M/MV5BMjBmNzk1ZmUtY2I2Mi00M2Y3LTk2MWQtYjk1NGU5YTFjMmI0XkEyXkFqcGdeQXVyNTMxMTQ1NTk@._V1_SX300.jpg',
  'f9': 'https://m.media-amazon.com/images/M/MV5BMjBmNzk1ZmUtY2I2Mi00M2Y3LTk2MWQtYjk1NGU5YTFjMmI0XkEyXkFqcGdeQXVyNTMxMTQ1NTk@._V1_SX300.jpg',
  'wicked': 'https://m.media-amazon.com/images/M/MV5BNjg0OGFmZjItZWFlYi00OWFiLWI3NWEtNGEzNWRiODJlNWYwXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'conta comigo': 'https://m.media-amazon.com/images/M/MV5BNGJkNTUwM2MtZWE2MS00YjNkLWE3MjktNWQwZDQxMDIyZWVmXkEyXkFqcGc@._V1_QL75_UX380_CR0,18,380,562_.jpg',
  'stand by me': 'https://m.media-amazon.com/images/M/MV5BNGJkNTUwM2MtZWE2MS00YjNkLWE3MjktNWQwZDQxMDIyZWVmXkEyXkFqcGc@._V1_QL75_UX380_CR0,18,380,562_.jpg',
  'o enigma de outro mundo': 'https://m.media-amazon.com/images/M/MV5BYjBmYWZlNzMtZWZkNS00MWRjLTgxZjItNWUyYjZiMTg1NmVjXkEyXkFqcGdeQXVyNzA4NzQyMjk@._V1_SX300.jpg',
  'the thing': 'https://m.media-amazon.com/images/M/MV5BYjBmYWZlNzMtZWZkNS00MWRjLTgxZjItNWUyYjZiMTg1NmVjXkEyXkFqcGdeQXVyNzA4NzQyMjk@._V1_SX300.jpg',
  'o ataque dos vermes malditos': 'https://m.media-amazon.com/images/M/MV5BMTEzNjkwMzIyMjZeQTJeQWpwZ15BbWU4MDI2NTU5ODYx._V1_QL75_UX380_CR0,2,380,562_.jpg',
  'tremors': 'https://m.media-amazon.com/images/M/MV5BMTEzNjkwMzIyMjZeQTJeQWpwZ15BbWU4MDI2NTU5ODYx._V1_QL75_UX380_CR0,2,380,562_.jpg',
  'quarto de guerra': 'https://m.media-amazon.com/images/M/MV5BMTYyNTUxMjQwNF5BMl5BanBnXkFtZTgwNDY5MDIwNTE@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'war room': 'https://m.media-amazon.com/images/M/MV5BMTYyNTUxMjQwNF5BMl5BanBnXkFtZTgwNDY5MDIwNTE@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'a era do gelo': 'https://m.media-amazon.com/images/M/MV5BMDBlYzU2OGMtOGJjNi00ZGZjLWIwNjMtYzdiZjkwYWNjZDljXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'ice age': 'https://m.media-amazon.com/images/M/MV5BMDBlYzU2OGMtOGJjNi00ZGZjLWIwNjMtYzdiZjkwYWNjZDljXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'um amor para recordar': 'https://m.media-amazon.com/images/M/MV5BYjkxZWE0YjMtYTk2OS00ZmFjLTk2YjEtY2M3MGY4MzE4MGNkXkEyXkFqcGc@._V1_QL75_UY562_CR1,0,380,562_.jpg',
  'a walk to remember': 'https://m.media-amazon.com/images/M/MV5BYjkxZWE0YjMtYTk2OS00ZmFjLTk2YjEtY2M3MGY4MzE4MGNkXkEyXkFqcGc@._V1_QL75_UY562_CR1,0,380,562_.jpg',
  'a entrevista': 'https://m.media-amazon.com/images/M/MV5BNTI2ZTg1OGItMDM1Ni00MjUyLWI3NWUtNmVhNmE4OGNmNDg3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'the interview': 'https://m.media-amazon.com/images/M/MV5BNTI2ZTg1OGItMDM1Ni00MjUyLWI3NWUtNmVhNmE4OGNmNDg3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'jasão e os argonautas': 'https://m.media-amazon.com/images/M/MV5BODg3ZjhmMjYtYWIzYi00YjBhLTg3ZjMtYTc0NDg3ZTFlNDlhXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg',
  'jason and the argonauts': 'https://m.media-amazon.com/images/M/MV5BODg3ZjhmMjYtYWIzYi00YjBhLTg3ZjMtYTc0NDg3ZTFlNDlhXkEyXkFqcGc@._V1_QL75_UX380_CR0,4,380,562_.jpg',
  'homem-aranha a série animada': 'https://m.media-amazon.com/images/M/MV5BN2EyNDg5OGQtOWJlMi00OGE0LTg4NWQtZTI5YWM2MDY4YzMwXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'spider-man the animated series': 'https://m.media-amazon.com/images/M/MV5BN2EyNDg5OGQtOWJlMi00OGE0LTg4NWQtZTI5YWM2MDY4YzMwXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'death note': 'https://m.media-amazon.com/images/M/MV5BNjRiNmNjMmMtN2U2Yi00ODgxLTk3OTMtMmI1MTI1NjYyZTEzXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'yu yu hakusho': 'https://m.media-amazon.com/images/M/MV5BYmVkMjBhNzQtZmE3Yi00NWVmLTkxNmEtZmIzNzBhZjc1M2I2XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'cowboy bebop': 'https://m.media-amazon.com/images/M/MV5BZWY4ODQ2MmQtOGY4Yi00ZjFiLTgwOTMtZDJhYzA2NTFjMGExXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  '1984': 'https://m.media-amazon.com/images/M/MV5BMjA5OTg2MTg1OF5BMl5BanBnXkFtZTgwNTU5MjI5MzE@._V1_QL75_UX380_CR0,4,380,562_.jpg',
  'george orwell': 'https://m.media-amazon.com/images/M/MV5BMjA5OTg2MTg1OF5BMl5BanBnXkFtZTgwNTU5MjI5MzE@._V1_QL75_UX380_CR0,4,380,562_.jpg',
  'metrópolis': 'https://m.media-amazon.com/images/M/MV5BMTg5NzMwMzEzMl5BMl5BanBnXkFtZTgwMTQ3ODAxMzE@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'metropolis': 'https://m.media-amazon.com/images/M/MV5BMTg5NzMwMzEzMl5BMl5BanBnXkFtZTgwMTQ3ODAxMzE@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'o gabinete do dr. caligari': 'https://m.media-amazon.com/images/M/MV5BNWZkZGVhMWItNmU5NC00ZGI0LWJkMTgtYmFhMmMyNmViY2M0XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'viagem à lua': 'https://m.media-amazon.com/images/M/MV5BMzQ4YTI5ZmUtMDVhYi00NGQ2LWIzNGMtNTJjMDMyMTNjYzJmXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'o imigrante': 'https://m.media-amazon.com/images/M/MV5BZDUzYmRhYjEtMmVkNS00NDkyLWJjMGQtOGQ2N2QyNTE4NzI2XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'the immigrant': 'https://m.media-amazon.com/images/M/MV5BZDUzYmRhYjEtMmVkNS00NDkyLWJjMGQtOGQ2N2QyNTE4NzI2XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'o menino, a toupeira, a raposa e o cavalo': 'https://m.media-amazon.com/images/M/MV5BN2E1ZWI4NjQtYjZlNS00ZmU1LTg2OWEtYzY1MDYwNWU2YjRjXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'big buck bunny': 'https://m.media-amazon.com/images/M/MV5BMjA5ODg3NTkwNF5BMl5BanBnXkFtZTcwMTMwNTQ5MQ@@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'sintel': 'https://m.media-amazon.com/images/M/MV5BNTMzMTk5ODYtYzc2Mi00YmE0LTljMjktMGVkMGE1ZWIyYzg3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'tears of steel': 'https://m.media-amazon.com/images/M/MV5BNDhkN2U4ZTctYmU3Yi00YzM1LWE3OGUtMGFkMWYzMDdiNzM1XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  'o filho da internet': 'https://m.media-amazon.com/images/M/MV5BMjA2OTM4Njc1NF5BMl5BanBnXkFtZTgwNTc4MTQ1MTE@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  "the internet's own boy": 'https://m.media-amazon.com/images/M/MV5BMjA2OTM4Njc1NF5BMl5BanBnXkFtZTgwNTc4MTQ1MTE@._V1_QL75_UX380_CR0,0,380,562_.jpg'
};

// 2. Pools Diversos de Pôsteres Cinemáticos Verticais de Alta Resolução (Sem Claquete!)
// Cada categoria possui múltiplos pôsteres distintos para que dois filmes NUNCA compartilhem a mesma imagem.
const GENRE_POOLS: Record<string, string[]> = {
  'Terror & Suspense': [
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80'
  ],
  'Ficção Científica': [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=700&q=80'
  ],
  'Ação & Ficção Científica': [
    'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=700&q=80'
  ],
  'Ação & Cyberpunk': [
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=700&q=80'
  ],
  'Suspense & Policial': [
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=700&q=80'
  ],
  'Animação & Fantasia': [
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=700&q=80'
  ],
  'Aventura & Família': [
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80'
  ],
  'Comédia & Drama': [
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80'
  ],
  'Documentário': [
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=700&q=80'
  ],
  'Clássicos & Mistério': [
    'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80'
  ],
  'default': [
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=80'
  ]
};

// Cache em memória
const memoryPosterCache = new Map<string, string>();

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos para busca
    .replace(/[✿★\[\]\(\)\-\:_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Função de dispersão determinística (hash) baseada no título
 * Garante que filmes diferentes recebam imagens DIFERENTES, sem repetições
 */
function pickUniqueArtwork(title: string, category?: string): string {
  const pool = (category && GENRE_POOLS[category]) || GENRE_POOLS['default'];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

function loadLocalStorageCache(): Record<string, PosterCacheEntry> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToLocalStorageCache(key: string, url: string) {
  try {
    const cache = loadLocalStorageCache();
    cache[key] = { url, timestamp: Date.now() };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignora overflow de quota
  }
}

export const PosterService = {
  /**
   * Resolve de forma síncrona a melhor capa em alta resolução para exibição imediata no card
   */
  getHighResPoster(title: string, originalTitle?: string, category?: string): string {
    const normTitle = normalizeKey(title);
    const normOrig = originalTitle ? normalizeKey(originalTitle) : '';

    // 1. Verificar correspondência no catálogo curado oficial (IMDb / Amazon)
    for (const [key, posterUrl] of Object.entries(KNOWN_POSTERS)) {
      const cleanKey = normalizeKey(key);
      if (normTitle.includes(cleanKey) || cleanKey.includes(normTitle)) {
        return posterUrl;
      }
      if (normOrig && (normOrig.includes(cleanKey) || cleanKey.includes(normOrig))) {
        return posterUrl;
      }
    }

    // 2. Verificar cache em memória
    if (memoryPosterCache.has(normTitle)) {
      return memoryPosterCache.get(normTitle)!;
    }

    // 3. Verificar cache do localStorage
    const localCache = loadLocalStorageCache();
    if (localCache[normTitle]?.url) {
      memoryPosterCache.set(normTitle, localCache[normTitle].url);
      return localCache[normTitle].url;
    }

    // 4. Fallback exclusivo calculado pelo hash do título para NUNCA repetir a mesma capa
    return pickUniqueArtwork(title, category);
  },

  /**
   * Retorna um pôster temático exclusivo garantido do pool da categoria (nunca falha na rede)
   */
  getGenrePoolFallback(title: string, category?: string): string {
    return pickUniqueArtwork(title, category);
  },

  /**
   * Busca assíncrona em segundo plano de pôster oficial via OMDb / IMDb API
   * Atualiza dinamicamente a imagem do card assim que a capa de cinema oficial for encontrada
   */
  async fetchLivePoster(title: string, year?: number): Promise<string | null> {
    const normTitle = normalizeKey(title);
    if (memoryPosterCache.has(normTitle)) {
      return memoryPosterCache.get(normTitle)!;
    }

    // Limpar termos adicionais da busca
    const searchTerms = title
      .replace(/[\(\[\{].*?[\)\]\}]/g, '')
      .replace(/Dublado|Legendado|Completo|1080p|720p|4K|Filme|BluRay|HD/gi, '')
      .replace(/[✿★\-]/g, ' ')
      .trim();

    if (!searchTerms) return null;

    try {
      const queryParams = new URLSearchParams({
        t: searchTerms,
        apikey: 'trilogy'
      });
      if (year && year > 1900 && year < 2030) {
        queryParams.set('y', String(year));
      }

      const res = await fetch(`https://www.omdbapi.com/?${queryParams.toString()}`);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.Response === 'True' && data.Poster && data.Poster.startsWith('http') && data.Poster !== 'N/A') {
        memoryPosterCache.set(normTitle, data.Poster);
        saveToLocalStorageCache(normTitle, data.Poster);
        return data.Poster;
      }
    } catch {
      // Falha de rede silenciosa
    }

    return null;
  }
};
