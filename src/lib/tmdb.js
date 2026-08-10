const KEY = import.meta.env.VITE_TMDB_KEY;

const BASES = ['https://api.themoviedb.org/3'];
let currentBase = 0;

async function tmdb(path, params = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const buildUrl = (base) => {
    const url = new URL(base + path);
    if (!isProduction) url.searchParams.set('api_key', KEY);
    url.searchParams.set('language', 'zh-CN');
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
    return url.toString();
  };

  try {
    const res = await fetch(buildUrl(BASES[currentBase]), {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('TMDB error: ' + res.status);
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (currentBase === 0 && isProduction) {
      currentBase = 1;
      return tmdb(path, params);
    }
    currentBase = 0;
    if (err.name === 'AbortError') {
      throw new Error('网络超时，请检查网络或稍后重试');
    }
    throw new Error('网络错误：' + (err.message || '无法连接 TMDB'));
  }
}

export function posterUrl(path, size = 'w342') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function backdropUrl(path, size = 'w780') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function searchMovies(query, page = 1) {
  if (!query || query.length < 2) return { results: [], total_pages: 0 };
  return tmdb('/search/movie', { query, page });
}

export async function getMovie(id) {
  return tmdb(`/movie/${id}`, { append_to_response: 'credits' });
}

export async function getMovieCredits(id) {
  return tmdb(`/movie/${id}/credits`);
}

export function formatMovie(raw) {
  const director = raw.credits?.crew?.find(c => c.job === 'Director')?.name || '';
  const cast = (raw.credits?.cast?.slice(0, 5) || []).map(c => c.name);

  return {
    id: raw.id,
    title: raw.title,
    titleCn: raw.title,
    originalTitle: raw.original_title,
    year: raw.release_date ? raw.release_date.slice(0, 4) : '—',
    date: raw.release_date || '',
    poster: raw.poster_path,
    backdrop: raw.backdrop_path,
    overview: raw.overview || '暂无简介',
    rating: raw.vote_average ? raw.vote_average.toFixed(1) : null,
    runtime: raw.runtime || 0,
    genres: (raw.genres || []).map(g => g.name),
    director,
    cast,
  };
}
