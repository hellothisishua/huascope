import { useState } from 'react';
import { posterUrl } from '../lib/tmdb';

export default function SearchModal({ onClose, onSelect, existingIds, searchFn }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  async function doSearch(q, p = 1) {
    if (!q || q.length < 2) { setResults([]); setError(''); return; }
    setLoading(true);
    setError('');
    try {
      const data = await searchFn(q, p);
      setResults(p === 1 ? data.results : [...results, ...data.results]);
      setTotalPages(data.total_pages);
      setPage(p);
    } catch (err) {
      setResults([]);
      setError(err.message || '搜索失败，请检查网络');
    }
    setLoading(false);
  }

  return (
    <div className="overlay" role="dialog">
      <div className="overlay-backdrop" onClick={onClose}></div>
      <div className="modal search-modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>🔍 搜索电影</h2>
        <input
          className="search-input-modal"
          autoFocus
          placeholder="输入电影名称..."
          value={query}
          onChange={e => { setQuery(e.target.value); doSearch(e.target.value); }}
        />
        {loading && <div className="loading">搜索中...</div>}
        {error && (
          <div className="search-error">
            <p>⚠️ {error}</p>
            <p className="search-error-hint">TMDB API 在国内可能无法直接访问<br/>试试切换网络或开启 VPN</p>
          </div>
        )}
        {results.length > 0 && (
          <div className="search-results">
            {results.map(r => (
              <div key={r.id} className={`search-item ${existingIds.includes(r.id) ? 'search-item--exists' : ''}`}>
                <button className="search-item-main" onClick={() => onSelect(r)}>
                  {r.poster_path ? (
                    <img src={posterUrl(r.poster_path, 'w92')} alt="" className="search-item-img" />
                  ) : (
                    <div className="search-item-placeholder">🎬</div>
                  )}
                  <div className="search-item-info">
                    <div className="search-item-title">
                      {r.title}
                      {r.release_date ? <span className="search-item-year"> ({r.release_date.slice(0, 4)})</span> : ''}
                    </div>
                    <div className="search-item-overview">{r.overview?.slice(0, 100) || '暂无简介'}</div>
                    {existingIds.includes(r.id) && <div className="search-item-tag">已在清单中</div>}
                  </div>
                </button>
                {!existingIds.includes(r.id) && (
                  <button className="search-item-add" onClick={() => onSelect(r)}>＋ 添加</button>
                )}
              </div>
            ))}
            {page < totalPages && (
              <button className="btn btn-ghost" onClick={() => doSearch(query, page + 1)}>
                加载更多
              </button>
            )}
          </div>
        )}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="search-empty">没有找到相关电影</div>
        )}
      </div>
    </div>
  );
}
