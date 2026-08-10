export default async function handler(req, res) {
  const { path } = req.query;
  const TMDB_KEY = '02c952df054afb8ca11440a0f84b080a';
  
  const imgPath = Array.isArray(path) ? path.join('/') : path;
  const imgUrl = `https://image.tmdb.org/t/p/${imgPath}`;
  
  try {
    const response = await fetch(imgUrl);
    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
