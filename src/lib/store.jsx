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

// Share encoding (encodes movie data for sharing)
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

// Generate a random share code (e.g., "东京的雨")
export function generateShareCode() {
  const cities = [
    '东京','京都','大阪','名古屋','福冈','札幌','广岛','长崎','神户','横滨',
    '镰仓','奈良','冲绳','济州','釜山','首尔','北京','上海','香港','台北',
    '澳门','新加坡','曼谷','吉隆坡','雅加达','马尼拉','河内','金边','仰光',
    '达卡','孟买','德里','加尔各答','卡拉奇','伊斯坦布尔','德黑兰','迪拜',
    '利雅得','耶路撒冷','贝鲁特','安曼','多哈','马斯喀特','阿布扎比','麦加',
    '吉达','亚历山大','开罗','亚的斯亚贝巴','内罗毕','达累斯萨拉姆','坎帕拉',
    '拉各斯','阿克拉','达喀尔','卡萨布兰卡','突尼斯','阿尔及尔','喀布尔',
    '塔什干','阿拉木图','比什凯克','杜尚别','巴库','第比利斯','埃里温',
    '乌兰巴托','平壤','京都','奈良','神户','镰仓','冲绳','长崎','广岛',
    '伦敦','巴黎','柏林','马德里','罗马','维也纳','阿姆斯特丹','布鲁塞尔',
    '苏黎世','日内瓦','慕尼黑','法兰克福','汉堡','科隆','巴塞罗那','里斯本',
    '雅典','布拉格','布达佩斯','华沙','斯德哥尔摩','奥斯陆','哥本哈根',
    '赫尔辛基','雷克雅未克','都柏林','爱丁堡','格拉斯哥','曼彻斯特',
    '伯明翰','利物浦','莫斯科','圣彼得堡','基辅','明斯克','里加','维尔纽斯',
    '塔林','布加勒斯特','索非亚','贝尔格莱德','萨格勒布','地拉那',
    '斯科普里','瓦莱塔','尼科西亚','卢森堡','摩纳哥','安道尔',
    '纽约','洛杉矶','芝加哥','休斯顿','菲尼克斯','费城','圣安东尼奥',
    '圣地亚哥','达拉斯','圣何塞','奥斯汀','杰克逊维尔','沃斯堡','哥伦布',
    '印第安纳波利斯','夏洛特','旧金山','西雅图','丹佛','华盛顿','波士顿',
    '纳什维尔','底特律','波特兰','拉斯维加斯','巴尔的摩','密尔沃基',
    '亚特兰大','迈阿密','新奥尔良','火奴鲁鲁','多伦多','温哥华','蒙特利尔',
    '渥太华','卡尔加里','埃德蒙顿','魁北克城','温尼伯','哈利法克斯',
    '维多利亚','墨西哥城','坎昆','瓜达拉哈拉','蒙特雷',
    '圣保罗','里约热内卢','布宜诺斯艾利斯','利马','波哥大','圣地亚哥',
    '加拉加斯','基多','拉巴斯','亚松琴','蒙得维的亚','巴西利亚',
    '悉尼','墨尔本','布里斯班','珀斯','阿德莱德','堪培拉','霍巴特',
    '达尔文','奥克兰','惠灵顿','基督城','苏瓦','莫尔兹比港',
    '约翰内斯堡','开普敦','德班','开罗','拉各斯','阿克拉','卡萨布兰卡',
    '突尼斯','阿尔及尔','亚的斯亚贝巴','达累斯萨拉姆','坎帕拉'
  ];

  const words = [
    '雨','雪','风','月','星','云','雾','霜','露','花','叶','海','河',
    '湖','山','光','影','晴','阴','潮汐','极光','彩虹','晚霞','晨曦',
    '午后','黄昏','深夜','黎明','破晓','子夜','拂晓','日暮','凌晨',
    '傍晚','三更','五更','十年','百年','千年','刹那','永恒',
    '思念','乡愁','旧梦','流年','年少','青春','往事','归途','远方',
    '相遇','离别','重逢','微笑','眼泪','心跳','遗忘','回忆','憧憬',
    '咖啡','书信','钢琴','胶片','车站','街灯','书店','花园','列车',
    '帆船','留声机','望远镜','明信片','日记','钥匙','钟表','镜子',
    '油纸伞','折扇','风铃','纸鹤','烟火','孔明灯','邮票','硬币',
    '时光','岁月','记忆','梦境','旅途','故事','诗篇','旋律','画卷',
    '密码','谜题','坐标','频率','温度','湿度','纬度','经度','海拔',
    '回声','倒影','剪影','轮廓','碎片','粉末','涟漪','漩涡',
    '早餐','晚餐','夜宵','下午茶','散步','旅行','流浪','隐居','漫步',
    '奔跑','飞行','漂流','跋涉','攀登','潜游','露营','野餐',
    '温度','颜色','气味','声音','味道','触感','音色','香气','回声',
    '低语','呢喃','呐喊','沉默','喧嚣','寂静','嘈杂','空灵'
  ];

  const city = cities[Math.floor(Math.random() * cities.length)];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${city}的${word}`;
}

// Create a share code in the database
export async function createShareCode(userId, movies) {
  const code = generateShareCode();
  const data = encodeShare(movies);
  
  const { error } = await supabase.from('share_codes').insert({
    code,
    data,
    user_id: userId,
  });
  
  if (error) throw error;
  return code;
}

// Look up a share code and get the movie data
export async function getShareCodeData(code) {
  const { data, error } = await supabase
    .from('share_codes')
    .select('*')
    .eq('code', code)
    .single();
  
  if (error) throw error;
  return data;
}
