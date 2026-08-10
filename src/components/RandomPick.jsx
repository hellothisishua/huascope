import { useState } from 'react';
import { posterUrl } from '../lib/tmdb';

export default function RandomPick({ movies, onClose }) {
  const watched = movies.filter(m => m.status === 'watched');
  const want = movies.filter(m => m.status === 'want');
  const all = movies;

  const [pool, setPool] = useState('want');
  const [picked, setPicked] = useState(null);

  const pools = {
    want: { list: want, label: '想看' },
    watched: { list: watched, label: '看过' },
    all: { list: all, label: '全部' },
  };

  function pick() {
    const list = pools[pool].list;
    if (list.length === 0) return;
    const r = list[Math.floor(Math.random() * list.length)];
    setPicked(r);
  }

  const current = pools[pool];

  return (
    <div className="overlay" role="dialog">
      <div className="overlay-backdrop" onClick={onClose}></div>
      <div className="modal random-modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>🎲 随机抽一部</h2>

        <div className="random-pools">
          {Object.entries(pools).map(([k, v]) => (
            <button
              key={k}
              className={`btn btn-sm ${pool === k ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setPool(k); setPicked(null); }}
            >
              {v.label} ({v.list.length})
            </button>
          ))}
        </div>

        <div className="random-display">
          {picked ? (
            <div className="random-result">
              {picked.movie.poster && (
                <img src={posterUrl(picked.movie.poster, 'w342')} alt="" className="random-poster" />
              )}
              <h3>{picked.movie.title}</h3>
              <div className="random-meta">{picked.movie.year} · {picked.movie.runtime > 0 ? `${picked.movie.runtime}分钟` : ''}</div>
              {picked.movie.genres?.length > 0 && (
                <div className="detail-genres">{picked.movie.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}</div>
              )}
              <p className="random-overview">{picked.movie.overview?.slice(0, 150)}</p>
            </div>
          ) : (
            <div className="random-placeholder">
              <div className="random-placeholder-icon">🎬</div>
              <p>从 {current.list.length} 部「{current.label}」中抽一部</p>
            </div>
          )}
        </div>

        <button
          className="btn btn-primary random-btn"
          onClick={pick}
          disabled={current.list.length === 0}
        >
          {current.list.length === 0 ? '没有可选电影' : '🎲 抽！'}
        </button>
      </div>
    </div>
  );
}
