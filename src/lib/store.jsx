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
  return {
    id: row.id,
    status: row.status,
    rating: row.rating,
    review: row.review || '',
    addedAt: row.added_at,
    movie: typeof row.movie_data === 'string' ? JSON.parse(row.movie_data) : row.movie_data,
  };
}

export async function loadMovies(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error) { console.error('load error:', error); return []; }
  return (data || []).map(rowToEntry);
}

export async function addMovieDb(userId, movieData, status = 'want') {
  const row = {
    id: movieData.id,
    user_id: userId,
    status,
    rating: 0,
    review: '',
    added_at: new Date().toISOString(),
    movie_data: movieData,
  };
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
}

export async function updateMovieDb(userId, id, updates) {
  const row = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.rating !== undefined) row.rating = updates.rating;
  if (updates.review !== undefined) row.review = updates.review;
  if (updates.movie) row.movie_data = updates.movie;

  const { data, error } = await supabase
    .from('movies')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)
    .select();
  if (error) throw error;
  return data ? rowToEntry(data[0]) : null;
}

export async function removeMovieDb(userId, id) {
  const { error } = await supabase.from('movies').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

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
