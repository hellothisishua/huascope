import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, createContext, useContext } from 'react';

const URL = 'https://oulchvefqobqoikpnowc.supabase.co';
const KEY = 'sb_publishable_vKytZ6B9BYKnWDe2X3vZtw_LUqDxMFK';

export const supabase = createClient(URL, KEY);

// Auth Context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => { if (subscription) subscription.unsubscribe(); };
    } catch {}
  }, []);

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (e) {
      throw new Error(e.message || '注册失败');
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (e) {
      throw new Error(e.message || '登录失败');
    }
  };

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  try { 
    const ctx = useContext(AuthContext);
    return ctx || { user: null, loading: false, signUp: async () => {}, signIn: async () => {}, signOut: async () => {} };
  } catch { 
    return { user: null, loading: false, signUp: async () => {}, signIn: async () => {}, signOut: async () => {} };
  }
}

// Safe JSON parse
function safeJsonParse(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

// 把 DB 行转成前端用的 entry 格式 - 极其安全的版本
function rowToEntry(row) {
  try {
    if (!row) return null;
    
    const movieData = safeJsonParse(row.movie_data);
    const movie = movieData || {};
    
    return {
      id: row.id || 0,
      status: row.status || 'want',
      rating: Number(row.rating) || 0,
      review: row.review || '',
      addedAt: row.added_at || new Date().toISOString(),
      watchedDate: row.watched_date || '',
      location: row.location || '',
      movie: {
        id: movie.id || row.id || 0,
        title: movie.title || movie.titleCn || '未知电影',
        titleCn: movie.titleCn || movie.title || '未知电影',
        originalTitle: movie.originalTitle || '',
        year: movie.year || '—',
        date: movie.date || '',
        poster: movie.poster || null,
        backdrop: movie.backdrop || null,
        overview: movie.overview || '暂无简介',
        rating: movie.rating || null,
        runtime: Number(movie.runtime) || 0,
        genres: Array.isArray(movie.genres) ? movie.genres : [],
        director: movie.director || '',
        cast: Array.isArray(movie.cast) ? movie.cast : [],
      },
    };
  } catch {
    return {
      id: row?.id || 0,
      status: 'want',
      rating: 0,
      review: '',
      addedAt: new Date().toISOString(),
      watchedDate: '',
      movie: { id: row?.id || 0, title: '数据损坏', overview: '请删除此条目重新添加' },
    };
  }
}

export async function loadMovies(userId) {
  if (!userId) { console.error('loadMovies: userId is null/undefined'); return []; }
  console.log('loadMovies: userId =', userId);
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    if (error) {
      console.error('Supabase load error:', JSON.stringify(error, null, 2));
      return [];
    }
    if (!data || !Array.isArray(data)) return [];
    return data.map(rowToEntry).filter(Boolean);
  } catch (e) {
    console.error('loadMovies failed:', e);
    return [];
  }
}

export async function addMovieDb(userId, movieData, status = 'want') {
  if (!userId || !movieData) { console.error('addMovieDb: missing params', { userId, movieData }); return null; }
  console.log('addMovieDb: userId =', userId, 'movieId =', movieData.id);
  try {
    const row = {
      id: movieData.id,
      user_id: userId,
      status: status || 'want',
      rating: 0,
      review: '',
      watched_date: '',
      added_at: new Date().toISOString(),
      movie_data: movieData,
    };
    console.log('addMovieDb: inserting row', JSON.stringify(row, null, 2));
    const { data, error } = await supabase.from('movies').insert(row).select();
    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error, null, 2));
      if (error.code === '23505') {
        const { data: upd, error: upErr } = await supabase
          .from('movies')
          .update({ movie_data: movieData })
          .eq('id', movieData.id)
          .eq('user_id', userId)
          .select();
        if (upErr) { console.error('Update error:', JSON.stringify(upErr, null, 2)); throw upErr; }
        return rowToEntry(upd?.[0]);
      }
      throw error;
    }
    console.log('addMovieDb: insert success', data?.[0]?.id);
    return rowToEntry(data?.[0]);
  } catch (e) {
    console.error('addMovieDb failed:', JSON.stringify(e, null, 2));
    return null;
  }
}

export async function updateMovieDb(userId, id, updates) {
  if (!userId || !id) throw new Error('Missing userId or id');
  try {
    const row = {};
    if (updates?.status !== undefined) row.status = updates.status;
    if (updates?.rating !== undefined) row.rating = updates.rating;
    if (updates?.review !== undefined) row.review = updates.review;
    if (updates?.watchedDate !== undefined) row.watched_date = updates.watchedDate;
    if (updates?.location !== undefined) row.location = updates.location;
    if (updates?.movie) row.movie_data = updates.movie;

    const { data, error } = await supabase
      .from('movies')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
      .select();
    if (error) {
      console.error('Supabase update error:', JSON.stringify(error, null, 2));
      throw new Error(error.message || 'Database update failed');
    }
    return data?.[0] ? rowToEntry(data[0]) : null;
  } catch (e) {
    console.error('updateMovieDb failed:', e);
    throw e;
  }
}

export async function removeMovieDb(userId, id) {
  if (!userId || !id) return;
  try {
    const { error } = await supabase.from('movies').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  } catch (e) {
    console.error('removeMovieDb failed:', e);
  }
}

// Share encoding
export function encodeShare(movies) {
  try {
    const ids = movies.map(m => `${m.id}:${m.status}:${m.rating}`).join(',');
    return btoa(encodeURIComponent(ids));
  } catch { return ''; }
}

export function decodeShare(encoded) {
  try {
    const ids = decodeURIComponent(atob(encoded));
    return ids.split(',').map(s => {
      const [id, status, rating] = s.split(':');
      return { id: Number(id), status, rating: Number(rating) };
    }).filter(e => e.id > 0);
  } catch { return []; }
}
