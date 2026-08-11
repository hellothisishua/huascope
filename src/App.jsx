import { useState, useMemo, useCallback, useEffect } from 'react';
import './styles.css';
import { loadMovies, addMovieDb, updateMovieDb, removeMovieDb, encodeShare, decodeShare, useAuth } from './lib/store.jsx';
import { searchMovies, getMovie, formatMovie } from './lib/tmdb';
import SearchModal from './components/SearchModal';
import MovieCard from './components/MovieCard';
import FilterBar from './components/FilterBar';
import PosterWall from './components/PosterWall';
import YearSummary from './components/YearSummary';
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

  // 加载当前用户的电影
  useEffect(() => {
    if (user) {
      setLoading(true);
      loadMovies(user.id)
        .then(data => {
          // Validate data before setting
          if (Array.isArray(data)) {
            setMovies(data);
          } else {
            console.warn('loadMovies returned non-array:', data);
            setMovies([]);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('loadMovies failed:', err);
          setMovies([]);
          setLoading(false);
        });
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
      } else {
        alert('添加失败：Supabase返回null\n\n请检查数据库权限');
      }
    } catch (e) {
      console.error('add failed:', e);
      alert('添加失败！\n\n错误: ' + (e.message || '未知错误') + '\n\n请查看F12 Console');
    }
  }, [user]);

  const handleUpdate = useCallback((id, updates) => {
    if (!user) return;
    setMovies(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    return updateMovieDb(user.id, id, updates);
  }, [user]);

  const handleRemove = useCallback((id) => {
    if (!user) return;
    if (!confirm('确定删除这部电影？')) return;
    setMovies(prev => prev.filter(m => m.id !== id));
    setDetailId(null);
    removeMovieDb(user.id, id).catch(e => console.error('remove failed:', e));
  }, [user]);

  const handleReset = useCallback(async () => {
    if (!user) return;
    if (!confirm('确定清空所有观影记录？此操作不可恢复。')) return;
    for (const m of movies) {
      await removeMovieDb(user.id, m.id).catch(() => {});
    }
    setMovies([]);
  }, [user, movies]);

  const handleExport = useCallback(() => {
    if (!movies || movies.length === 0) { alert('没有可导出的数据'); return; }
    const data = movies.map(m => ({
      id: m.id,
      title: m.movie?.title,
      titleCn: m.movie?.titleCn,
      year: m.movie?.year,
      status: m.status,
      rating: m.rating,
      review: m.review,
      watchedDate: m.watchedDate,
      location: m.location,
      director: m.movie?.director,
      cast: m.movie?.cast,
      genres: m.movie?.genres,
      overview: m.movie?.overview,
      addedAt: m.addedAt,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huascope-movies-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [movies]);

  // Pull-to-refresh state
  const [pullStart, setPullStart] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      setPullStart(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (pullStart === null) return;
    const diff = e.touches[0].clientY - pullStart;
    if (diff > 0 && diff < 200) {
      setPullDistance(diff);
    }
  }, [pullStart]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80 && user) {
      setRefreshing(true);
      loadMovies(user.id).then(data => {
        setMovies(data || []);
        setRefreshing(false);
      });
    }
    setPullStart(null);
    setPullDistance(0);
  }, [pullDistance, user]);

  const handleImport = useCallback(async () => {
    if (!user) return;
    const entries = decodeShare(importCode);
    if (entries.length === 0) { alert('无效的分享码'); return; }
    for (const e of entries) {
      try {
        const detail = await getMovie(e.id);
        const movie = formatMovie(detail);
        const entry = await addMovieDb(user.id, movie, e.status);
        if (e.rating > 0) await updateMovieDb(user.id, e.id, { rating: e.rating });
        setMovies(prev => {
          const filtered = prev.filter(m => m.id !== entry.id);
          return [{ ...entry, rating: e.rating || 0 }, ...filtered];
        });
      } catch { /* skip */ }
    }
    setImportOpen(false);
    setImportCode('');
  }, [user, importCode]);

  const allGenres = useMemo(() => {
    try {
      const set = new Set();
      movies.forEach(m => {
        if (m.movie && Array.isArray(m.movie.genres)) {
          m.movie.genres.forEach(g => set.add(g));
        }
      });
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
      else if (sortBy === 'title') list.sort((a, b) => (a.movie?.title || '').localeCompare(b.movie?.title || ''));
      return list;
    } catch { return []; }
  }, [movies, filterStatus, filterYear, filterGenre, sortBy]);

  const detailMovie = detailId ? movies.find(m => m.id === detailId) : null;

  // 加载中
  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-flower">🌸</div>
        <p>加载中...</p>
      </div>
    );
  }

  // 未登录显示登录界面
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <svg className="header-logo" viewBox="0 0 64 64">
            <g transform="translate(32,32)">
              <g><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#e89ab0" opacity="0.9"/></g>
              <g transform="rotate(60)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#b06ab3" opacity="0.9"/></g>
              <g transform="rotate(120)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#7b4cc7" opacity="0.9"/></g>
              <g transform="rotate(180)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#e89ab0" opacity="0.9"/></g>
              <g transform="rotate(240)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#b06ab3" opacity="0.9"/></g>
              <g transform="rotate(300)"><ellipse cx="0" cy="-14" rx="7" ry="14" fill="#7b4cc7" opacity="0.9"/></g>
              <circle cx="0" cy="0" r="6" fill="#e8c84a"/>
            </g>
          </svg>
          <div>
            <h1>HuaScope</h1>
            <span className="header-sub">万花筒 · {user.email?.split('@')[0] || '我的观影簿'}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setRandomOpen(true)} title="随机抽一部">🎲</button>
          <button className="icon-btn" onClick={() => setShareOpen(true)} title="分享">🔗</button>
          <button className="icon-btn" onClick={() => { if(confirm('确定退出登录？')) signOut(); }} title="退出">🚪</button>
        </div>
      </header>

      {/* View tabs */}
      <div className="view-tabs">
        {[
          [VIEWS.list, '📋 列表'],
          [VIEWS.poster, '🖼 海报墙'],
          [VIEWS.stats, '📊 统计'],
        ].map(([v, label]) => (
          <button
            key={v}
            className={`view-tab ${view === v ? 'view-tab--active' : ''}`}
            onClick={() => setView(v)}
          >{label}</button>
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        status={filterStatus} onStatusChange={setFilterStatus}
        year={filterYear} onYearChange={setFilterYear}
        genre={filterGenre} onGenreChange={setFilterGenre}
        sort={sortBy} onSortChange={setSortBy}
        years={allYears}
        genres={allGenres}
      />

      {/* Main */}
      <main 
        className="main"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {refreshing && (
          <div className="refresh-indicator">⟳ 刷新中...</div>
        )}
        {loading ? (
          <div className="empty"><p>⏳ 正在从云端加载...</p></div>
        ) : view === VIEWS.list && (
          filtered.length === 0 ? (
            <div className="empty">
              <p>🎬 还没有电影记录</p>
              <p className="empty-sub">点击下方 + 按钮搜索并添加你的第一部电影</p>
            </div>
          ) : (
            <div className="movie-list">
              {filtered.map(m => (
                <MovieCard
                  key={m.id}
                  entry={m}
                  onClick={() => setDetailId(m.id)}
                  onStatusChange={(s) => handleUpdate(m.id, { status: s })}
                />
              ))}
            </div>
          )
        )}

        {view === VIEWS.poster && (
          <PosterWall
            movies={filtered}
            onClick={(id) => setDetailId(id)}
          />
        )}

        {view === VIEWS.stats && (
          <MoviesChart movies={movies} />
        )}
      </main>

      {/* FAB */}
      <button className="fab" onClick={() => setSearchOpen(true)} title="添加电影">🌸</button>

      {/* Count */}
      <div className="movie-count">{movies.length} 部 · {view === VIEWS.list ? `${filtered.length} 部可见` : ''}</div>

      {/* Settings */}
      <div className="settings-bar">
        <button className="btn-text" onClick={handleExport}>📤 导出</button>
        <button className="btn-text" onClick={() => setImportOpen(true)}>📥 导入分享码</button>
        <button className="btn-text btn-text--danger" onClick={handleReset}>🗑 清空</button>
      </div>

      {/* Modals */}
      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onSelect={handleAdd}
          existingIds={movies.map(m => m.id)}
          searchFn={searchMovies}
        />
      )}

      {detailMovie && (
        <MovieCard
          isDetail
          entry={detailMovie}
          onClose={() => setDetailId(null)}
          onUpdate={(updates) => handleUpdate(detailMovie.id, updates)}
          onRemove={() => handleRemove(detailMovie.id)}
        />
      )}

      {randomOpen && (
        <RandomPick
          movies={movies}
          onClose={() => setRandomOpen(false)}
        />
      )}

      {shareOpen && (
        <ShareModal
          movies={movies}
          onClose={() => setShareOpen(false)}
        />
      )}

      {importOpen && (
        <div className="overlay">
          <div className="overlay-backdrop" onClick={() => setImportOpen(false)}></div>
          <div className="modal">
            <button className="modal-close" onClick={() => setImportOpen(false)}>x</button>
            <h2>📥 导入分享码</h2>
            <textarea
              className="share-input"
              value={importCode}
              onChange={e => setImportCode(e.target.value)}
              placeholder="粘贴朋友发给你的分享码..."
              rows={4}
            />
            <button className="btn btn-primary share-copy-btn" onClick={handleImport}>
              导入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
