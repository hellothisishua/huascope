import { useState, useMemo } from 'react';
import { useAuth, updateMovieDb } from '../lib/store.jsx';
import { getMovie, formatMovie } from '../lib/tmdb';

const AC_COLORS = ['#6B9E4B','#E8954A','#7EB8D6','#E8A0A0','#D4B595','#B5A0C0'];

export default function MoviesChart({ movies }) {
  const { user } = useAuth() || {};
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const watched = useMemo(() => {
    try {
      if (!Array.isArray(movies)) return [];
      return movies.filter(m => m && m.status === 'watched');
    } catch { return []; }
  }, [movies]);

  const monthlyData = useMemo(() => {
    try {
      const months = {};
      for (const m of watched) {
        let dateStr = m.watchedDate || m.addedAt;
        if (!dateStr) continue;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        months[key] = (months[key] || 0) + 1;
      }
      return Object.entries(months).sort((a, b) => {
        const aM = a[0].match(/(\d+)年(\d+)月/);
        const bM = b[0].match(/(\d+)年(\d+)月/);
        if (!aM || !bM) return 0;
        return aM[1] !== bM[1] ? aM[1] - bM[1] : aM[2] - bM[2];
      });
    } catch { return []; }
  }, [watched]);

  const genreData = useMemo(() => {
    try {
      const genres = {};
      for (const m of watched) {
        if (!Array.isArray(m.movie?.genres)) continue;
        for (const g of m.movie.genres) {
          if (g) genres[g] = (genres[g] || 0) + 1;
        }
      }
      return Object.entries(genres).sort((a, b) => b[1] - a[1]);
    } catch { return []; }
  }, [watched]);

  const directorData = useMemo(() => {
    try {
      const dirs = {};
      for (const m of watched) {
        const d = m.movie?.director;
        if (d && typeof d === 'string') dirs[d] = (dirs[d] || 0) + 1;
      }
      return Object.entries(dirs).sort((a, b) => b[1] - a[1]);
    } catch { return []; }
  }, [watched]);

  const yearlyData = useMemo(() => {
    try {
      const years = {};
      for (const m of watched) {
        const y = m.movie?.year;
        if (y && y !== '—') years[y] = (years[y] || 0) + 1;
      }
      return Object.entries(years).sort((a, b) => String(b[0]).localeCompare(String(a[0])));
    } catch { return []; }
  }, [watched]);

  if (!watched || watched.length === 0) {
    return (
      <div className="empty">
        <span className="empty-flower">🍂</span>
        <p>还没有已看过的电影</p>
        <p className="empty-hint">标记几部看过这里会出现统计</p>
      </div>
    );
  }

  const maxMonthly = Math.max(...monthlyData.map(m => m[1]), 1);
  const maxGenre = Math.max(...genreData.map(g => g[1]), 1);
  const maxDir = Math.max(...directorData.map(d => d[1]), 1);

  return (
    <div className="stats">
      <div className="stats-hero">
        <div className="stats-hero-num">{watched.length}</div>
        <div className="stats-hero-label">部已看过</div>
        <div className="stats-hero-grid">
          <div className="stat-mini">
            <div className="stat-mini-num">{(watched.reduce((s, m) => s + (Number(m.movie?.runtime) || 0), 0) / 60).toFixed(1)}h</div>
            <div className="stat-mini-label">总时长</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-num">{(watched.reduce((s, m) => s + (m.rating || 0), 0) / watched.length).toFixed(1)}</div>
            <div className="stat-mini-label">平均评分</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-num">{yearlyData.length}</div>
            <div className="stat-mini-label">覆盖年份</div>
          </div>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="stats-section">
          <h3>观影趋势</h3>
          <div className="bars ac-leaf">
            {monthlyData.map(([month, count]) => (
              <div key={month} className="bar">
                <div className="bar-label">{month}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(count / maxMonthly) * 100}%` }}></div>
                </div>
                <div className="bar-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {genreData.length > 0 && (
        <div className="stats-section">
          <h3>类型偏好</h3>
          <div className="genre-list">
            {genreData.slice(0, 8).map(([g, count], i) => (
              <div key={g} className="genre-row">
                <div className="genre-name">{g}</div>
                <div className="genre-track">
                  <div className="genre-fill" style={{ width: `${(count / maxGenre) * 100}%`, background: AC_COLORS[i % AC_COLORS.length] }}></div>
                </div>
                <div className="genre-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {directorData.length > 0 && (
        <div className="stats-section">
          <h3>导演榜</h3>
          <div className="genre-list">
            {directorData.slice(0, 6).map(([d, count], i) => (
              <div key={d} className="genre-row">
                <div className="director-name">{d}</div>
                <div className="genre-track">
                  <div className="genre-fill" style={{ width: `${(count / maxDir) * 100}%`, background: AC_COLORS[i % AC_COLORS.length] }}></div>
                </div>
                <div className="genre-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {yearlyData.length > 0 && (
        <div className="stats-section">
          <h3>按年份</h3>
          <div className="genre-list">
            {yearlyData.map(([y, count], i) => {
              const maxYear = Math.max(...yearlyData.map(c => c[1]), 1);
              return (
                <div key={y} className="genre-row">
                  <div className="genre-name">{y}</div>
                  <div className="genre-track">
                    <div className="genre-fill" style={{ width: `${(count / maxYear) * 100}%`, background: AC_COLORS[i % AC_COLORS.length] }}></div>
                  </div>
                  <div className="genre-count">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}