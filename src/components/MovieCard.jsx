import { useState } from 'react';
import { getMovie, formatMovie } from '../lib/tmdb';
import { updateMovieDb, useAuth } from '../lib/store.jsx';

const STATUS_MAP = {
  want: { label: '想看', cls: 'status-want', icon: '🔖' },
  watching: { label: '在看', cls: 'status-watching', icon: '▶️' },
  watched: { label: '看过', cls: 'status-watched', icon: '✅' },
};

const STARS = [1, 2, 3, 4, 5];

function SafeMovieCard({ entry, ...props }) {
  if (!entry || !entry.movie) {
    return (
      <div className="movie-card movie-card--error">
        <div className="movie-card-body">
          <div className="movie-card-title">数据损坏</div>
          <div className="movie-card-meta">请删除此条目</div>
        </div>
      </div>
    );
  }
  return <MovieCardInner entry={entry} {...props} />;
}

function MovieCardInner({ entry, onClick, onStatusChange, isDetail, onClose, onUpdate, onRemove }) {
  const { user } = useAuth() || {};
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit state - only update on save
  const [editStatus, setEditStatus] = useState(entry.status);
  const [editRating, setEditRating] = useState(entry.rating);
  const [editReview, setEditReview] = useState(entry.review);
  const [editWatchedDate, setEditWatchedDate] = useState(entry.watchedDate);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      await onUpdate({ 
        status: editStatus, 
        rating: editRating, 
        review: editReview,
        watchedDate: editWatchedDate
      });
      onClose();
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
    setSaving(false);
  };

  const handleRemove = () => {
    if (!user) return;
    if (confirm('确定删除这部电影？此操作不可恢复。')) {
      onRemove();
    }
  };

  const handleRefresh = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      const detail = await getMovie(entry.id);
      const movie = formatMovie(detail);
      if (movie) {
        await updateMovieDb(user.id, entry.id, { movie });
        onUpdate({ movie });
      }
    } catch (e) {
      console.error('refresh failed:', e);
    }
    setRefreshing(false);
  };

  const { movie, status, rating } = entry;
  const st = STATUS_MAP[status] || STATUS_MAP.want;

  // 详情弹窗模式
  if (isDetail) {
    return (
      <div className="overlay" role="dialog">
        <div className="overlay-backdrop"></div>
        <div className="modal detail-modal">
          <button className="modal-close" onClick={onClose}>x</button>

          <div className="detail-header" style={movie.backdrop ? {
            backgroundImage: `url(https://image.tmdb.org/t/p/w780${movie.backdrop})`,
            backgroundSize: 'cover', backgroundPosition: 'center'
          } : {}}>
            <div className="detail-header-overlay">
              {movie.poster && <img src={posterUrl(movie.poster, 'w185')} alt="" className="detail-poster" />}
            </div>
          </div>

          <div className="detail-body">
            <h2 className="detail-title">{movie.title || '未知电影'}</h2>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <div className="detail-original">{movie.originalTitle}</div>
            )}
            <div className="detail-meta">
              <span>{movie.year || '—'}</span>
              {movie.runtime > 0 && <span> · {movie.runtime} 分钟</span>}
              {movie.rating && <span> · ⭐ {movie.rating}</span>}
            </div>

            {(movie.genres || []).length > 0 && (
              <div className="detail-genres">
                {movie.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
              </div>
            )}

            {movie.director && (
              <div className="detail-section">
                <label>导演</label>
                <p className="detail-director">{movie.director}</p>
              </div>
            )}

            {(movie.cast || []).length > 0 && (
              <div className="detail-section">
                <label>演员</label>
                <p className="detail-cast">{movie.cast.join('、')}</p>
              </div>
            )}

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

            <div className="detail-section">
              <label>状态</label>
              <div className="status-options">
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <button
                    key={k}
                    className={`btn btn-sm ${editStatus === k ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEditStatus(k)}
                  >{v.icon} {v.label}</button>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <label>评分</label>
              <div className="star-rating">
                {STARS.map(s => (
                  <button
                    key={s}
                    className={`star-btn ${s <= editRating ? 'star-btn--active' : ''}`}
                    onClick={() => setEditRating(editRating === s ? 0 : s)}
                  >{s <= editRating ? '★' : '☆'}</button>
                ))}
              </div>
            </div>

            {editStatus === 'watched' && (
              <div className="detail-section">
                <label>观看时间</label>
                <input
                  type="month"
                  className="date-input"
                  value={editWatchedDate || ''}
                  onChange={e => setEditWatchedDate(e.target.value)}
                />
              </div>
            )}

            <div className="detail-section">
              <label>短评</label>
              <textarea
                className="review-input"
                value={editReview || ''}
                onChange={e => setEditReview(e.target.value)}
                placeholder="写下你的感受..."
                rows={3}
              />
            </div>

            <div className="detail-section">
              <label>简介</label>
              <p className="detail-overview">{movie.overview || '暂无简介'}</p>
            </div>

            <div className="detail-section detail-footer">
              <span className="detail-added">添加于 {new Date(entry.addedAt || Date.now()).toLocaleDateString('zh-CN')}</span>
              <button className="btn btn-danger btn-sm" onClick={handleRemove}>删除</button>
            </div>

            {/* Save button */}
            <div className="detail-section detail-save-section">
              <button 
                className="btn btn-primary detail-save-btn" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中...' : '💾 保存'}
              </button>
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
        <div className="movie-card-title">{movie.title || '未知电影'}</div>
        <div className="movie-card-meta">
          <span>{movie.year || '—'}</span>
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
              {'★'.repeat(Math.min(rating, 5))}{'☆'.repeat(Math.max(0, 5 - rating))}
            </span>
          )}
        </div>
        {entry.review && <div className="movie-card-review-preview">"{entry.review.slice(0, 80)}{entry.review.length > 80 ? '...' : ''}"</div>}
      </div>
    </div>
  );
}

export default SafeMovieCard;

function posterUrl(path, size = 'w342') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
