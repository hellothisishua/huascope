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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// 把 DB 行转成前端用的 entry 格式
function rowToEntry(row) {
  try {
    let movieData = row.movie_data;
    if (typeof movieData === 'string') {
      try {
        movieData = JSON.parse(movieData);
      } catch {
        movieData = { title: '未知电影', id: row.id, overview: '数据损坏' };
      }
    }
    if (!movieData || typeof movieData !== 'object') {
      movieData = { title: '未知电影', id: row.id, overview: '数据损坏' };
    }
    return {
      id: row.id,
      status: row.status || 'want',
      rating: row.rating || 0,
      review: row.review || '',
      addedAt: row.added_at || new Date().toISOString(),
      watchedDate: row.watched_date || '',
      movie: {
        id: movieData.id || row.id,
        title: movieData.title || '未知电影',
        titleCn: movieData.titleCn || movieData.title || '未知电影',
        originalTitle: movieData.originalTitle || '',
        year: movieData.year || '—',
        date: movieData.date || '',
        poster: movieData.poster || null,
        backdrop: movieData.backdrop || null,
        overview: movieData.overview || '暂无简介',
        rating: movieData.rating || null,
        runtime: movieData.runtime || 0,
        genres: Array.isArray(movieData.genres) ? movieData.genres : [],
        director: movieData.director || '',
        cast: Array.isArray(movieData.cast) ? movieData.cast : [],
      },
    };
  } catch {
    return {
      id: row.id || 0,
      status: 'want',
      rating: 0,
      review: '',
      addedAt: new Date().toISOString(),
      watchedDate: '',
      movie: { id: row.id || 0, title: '数据损坏', overview: '请删除此条目' },
    };
  }
}

export async function loadMovies(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    if (error) { console.error('load error:', error); return []; }
    return (data || []).map(rowToEntry);
  } catch (e) {
    console.error('loadMovies failed:', e);
    return [];
  }
}

export async function addMovieDb(userId, movieData, status = 'want') {
  const row = {
    id: movieData.id,
    user_id: userId,
    status,
    rating: 0,
    review: '',
    watched_date: '',
    added_at: new Date().toISOString(),
    movie_data: movieData,
  };
  try {
    const { data, error } = await supabase.from('movies').insert(row).select();
    if (error) {
      if (error.code === '23505') {
        const { data: upd, error: upErr } = await supabase
          .from('movies')
          .update({ movie_data: movieData })
          .eq('id', movieData.id)
          .eq('user_id', userId)
          .select();
        if (upErr) throw upErr;
        return rowToEntry(upd[0]);
      }
      throw error;
    }
    return rowToEntry(data[0]);
  } catch (e) {
    console.error('addMovieDb failed:', e);
    return null;
  }
}

export async function updateMovieDb(userId, id, updates) {
  const row = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.rating !== undefined) row.rating = updates.rating;
  if (updates.review !== undefined) row.review = updates.review;
  if (updates.watchedDate !== undefined) row.watched_date = updates.watchedDate;
  if (updates.movie) row.movie_data = updates.movie;

  try {
    const { data, error } = await supabase
      .from('movies')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
      .select();
    if (error) throw error;
    return data ? rowToEntry(data[0]) : null;
  } catch (e) {
    console.error('updateMovieDb failed:', e);
    return null;
  }
}

export async function removeMovieDb(userId, id) {
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

// Clear local storage and session
export function clearAllData() {
  try {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
  } catch {}
}
