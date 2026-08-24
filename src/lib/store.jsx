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

// 地点+天气风格分享码生成器
const CITIES = ['柏林','京都','巴黎','东京','纽约','伦敦','罗马','莫斯科','伊斯坦布尔','开罗','孟买','曼谷','首尔','马德里','阿姆斯特丹','维也纳','布拉格','赫尔辛基','里斯本','悉尼','墨西哥城','多伦多','圣保罗','约翰内斯堡','冰岛','挪威','苏格兰','威尔士','爱尔兰','葡萄牙','希腊','克罗地亚','保加利亚','爱沙尼亚','拉脱维亚','立陶宛','芬兰','瑞典','丹麦','格鲁吉亚','摩洛哥','秘鲁','智利','阿根廷','新西兰','马耳他','塞浦路斯','乌拉圭','哥斯达黎加'];
const WEATHERS = ['雾','雨','晴','雪','风','雷','霾','霜','露','雹','冰雹','沙尘暴','龙卷风','极光','海雾','山雾','城市雾','田野雾','港口雾','沙漠风','草原风','海风','山风','峡谷风','极地风','信风','季风','台风','飓风','风暴','冰暴','冻雨','毛毛雨','太阳雨','雷阵雨','大雪','暴雪','小雪','中雪','阵雪','雨夹雪','晴间多云','多云','阴天','彩虹','晚霞','朝霞','日出','日落','正午','子夜','拂晓','黄昏','黎明','晨曦','夕照','薄暮','夜幕','星空','星云','彗星','陨石','极光弧','气辉','黄道光','银河','流星雨','日全食','月全食','蓝月','血月','超级月亮'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStyleCode() {
  const city = pick(CITIES);
  const weather = pick(WEATHERS);
  return `${city}的${weather}`;
}

// 分享码 — 城市+天气中文短语，存 Supabase 查找
export async function encodeShare(movies) {
  if (!movies || movies.length === 0) return '';
  const payload = movies.map(m => ({
    id: m.id, status: m.status, rating: m.rating,
    title: m.movie?.title, titleCn: m.movie?.titleCn,
    year: m.movie?.year, poster: m.movie?.poster,
    runtime: m.movie?.runtime, genres: m.movie?.genres,
  }));
  let code, tries = 0;
  do {
    code = generateStyleCode();
    tries++;
  } while (tries < 20 && await shareCodeExists(code));
  const { error } = await supabase.from('share_code').insert({ code, data: payload });
  if (error) { console.error('save share_code:', error); return ''; }
  return code;
}

async function shareCodeExists(code) {
  const { data } = await supabase.from('share_code').select('code').eq('code', code).single();
  return !!data;
}

export async function decodeShare(code) {
  if (!code) return [];
  const { data, error } = await supabase.from('share_code').select('data').eq('code', code).single();
  if (error || !data) return [];
  return data.data || [];
}
