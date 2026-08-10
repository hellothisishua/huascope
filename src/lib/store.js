import { createClient } from '@supabase/supabase-js';

const URL = 'https://oulchvefqobqoikpnowc.supabase.co';
const KEY = 'sb_publishable_vKytZ6B9BYKnWDe2X3vZtw_LUqDxMFK';

export const supabase = createClient(URL, KEY);

// 把 DB 行转成前端用的 entry 格式
function rowToEntry(row) {
  return {
    id: row.id,
    status: row.status,
    rating: row.rating,
    review: row.review || '',
    addedAt: row.added_at,
    movie: typeof row.movie_data === 'string' ? JSON.parse(row.movie_data) : row.movie_data,
  };
}

// 把前端 entry 转成 DB 行
function entryToRow(entry) {
  return {
    id: entry.id,
    status: entry.status,
    rating: entry.rating,
    review: entry.review || '',
    added_at: entry.addedAt || new Date().toISOString(),
    movie_data: entry.movie,
  };
}

export async function loadMovies() {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) { console.error('load error:', error); return []; }
  return (data || []).map(rowToEntry);
}

export async function addMovieDb(movieData, status = 'want') {
  const row = {
    id: movieData.id,
    status,
    rating: 0,
    review: '',
    added_at: new Date().toISOString(),
    movie_data: movieData,
  };
  const { data, error } = await supabase.from('movies').insert(row).select();
  if (error) {
    if (error.code === '23505') {
      // duplicate — update instead
      const { data: upd, error: upErr } = await supabase
        .from('movies')
        .update({ movie_data: movieData })
        .eq('id', movieData.id)
        .select();
      if (upErr) throw upErr;
      return rowToEntry(upd[0]);
    }
    throw error;
  }
  return rowToEntry(data[0]);
}

export async function updateMovieDb(id, updates) {
  const row = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.rating !== undefined) row.rating = updates.rating;
  if (updates.review !== undefined) row.review = updates.review;
  if (updates.movie) row.movie_data = updates.movie;

  const { data, error } = await supabase
    .from('movies')
    .update(row)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data ? rowToEntry(data[0]) : null;
}

export async function removeMovieDb(id) {
  const { error } = await supabase.from('movies').delete().eq('id', id);
  if (error) throw error;
}

// Share encoding (still local, just encodes IDs + status + rating)
export function encodeShare(movies) {
  const ids = movies.map(m => `${m.id}:${m.status}:${m.rating}`).join(',');
  return btoa(encodeURIComponent(ids));
}

export function decodeShare(encoded) {
  try {
    const ids = decodeURIComponent(atob(encoded));
    return ids.split(',').map(s => {
      const [id, status, rating] = s.split(':');
      return { id: Number(id), status, rating: Number(rating) };
    });
  } catch { return []; }
}
