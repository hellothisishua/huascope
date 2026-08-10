export default async function handler(req, res) {
  const { path, ...queryParams } = req.query;
  const TMDB_KEY = '02c952df054afb8ca11440a0f84b080a';
  
  const tmdbPath = Array.isArray(path) ? path.join('/') : path;
  const searchParams = new URLSearchParams();
  searchParams.set('api_key', TMDB_KEY);
  searchParams.set('language', 'zh-CN');
  
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v) searchParams.set(k, v);
  });
  
  const tmdbUrl = `https://api.themoviedb.org/3/${tmdbPath}?${searchParams.toString()}`;
  
  try {
    const response = await fetch(tmdbUrl);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
