import { useState } from 'react';
import { getMovie, formatMovie } from '../lib/tmdb';
import { updateMovieDb } from '../lib/store.jsx';
import { useAuth } from '../lib/store.jsx';

const STATUS_MAP = {
  want: { label: '想看', cls: 'status-want', icon: '🔖' },
  watching: { label: '在看', cls: 'status-watching', icon: '▶️' },
  watched: { label: '看过', cls: 'status-watched', icon: '✅' },
};

const STARS = [1, 2, 3, 4, 5];

export default function MovieCard({ entry, onClick, onStatusChange, isDetail, onClose, onUpdate, onRemove }) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      const detail = await getMovie(entry.id);
      const movie = formatMovie(detail);
      await updateMovieDb(user.id, entry.id, { movie });
      onUpdate({ movie });
    } catch (e) {
      console.error('refresh failed:', e);
    }
    setRefreshing(false);
  };

  const { movie, status, rating } = entry;
  const st = STATUS_MAP[status];

  // 详情弹窗模式
  if (isDetail) {
    return (
      <div className="overlay" role="dialog">
        <div className="overlay-backdrop" onClick={onClose}></div>
        <div className="modal detail-modal">
          <button className="modal-close" onClick={onClose}>x</button>

          {/* Header area */}
          <div className="detail-header" style={movie.backdrop ? {
            backgroundImage: `url(https://image.tmdb.org/t/p/w780${movie.backdrop})`,
            backgroundSize: 'cover', backgroundPosition: 'center'
          } : {}}>
            <div className="detail-header-overlay">
              {movie.poster && <img src={posterUrl(movie.poster, 'w185')} alt="" className="detail-poster" />}
            </div>
          </div>

          <div className="detail-body">
            <h2 className="detail-title">{movie.title}</h2>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <div className="detail-original">{movie.originalTitle}</div>
            )}
            <div className="detail-meta">
              <span>{movie.year}</span>
              {movie.runtime > 0 && <span> · {movie.runtime} 分钟</span>}
              {movie.rating && <span> · ⭐ {movie.rating}</span>}
            </div>

            {(movie.genres || []).length > 0 && (
              <div className="detail-genres">
                {movie.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
              </div>
            )}

            {/* Director */}
            {movie.director && (
              <div className="detail-section">
                <label>导演</label>
                <p className="detail-director">{movie.director}</p>
              </div>
            )}

            {/* Cast */}
            {(movie.cast || []).length > 0 && (
              <div className="detail-section">
                <label>演员</label>
                <p className="detail-cast">{movie.cast.join('、')}</p>
              </div>
            )}

            {/* Refresh Button - 旧电影信息可能不全，点击重新获取 */}
            <div className="detail-section">
              <button 
                className="btn btn-ghost btn-sm refresh-btn" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? '更新中...' : '🔄 更新电影信息'}
              </button>
              <p className="refresh-hint">旧电影演员/导演可能不全，点击从TMDB重新获取</p>
            </div>

            {/* Status */}
            <div className="detail-section">
              <label>状态</label>
              <div className="status-options">
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <button
                    key={k}
                    className={`btn btn-sm ${status === k ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => onUpdate({ status: k })}
                  >{v.icon} {v.label}</button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="detail-section">
              <label>评分</label>
              <div className="star-rating">
                {STARS.map(s => (
                  <button
                    key={s}
                    className={`star-btn ${s <= rating ? 'star-btn--active' : ''}`}
                    onClick={() => onUpdate({ rating: rating === s ? 0 : s })}
                  >{s <= rating ? '★' : '☆'}</button>
                ))}
              </div>
            </div>

            {/* Watched Date */}
            {status === 'watched' && (
              <div className="detail-section">
                <label>观看时间</label>
                <input
                  type="date"
                  className="date-input"
                  value={entry.watchedDate || ''}
                  onChange={e => onUpdate({ watchedDate: e.target.value })}
                />
              </div>
            )}

            {/* Review */}
            <div className="detail-section">
              <label>短评</label>
              <textarea
                className="review-input"
                value={entry.review}
                onChange={e => onUpdate({ review: e.target.value })}
                placeholder="写下你的感受..."
                rows={3}
              />
            </div>

            {/* Overview */}
            <div className="detail-section">
              <label>简介</label>
              <p className="detail-overview">{movie.overview}</p>
            </div>

            <div className="detail-section detail-footer">
              <span className="detail-added">添加于 {new Date(entry.addedAt).toLocaleDateString('zh-CN')}</span>
              <button className="btn btn-danger btn-sm" onClick={onRemove}>删除</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 卡片模式
  return (
    <div className={`movie-card ${status === 'watched' ? 'movie-card--watched' : ''}`} onClick={onClick}>
      <div className="movie-card-left">
        {movie.poster ? (
          <img src={posterUrl(movie.poster, 'w154')} alt="" className="movie-card-poster" loading="lazy" />
        ) : (
          <div className="movie-card-poster movie-card-poster--empty">🎬</div>
        )}
      </div>
      <div className="movie-card-body">
        <div className="movie-card-title">{movie.title}</div>
        <div className="movie-card-meta">
          <span>{movie.year}</span>
          {movie.runtime > 0 && <span> · {movie.runtime} 分钟</span>}
          {movie.rating && <span> · TMDB {movie.rating}</span>}
        </div>
        {(movie.genres || []).length > 0 && (
          <div className="movie-card-genres">
            {movie.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
          </div>
        )}
        <div className="movie-card-status-row">
          <span className={`status-badge ${st.cls}`}>{st.icon} {st.label}</span>
          {rating > 0 && (
            <span className="movie-card-stars">
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
            </span>
          )}
        </div>
        {entry.review && <div className="movie-card-review-preview">"{entry.review.slice(0, 80)}{entry.review.length > 80 ? '...' : ''}"</div>}
      </div>
    </div>
  );
}
