import { useState, useMemo, useCallback, useEffect } from 'react';
import { loadMovies, addMovieDb, updateMovieDb, removeMovieDb, encodeShare, decodeShare, useAuth } from './lib/store.jsx';
import { searchMovies, getMovie, formatMovie } from './lib/tmdb';
import AuthScreen from './components/AuthScreen';
import SearchModal from './components/SearchModal';
import MoviesChart from './components/MoviesChart';
import PosterWall from './components/PosterWall';
import MovieCard from './components/MovieCard';
import RandomPick from './components/RandomPick';
import ShareModal from './components/ShareModal';
import './styles.css';

const VIEWS = { list: 'list', poster: 'poster', stats: 'stats' };

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(VIEWS.list);
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [sortBy, setSortBy] = useState('added');
  const [randomOpen, setRandomOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadMovies(user.id)
        .then(data => {
          if (Array.isArray(data)) setMovies(data);
          else setMovies([]);
          setLoading(false);
        })
        .catch(() => { setMovies([]); setLoading(false); });
    } else {
      setMovies([]);
      setLoading(false);
    }
  }, [user]);

  const handleAdd = useCallback(async (raw, status) => {
    if (!user) return;
    try {
      const detail = await getMovie(raw.id);
      if (!detail) throw new Error('无法获取电影详情');
      const movie = formatMovie(detail);
      const entry = await addMovieDb(user.id, movie, status || 'want');
      if (entry) {
        setMovies(prev => [entry, ...prev.filter(m => m.id !== entry.id)]);
        setSearchOpen(false);
      }
    } catch (e) {
      alert('添加失败: ' + (e.message || '未知错误'));
    }
  }, [user]);

  const handleUpdate = useCallback((id, updates) => {
    if (!user) return;
    setMovies(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    return updateMovieDb(user.id, id, updates);
  }, [user]);

  const handleRemove = useCallback((id) => {
    if (!user) return;
    if (!confirm('确定删除？')) return;
    setMovies(prev => prev.filter(m => m.id !== id));
    setDetailId(null);
    removeMovieDb(user.id, id);
  }, [user]);

  const handleExport = useCallback(() => {
    if (!movies.length) return alert('没有数据');
    const data = movies.map(m => ({ id: m.id, title: m.movie?.title, status: m.status, rating: m.rating, review: m.review }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huascope-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [movies]);

  const handleReset = useCallback(async () => {
    if (!user || !confirm('确定清空所有记录？')) return;
    for (const m of movies) await removeMovieDb(user.id, m.id).catch(() => {});
    setMovies([]);
  }, [user, movies]);

  const allGenres = useMemo(() => {
    try {
      const set = new Set();
      movies.forEach(m => m.movie?.genres?.forEach(g => set.add(g)));
      return [...set].sort();
    } catch { return []; }
  }, [movies]);

  const allYears = useMemo(() => {
    try {
      const set = new Set(movies.map(m => m.movie?.year).filter(y => y && y !== '—'));
      return [...set].sort((a, b) => b - a);
    } catch { return []; }
  }, [movies]);

  const filtered = useMemo(() => {
    try {
      let list = [...movies];
      if (filterStatus !== 'all') list = list.filter(m => m.status === filterStatus);
      if (filterYear) list = list.filter(m => m.movie?.year === filterYear);
      if (filterGenre) list = list.filter(m => m.movie?.genres?.includes(filterGenre));
      if (sortBy === 'added') list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
      else if (sortBy === 'year') list.sort((a, b) => Number(b.movie?.year) - Number(a.movie?.year));
      else if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
      return list;
    } catch { return []; }
  }, [movies, filterStatus, filterYear, filterGenre, sortBy]);

  const detailMovie = detailId ? movies.find(m => m.id === detailId) : null;

  if (authLoading) {
    return (
      <div className="splash">
        <span className="splash-flower">❀</span>
        <h1 className="splash-title">HuaScope</h1>
        <p className="splash-sub">万花筒 · 观影簿</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <span className="logo-flower">❀</span>
          <h1>HuaScope</h1>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => setRandomOpen(true)}>🎲</button>
          <button className="btn-icon" onClick={() => setShareOpen(true)}>🔗</button>
          <button className="btn-icon" onClick={() => signOut()}>🚪</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${view === VIEWS.list ? 'tab-active' : ''}`} onClick={() => setView(VIEWS.list)}>📋 列表</button>
        <button className={`tab ${view === VIEWS.poster ? 'tab-active' : ''}`} onClick={() => setView(VIEWS.poster)}>🖼 海报墙</button>
        <button className={`tab ${view === VIEWS.stats ? 'tab-active' : ''}`} onClick={() => setView(VIEWS.stats)}>📊 统计</button>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-row">
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="want">🌱 想看</option>
            <option value="watching">🍃 在看</option>
            <option value="watched">🌸 看过</option>
          </select>
          <select className="filter-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">全部年份</option>
            {allYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="filter-row">
          <select className="filter-select" value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
            <option value="">全部类型</option>
            {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="added">按添加时间</option>
            <option value="year">按年份</option>
            <option value="rating">按评分</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <main className="content">
        {loading ? (
          <div className="empty"><p>⏳ 加载中...</p></div>
        ) : view === VIEWS.list && (
          filtered.length === 0 ? (
            <div className="empty">
              <span className="empty-flower">❀</span>
              <p>还没有电影记录</p>
              <p className="empty-hint">点击下方 + 添加第一部电影</p>
            </div>
          ) : (
            <div className="list">
              {filtered.map(m => (
                <div key={m.id} className="card" onClick={() => setDetailId(m.id)}>
                  <img className="card-poster" src={m.movie?.poster ? `https://image.tmdb.org/t/p/w185${m.movie.poster}` : ''} alt="" />
                  <div className="card-info">
                    <div className="card-title">{m.movie?.title || '未知'}</div>
                    <div className="card-meta">{m.movie?.year} · {m.movie?.runtime}min</div>
                    <div className="card-tags">
                      <span className={`tag tag-${m.status}`}>
                        {m.status === 'want' ? '🌱 想看' : m.status === 'watching' ? '🍃 在看' : '🌸 看过'}
                      </span>
                      {m.rating > 0 && <span className="tag tag-rating">{'★'.repeat(m.rating)}</span>}
                    </div>
                  </div>
                  <span className="card-flower">❀</span>
                </div>
              ))}
            </div>
          )
        )}

        {view === VIEWS.poster && (
          <PosterWall movies={filtered} onClick={(id) => setDetailId(id)} />
        )}

        {view === VIEWS.stats && (
          <MoviesChart movies={movies} />
        )}
      </main>

      {/* FAB */}
      <button className="fab" onClick={() => setSearchOpen(true)}>❀</button>

      {/* Footer */}
      <footer className="footer">
        <span>{movies.length} 部</span>
        <div className="footer-actions">
          <button className="btn-text" onClick={handleExport}>📤 导出</button>
          <button className="btn-text btn-danger" onClick={handleReset}>🗑 清空</button>
        </div>
      </footer>

      {/* Modals */}
      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)} onSelect={handleAdd} existingIds={movies.map(m => m.id)} searchFn={searchMovies} />
      )}
      {detailMovie && (
        <MovieCard isDetail entry={detailMovie} onClose={() => setDetailId(null)} onUpdate={(u) => handleUpdate(detailMovie.id, u)} onRemove={() => handleRemove(detailMovie.id)} />
      )}
      {randomOpen && <RandomPick movies={movies} onClose={() => setRandomOpen(false)} />}
      {shareOpen && <ShareModal movies={movies} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
