import { useState, useMemo } from 'react';
import { useAuth, updateMovieDb } from '../lib/store.jsx';
import { getMovie, formatMovie } from '../lib/tmdb';

export default function MoviesChart({ movies }) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const handleRefreshAll = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    setRefreshCount(0);
    
    for (const movie of movies) {
      try {
        const detail = await getMovie(movie.id);
        const formatted = formatMovie(detail);
        await updateMovieDb(user.id, movie.id, { movie: formatted });
        setRefreshCount(prev => prev + 1);
      } catch (e) {
        console.error('refresh failed for', movie.title, e);
      }
    }
    
    setRefreshing(false);
    // Reload page to get fresh data from DB
    window.location.reload();
  };
  const watched = movies.filter(m => m.status === 'watched');

  // 按月份统计
  const monthlyData = useMemo(() => {
    const months = {};
    watched.forEach(m => {
      const date = new Date(m.addedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).sort();
  }, [watched]);

  // 按年份统计
  const yearlyData = useMemo(() => {
    const years = {};
    watched.forEach(m => {
      const y = m.movie.year || '—';
      years[y] = (years[y] || 0) + 1;
    });
    return Object.entries(years).sort((a, b) => b[0].localeCompare(a[0]));
  }, [watched]);

  // 类型统计
  const genreData = useMemo(() => {
    const genres = {};
    watched.forEach(m => {
      (m.movie.genres || []).forEach(g => {
        genres[g] = (genres[g] || 0) + 1;
      });
    });
    return Object.entries(genres).sort((a, b) => b[1] - a[1]);
  }, [watched]);

  // 导演统计
  const directorData = useMemo(() => {
    const directors = {};
    watched.forEach(m => {
      const d = m.movie.director;
      if (d) {
        directors[d] = (directors[d] || 0) + 1;
      }
    });
    return Object.entries(directors).sort((a, b) => b[1] - a[1]);
  }, [watched]);

  // 演员统计
  const actorData = useMemo(() => {
    const actors = {};
    watched.forEach(m => {
      (m.movie.cast || []).forEach(a => {
        actors[a] = (actors[a] || 0) + 1;
      });
    });
    return Object.entries(actors).sort((a, b) => b[1] - a[1]);
  }, [watched]);

  if (watched.length === 0) {
    return (
      <div className="empty">
        <p>📊 还没有已看过的电影</p>
        <p className="empty-sub">标记几部"看过"后这里会出现统计</p>
      </div>
    );
  }

  return (
    <div className="stats-page">
      {/* 年度总结卡片 */}
      <div className="stats-hero">
        <div className="stats-hero-main">
          <div className="stats-hero-num">{watched.length}</div>
          <div className="stats-hero-label">部已看过</div>
        </div>
        <div className="stats-hero-grid">
          <div className="stat-mini">
            <div className="stat-mini-num">{(watched.reduce((s, m) => s + (m.movie.runtime || 0), 0) / 60).toFixed(1)}h</div>
            <div className="stat-mini-label">总时长</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-num">{(watched.reduce((s, m) => s + m.rating, 0) / watched.length).toFixed(1)}</div>
            <div className="stat-mini-label">平均评分</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-num">{Object.keys(yearlyData).length}</div>
            <div className="stat-mini-label">覆盖年份</div>
          </div>
        </div>
        {/* Refresh All Button */}
        <button 
          className="btn btn-ghost btn-sm refresh-all-btn" 
          onClick={handleRefreshAll}
          disabled={refreshing}
        >
          {refreshing ? `更新中... ${refreshCount}/${movies.length}` : '🔄 更新所有电影信息'}
        </button>
        <p className="refresh-hint">如果导演/演员/类型显示不全，点击从TMDB重新获取</p>
      </div>

      {/* 月度趋势 */}
      {monthlyData.length > 0 && (
        <div className="stats-section">
          <h3>📈 观影趋势</h3>
          <div className="chart-container">
            {monthlyData.map(([month, count]) => (
              <div key={month} className="chart-bar">
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ height: `${(count / Math.max(...monthlyData.map(m => m[1]))) * 100}%` }}></div>
                </div>
                <div className="chart-bar-label">{month.slice(5)}</div>
                <div className="chart-bar-num">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 类型分布 */}
      {genreData.length > 0 && (
        <div className="stats-section">
          <h3>🎭 类型偏好</h3>
          <div className="genre-bars">
            {genreData.slice(0, 8).map(([g, count]) => {
              const maxG = Math.max(...genreData.map(([, c]) => c), 1);
              return (
                <div key={g} className="genre-bar">
                  <div className="genre-bar-label">{g}</div>
                  <div className="genre-bar-track">
                    <div className="genre-bar-fill" style={{ width: `${(count / maxG) * 100}%` }}></div>
                  </div>
                  <div className="genre-bar-num">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 导演统计 */}
      {directorData.length > 0 && (
        <div className="stats-section">
          <h3>🎬 导演榜</h3>
          <div className="genre-bars">
            {directorData.slice(0, 10).map(([d, count]) => {
              const maxD = Math.max(...directorData.map(([, c]) => c), 1);
              return (
                <div key={d} className="genre-bar">
                  <div className="genre-bar-label">{d}</div>
                  <div className="genre-bar-track">
                    <div className="genre-bar-fill" style={{ width: `${(count / maxD) * 100}%` }}></div>
                  </div>
                  <div className="genre-bar-num">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 演员统计 */}
      {actorData.length > 0 && (
        <div className="stats-section">
          <h3>🎭 演员榜</h3>
          <div className="genre-bars">
            {actorData.slice(0, 10).map(([a, count]) => {
              const maxA = Math.max(...actorData.map(([, c]) => c), 1);
              return (
                <div key={a} className="genre-bar">
                  <div className="genre-bar-label">{a}</div>
                  <div className="genre-bar-track">
                    <div className="genre-bar-fill" style={{ width: `${(count / maxA) * 100}%` }}></div>
                  </div>
                  <div className="genre-bar-num">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 年份分布 */}
      {yearlyData.length > 0 && (
        <div className="stats-section">
          <h3>📅 按年份</h3>
          <div className="year-bars">
            {yearlyData.map(([y, count]) => {
              const maxCount = Math.max(...yearlyData.map(([, c]) => c), 1);
              return (
                <div key={y} className="year-bar">
                  <div className="year-bar-label">{y}</div>
                  <div className="year-bar-track">
                    <div className="year-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }}></div>
                  </div>
                  <div className="year-bar-num">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
