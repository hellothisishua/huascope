export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const TMDB_KEY = '02c952df054afb8ca11440a0f84b080a';
  
  // API 代理
  if (path.startsWith('/api/tmdb/')) {
    const tmdbPath = path.replace('/api/tmdb', '');
    const separator = url.search ? '&' : '?';
    const tmdbUrl = 'https://api.themoviedb.org/3' + tmdbPath + url.search + separator + 'api_key=' + TMDB_KEY;
    
    try {
      const response = await fetch(tmdbUrl);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
  
  // 图片代理
  if (path.startsWith('/api/img/')) {
    const imgPath = path.replace('/api/img', '');
    const imgUrl = 'https://image.tmdb.org/t/p' + imgPath + url.search;
    
    try {
      const response = await fetch(imgUrl);
      const buffer = await response.arrayBuffer();
      return new Response(buffer, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
  
  return new Response('Not Found', { status: 404 });
}
