import { useState, useMemo, useCallback, useEffect } from 'react';
import { loadMovies, addMovieDb, updateMovieDb, removeMovieDb, encodeShare, decodeShare, useAuth } from './lib/store.jsx';
import { searchMovies, getMovie, formatMovie } from './lib/tmdb';
import { bind } from 'cuelume';
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
  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    try { bind(); } catch {}
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

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    const data = await loadMovies(user.id);
    if (Array.isArray(data)) setMovies(data);
    setRefreshing(false);
  };

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
      alert('添加失败！错误: ' + (e.message || '未知错误'));
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
    removeMovieDb(user.id, id);
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
      id: m.id, title: m.movie?.title, titleCn: m.movie?.titleCn,
      year: m.movie?.year, status: m.status, rating: m.rating, review: m.review,
      watchedDate: m.watchedDate, location: m.location,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huascope-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [movies]);

  const handleImport = useCallback(async () => {
      if (!user) return;
      const entries = await decodeShare(importCode);
      if (entries.length === 0) { alert('无效的分享码'); return; }
      let ok = 0, fail = 0;
      for (const e of entries) {
        try {
          const movie = {
            id: e.id,
            title: e.title || '未知电影',
            titleCn: e.titleCn || e.title || '未知电影',
            year: e.year || '—',
            poster: e.poster || null,
            runtime: e.runtime || 0,
            genres: Array.isArray(e.genres) ? e.genres : [],
          };
          const entry = await addMovieDb(user.id, movie, e.status || 'watched');
          if (entry) {
            if (e.rating > 0) await updateMovieDb(user.id, entry.id, { rating: e.rating });
            setMovies(prev => {
              const filtered = prev.filter(m => m.id !== entry.id);
              return [{ ...entry, rating: e.rating || 0 }, ...filtered];
            });
            ok++;
          } else {
            fail++;
          }
        } catch (err) {
          console.error('Import error:', e.id, err);
          fail++;
        }
      }
      if (fail > 0 && ok === 0) {
        alert('导入失败，请检查网络或稍后重试');
      } else if (ok > 0) {
        alert(`成功导入 ${ok} 部电影` + (fail > 0 ? `，${fail} 部失败` : ''));
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

  const modals = (
      <>
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
        {randomOpen && <RandomPick movies={movies} onClose={() => setRandomOpen(false)} />}
        {shareOpen && <ShareModal movies={movies} onClose={() => setShareOpen(false)} />}

        {importOpen && (
          <div className="overlay" role="dialog">
            <div className="overlay-backdrop" onClick={() => setImportOpen(false)}></div>
            <div className="modal">
              <button className="modal-close" onClick={() => setImportOpen(false)}>x</button>
              <h2>📥 导入分享码</h2>
              <p style={{fontSize:13,color:'var(--txt2)',marginBottom:12}}>粘贴朋友分享给你的短语</p>
              <input
                className="search-input-modal"
                value={importCode}
                onChange={e => setImportCode(e.target.value)}
                placeholder="例如：柏林的雨"
                style={{fontSize:16,textAlign:'center'}}
              />
              <button
                className="btn btn-primary share-copy-btn"
                onClick={handleImport}
                style={{marginTop:12}}
              >导入</button>
            </div>
          </div>
        )}
      </>
    );

        return (
          <div className="app">
            <aside className="sidebar">
              <div className="sidebar-header">
                <div className="sidebar-logo">
                  <span className="flower">❀</span>
                  <h1>HuaScope</h1>
                </div>
                <div className="sidebar-user">{user.email?.split('@')[0] || '观影簿'}</div>
              </div>

              <nav className="sidebar-nav">
                <button className={`sidebar-nav-item ${view === VIEWS.list ? 'active' : ''}`} onClick={() => setView(VIEWS.list)}>
                  <span className="sidebar-nav-icon">📋</span> 电影列表
                </button>
                <button className={`sidebar-nav-item ${view === VIEWS.poster ? 'active' : ''}`} onClick={() => setView(VIEWS.poster)}>
                  <span className="sidebar-nav-icon">🖼</span> 海报墙
                </button>
                <button className={`sidebar-nav-item ${view === VIEWS.stats ? 'active' : ''}`} onClick={() => setView(VIEWS.stats)}>
                  <span className="sidebar-nav-icon">📊</span> 统计
                </button>
              </nav>

              <div className="sidebar-footer">
                <button className="sidebar-footer-btn" onClick={() => setRandomOpen(true)}>
                  <span>🎲</span> 随机抽一部
                </button>
                <button className="sidebar-footer-btn" onClick={() => setShareOpen(true)}>
                  <span>🔗</span> 分享
                </button>
                <button className="sidebar-footer-btn" onClick={() => setImportOpen(true)}>
                  <span>📥</span> 导入
                </button>
                <button className="sidebar-footer-btn" onClick={handleExport}>
                  <span>📤</span> 导出
                </button>
                <button className="sidebar-footer-btn danger" onClick={handleReset}>
                  <span>🗑</span> 清空
                </button>
                <button className="sidebar-footer-btn danger" onClick={() => signOut()}>
                  <span>🚪</span> 退出
                </button>
              </div>
            </aside>

      <main className="content">
        <div className="content-header">
          <h2>
            {view === VIEWS.list ? '📋 电影列表' : view === VIEWS.poster ? '🖼 海报墙' : '📊 统计'}
          </h2>
          <div className="filters">
            {view !== VIEWS.stats && (
              <>
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
                <select className="filter-select" value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
                  <option value="">全部类型</option>
                  {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="added">按添加时间</option>
                  <option value="year">按年份</option>
                  <option value="rating">按评分</option>
                </select>
              </>
            )}
            <button className="btn btn-primary" onClick={() => setSearchOpen(true)}>
              ❀ 添加电影
            </button>
          </div>
        </div>

        <div className="content-body">
          {refreshing && (
            <div className="refresh-indicator">⟳ 刷新中...</div>
          )}
          {loading ? (
            <div className="empty"><p>⏳ 正在从云端加载...</p></div>
          ) : view === VIEWS.list && (
            filtered.length === 0 ? (
              <div className="empty">
                <span className="empty-flower">❀</span>
                <p>还没有电影记录</p>
                <p className="empty-hint">点击"添加电影"搜索并添加你的第一部电影</p>
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
            <PosterWall
              movies={filtered}
              onClick={(id) => setDetailId(id)}
            />
          )}

          {view === VIEWS.stats && (
            <MoviesChart movies={movies} />
          )}
        </div>
      </main>

      {modals}
    </div>
  );
}