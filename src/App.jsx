import { useState, useMemo, useCallback, useEffect } from 'react';
import './styles.css';
import { loadMovies, addMovieDb, updateMovieDb, removeMovieDb, encodeShare, decodeShare, useAuth } from './lib/store.jsx';
import { searchMovies, getMovie, formatMovie } from './lib/tmdb';
import SearchModal from './components/SearchModal';
import MovieCard from './components/MovieCard';
import FilterBar from './components/FilterBar';
import PosterWall from './components/PosterWall';
import MoviesChart from './components/MoviesChart';
import RandomPick from './components/RandomPick';
import ShareModal from './components/ShareModal';
import AuthScreen from './components/AuthScreen';

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
  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState('');

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadMovies(user.id)
        .then(data => { if (Array.isArray(data)) setMovies(data); else setMovies([]); setLoading(false); })
        .catch(() => { setMovies([]); setLoading(false); });
    } else { setMovies([]); setLoading(false); }
  }, [user]);

  const handleAdd = useCallback(async (raw, status) => {
    if (!user) return;
    try {
      const detail = await getMovie(raw.id);
      if (!detail) throw new Error('无法获取电影详情');
      const movie = formatMovie(detail);
      const entry = await addMovieDb(user.id, movie, status || 'want');
      if (entry) { setMovies(prev => [entry, ...prev.filter(m => m.id !== entry.id)]); setSearchOpen(false); }
    } catch (e) { alert('添加失败！错误: ' + (e.message || '未知')); }
  }, [user]);

  const handleUpdate = useCallback((id, updates) => {
    if (!user) return;
    setMovies(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    return updateMovieDb(user.id, id, updates);
  }, [user]);

  const handleRemove = useCallback((id) => {
    if (!user || !confirm('确定删除这部电影？')) return;
    setMovies(prev => prev.filter(m => m.id !== id));
    setDetailId(null);
    removeMovieDb(user.id, id);
  }, [user]);

  const handleReset = useCallback(async () => {
    if (!user || !confirm('确定清空所有观影记录？此操作不可恢复。')) return;
    for (const m of movies) await removeMovieDb(user.id, m.id).catch(() => {});
    setMovies([]);
  }, [user, movies]);

  const handleExport = useCallback(() => {
    if (!movies?.length) { alert('没有可导出的数据'); return; }
    const blob = new Blob([JSON.stringify(movies.map(m => ({
      id: m.id, title: m.movie?.title, year: m.movie?.year, status: m.status, rating: m.rating, review: m.review
    })), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `huascope-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }, [movies]);

  const handleImport = useCallback(async () => {
    if (!user) return;
    const entries = decodeShare(importCode);
    if (!entries.length) { alert('无效的分享码'); return; }
    for (const e of entries) {
      try {
        const detail = await getMovie(e.id);
        const movie = formatMovie(detail);
        const entry = await addMovieDb(user.id, movie, e.status);
        if (e.rating > 0) await updateMovieDb(user.id, e.id, { rating: e.rating });
        setMovies(prev => [{ ...entry, rating: e.rating || 0 }, ...prev.filter(m => m.id !== entry.id)]);
      } catch {}
    }
    setImportOpen(false); setImportCode('');
  }, [user, importCode]);

  const allGenres = useMemo(() => {
    try { const s = new Set(); movies.forEach(m => m.movie?.genres?.forEach(g => s.add(g))); return [...s].sort(); }
    catch { return []; }
  }, [movies]);

  const allYears = useMemo(() => {
    try { return [...new Set(movies.map(m => m.movie?.year).filter(y => y && y !== '—'))].sort((a,b) => b-a); }
    catch { return []; }
  }, [movies]);

  const filtered = useMemo(() => {
    try {
      let list = [...movies];
      if (filterStatus !== 'all') list = list.filter(m => m.status === filterStatus);
      if (filterYear) list = list.filter(m => m.movie?.year === filterYear);
      if (filterGenre) list = list.filter(m => m.movie?.genres?.includes(filterGenre));
      if (sortBy === 'added') list.sort((a,b) => new Date(b.addedAt) - new Date(a.addedAt));
      else if (sortBy === 'year') list.sort((a,b) => Number(b.movie?.year) - Number(a.movie?.year));
      else if (sortBy === 'rating') list.sort((a,b) => b.rating - a.rating);
      return list;
    } catch { return []; }
  }, [movies, filterStatus, filterYear, filterGenre, sortBy]);

  const detailMovie = detailId ? movies.find(m => m.id === detailId) : null;

  if (authLoading) {
    return (
      <div className="splash-screen">
        <svg className="splash-logo splash-logo--large" viewBox="0 0 64 64"><g transform="translate(32,32)">
          <g><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#e89ab0" opacity="0.9"/></g>
          <g transform="rotate(60)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#b06ab3" opacity="0.9"/></g>
          <g transform="rotate(120)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#7b4cc7" opacity="0.9"/></g>
          <g transform="rotate(180)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#e89ab0" opacity="0.9"/></g>
          <g transform="rotate(240)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#b06ab3" opacity="0.9"/></g>
          <g transform="rotate(300)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#7b4cc7" opacity="0.9"/></g>
          <circle cx="0" cy="0" r="6" fill="#e8c84a"/>
        </g></svg>
        <h1 className="splash-title">HuaScope</h1>
        <p className="splash-text">万花筒 · 观影簿</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const modals = (
    <>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} onSelect={handleAdd} existingIds={movies.map(m => m.id)} searchFn={searchMovies} />}
      {detailMovie && <MovieCard isDetail entry={detailMovie} onClose={() => setDetailId(null)} onUpdate={(u) => handleUpdate(detailMovie.id, u)} onRemove={() => handleRemove(detailMovie.id)} />}
      {randomOpen && <RandomPick movies={movies} onClose={() => setRandomOpen(false)} />}
      {shareOpen && <ShareModal movies={movies} onClose={() => setShareOpen(false)} />}
      {importOpen && (
        <div className="overlay">
          <div className="overlay-backdrop" onClick={() => setImportOpen(false)}></div>
          <div className="modal">
            <button className="modal-close" onClick={() => setImportOpen(false)}>x</button>
            <h2>📥 导入分享码</h2>
            <textarea className="share-input" value={importCode} onChange={e => setImportCode(e.target.value)} placeholder="粘贴分享码..." rows={4} />
            <button className="btn btn-primary share-copy-btn" onClick={handleImport}>导入</button>
          </div>
        </div>
      )}
    </>
  );

  // Shared flower SVG
  const flowerSvg = (
    <svg viewBox="0 0 64 64" width="40" height="40"><g transform="translate(32,32)">
      <g><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#e89ab0" opacity="0.9"/></g>
      <g transform="rotate(60)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#b06ab3" opacity="0.9"/></g>
      <g transform="rotate(120)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#7b4cc7" opacity="0.9"/></g>
      <g transform="rotate(180)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#e89ab0" opacity="0.9"/></g>
      <g transform="rotate(240)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#b06ab3" opacity="0.9"/></g>
      <g transform="rotate(300)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#7b4cc7" opacity="0.9"/></g>
      <circle cx="0" cy="0" r="6" fill="#e8c84a"/>
    </g></svg>
  );

  return (
    <div className="app">
      {/* Sidebar - visible on desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          {flowerSvg}
          <div>
            <div className="sidebar-title">HuaScope</div>
            <div className="sidebar-sub">万花筒 · {user.email?.split('@')[0] || '观影簿'}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className={`sidebar-nav-item ${view === VIEWS.list ? 'active' : ''}`} onClick={() => setView(VIEWS.list)}>
            <span className="sidebar-nav-icon">📋</span><span>电影列表</span>
          </div>
          <div className={`sidebar-nav-item ${view === VIEWS.poster ? 'active' : ''}`} onClick={() => setView(VIEWS.poster)}>
            <span className="sidebar-nav-icon">🖼</span><span>海报墙</span>
          </div>
          <div className={`sidebar-nav-item ${view === VIEWS.stats ? 'active' : ''}`} onClick={() => setView(VIEWS.stats)}>
            <span className="sidebar-nav-icon">📊</span><span>统计</span>
          </div>
        </nav>
        <div className="sidebar-actions">
          <button className="sidebar-action-btn" onClick={() => setRandomOpen(true)}>🎲 随机抽一部</button>
          <button className="sidebar-action-btn" onClick={() => setShareOpen(true)}>🔗 分享</button>
          <button className="sidebar-action-btn" onClick={handleExport}>📤 导出</button>
          <button className="sidebar-action-btn" onClick={() => setImportOpen(true)}>📥 导入</button>
          <button className="sidebar-action-btn danger" onClick={handleReset}>🗑 清空</button>
          <button className="sidebar-action-btn danger" onClick={() => signOut()}>🚪 退出登录</button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="main">
        {/* Mobile header */}
        <header className="header">
          <div className="header-left">
            <svg className="header-logo" viewBox="0 0 64 64"><g transform="translate(32,32)">
              <g><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#e89ab0" opacity="0.9"/></g>
              <g transform="rotate(60)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#b06ab3" opacity="0.9"/></g>
              <g transform="rotate(120)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#7b4cc7" opacity="0.9"/></g>
              <g transform="rotate(180)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#e89ab0" opacity="0.9"/></g>
              <g transform="rotate(240)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#b06ab3" opacity="0.9"/></g>
              <g transform="rotate(300)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#7b4cc7" opacity="0.9"/></g>
              <circle cx="0" cy="0" r="6" fill="#e8c84a"/>
            </g></svg>
            <div><h1>HuaScope</h1><span className="header-sub">万花筒 · {user.email?.split('@')[0] || '我的观影簿'}</span></div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setRandomOpen(true)}>🎲</button>
            <button className="icon-btn" onClick={() => setShareOpen(true)}>🔗</button>
            <button className="icon-btn" onClick={() => { if(confirm('退出？')) signOut(); }}>🚪</button>
          </div>
        </header>

        {/* Desktop header */}
        <div className="content-header">
          <h2>{view === VIEWS.list && '📋 电影列表'}{view === VIEWS.poster && '🖼 海报墙'}{view === VIEWS.stats && '📊 统计'}</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setSearchOpen(true)}>＋ 添加电影</button>
        </div>

        {/* Mobile tabs */}
        <div className="view-tabs">
          {[[VIEWS.list,'📋 列表'],[VIEWS.poster,'🖼 海报墙'],[VIEWS.stats,'📊 统计']].map(([v,l]) => (
            <button key={v} className={`view-tab ${view===v?'view-tab--active':''}`} onClick={() => setView(v)}>{l}</button>
          ))}
        </div>

        <FilterBar status={filterStatus} onStatusChange={setFilterStatus} year={filterYear} onYearChange={setFilterYear}
          genre={filterGenre} onGenreChange={setFilterGenre} sort={sortBy} onSortChange={setSortBy} years={allYears} genres={allGenres} />

        <div className="content-body">
          {loading ? (
            <div className="empty"><p>⏳ 正在从云端加载...</p></div>
          ) : view === VIEWS.list && (
            filtered.length === 0 ? (
              <div className="empty"><p>🎬 还没有电影记录</p><p className="empty-sub">点击"添加电影"搜索添加</p></div>
            ) : (
              <div className="movie-list movie-list--grid">
                {filtered.map(m => <MovieCard key={m.id} entry={m} onClick={() => setDetailId(m.id)} onStatusChange={(s) => handleUpdate(m.id, { status: s })} />)}
              </div>
            )
          )}
          {view === VIEWS.poster && <PosterWall movies={filtered} onClick={(id) => setDetailId(id)} />}
          {view === VIEWS.stats && <MoviesChart movies={movies} />}
        </div>

        <button className="fab" onClick={() => setSearchOpen(true)} title="添加电影">🌸</button>
        <div className="movie-count">{movies.length} 部 · {view === VIEWS.list ? `${filtered.length} 部可见` : ''}</div>

        <div className="settings-bar">
          <button className="btn-text" onClick={handleExport}>📤 导出</button>
          <button className="btn-text" onClick={() => setImportOpen(true)}>📥 导入</button>
          <button className="btn-text btn-text--danger" onClick={handleReset}>🗑 清空</button>
        </div>

        {modals}
      </main>
    </div>
  );
}
