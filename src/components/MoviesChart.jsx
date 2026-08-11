import { useState, useMemo } from 'react';
import { useAuth, updateMovieDb } from '../lib/store.jsx';
import { getMovie, formatMovie } from '../lib/tmdb';

const MORANDI_COLORS = [
  '#C6A5A5', '#A5B5A5', '#A5A5C6', '#B5A5C6', '#C6A58A',
  '#8A9BAA', '#B5A5A5', '#D4C8B8', '#9B8EC4', '#8FA68F',
  '#A5C6A5', '#C6A5B5', '#A5A58A', '#AA8A9B', '#8EC49B'
];

export default function MoviesChart({ movies }) {
  const { user } = useAuth() || {};
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // Safe filter - always returns array
  const watched = useMemo(() => {
    try {
      if (!Array.isArray(movies)) return [];
      return movies.filter(m => m && m.status === 'watched');
    } catch { return []; }
  }, [movies]);

  const handleRefreshAll = async () => {
    if (!user || refreshing || !Array.isArray(movies)) return;
    setRefreshing(true);
    setRefreshCount(0);
    
    for (const movie of movies) {
      if (!movie || !movie.id) continue;
      try {
        const detail = await getMovie(movie.id);
        const formatted = formatMovie(detail);
        if (formatted) {
          await updateMovieDb(user.id, movie.id, { movie: formatted });
          setRefreshCount(prev => prev + 1);
        }
      } catch (e) {
        console.error('refresh failed for', movie.title, e);
      }
    }
    
    setRefreshing(false);
    window.location.reload();
  };

  // Safe data computations
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
        const aMatch = a[0].match(/(\d+)年(\d+)月/);
        const bMatch = b[0].match(/(\d+)年(\d+)月/);
        if (!aMatch || !bMatch) return 0;
        const aYear = parseInt(aMatch[1]), aMonth = parseInt(aMatch[2]);
        const bYear = parseInt(bMatch[1]), bMonth = parseInt(bMatch[2]);
        return aYear !== bYear ? aYear - bYear : aMonth - bMonth;
      });
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
      const directors = {};
      for (const m of watched) {
        const d = m.movie?.director;
        if (d && typeof d === 'string') {
          directors[d] = (directors[d] || 0) + 1;
        }
      }
      return Object.entries(directors).sort((a, b) => b[1] - a[1]);
    } catch { return []; }
  }, [watched]);

  const actorData = useMemo(() => {
    try {
      const actors = {};
      for (const m of watched) {
        if (!Array.isArray(m.movie?.cast)) continue;
        for (const a of m.movie.cast) {
          if (a) actors[a] = (actors[a] || 0) + 1;
        }
      }
      return Object.entries(actors).sort((a, b) => b[1] - a[1]);
    } catch { return []; }
  }, [watched]);

  if (!watched || watched.length === 0) {
    return (
      <div className="empty">
        <p>还没有已看过的电影</p>
        <p className="empty-sub">标记几部看过这里会出现统计</p>
      </div>
    );
  }

  // Pie chart calculations
  const totalGenres = genreData.reduce((s, [, c]) => s + c, 0);
  const pieSlices = genreData.slice(0, 8).map(([g, count], i) => ({
    label: g,
    count,
    pct: ((count / totalGenres) * 100).toFixed(1),
    color: MORANDI_COLORS[i % MORANDI_COLORS.length]
  }));

  // SVG pie chart
  let cumulativeAngle = 0;
  const piePaths = pieSlices.map(slice => {
    const angle = (slice.count / totalGenres) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;
    
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return {
      ...slice,
      path: `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`
    };
  });

  return (
    <div className="stats-page">
      <div className="stats-hero">
        <div className="stats-hero-main">
          <div className="stats-hero-num">{watched.length}</div>
          <div className="stats-hero-label">部已看过</div>
        </div>
        <div className="stats-hero-grid">
          <div className="stat-mini">
            <div className="stat-mini-num">
              {((watched.reduce((s, m) => s + (Number(m.movie?.runtime) || 0), 0) / 60) || 0).toFixed(1)}h
            </div>
            <div className="stat-mini-label">总时长</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-num">
              {watched.length > 0 ? (watched.reduce((s, m) => s + (Number(m.rating) || 0), 0) / watched.length).toFixed(1) : '0.0'}
            </div>
            <div className="stat-mini-label">平均评分</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-num">{Object.keys(yearlyData).length || 0}</div>
            <div className="stat-mini-label">覆盖年份</div>
          </div>
        </div>
        <button 
          className="btn btn-ghost btn-sm refresh-all-btn" 
          onClick={handleRefreshAll}
          disabled={refreshing}
        >
          {refreshing ? `更新中... ${refreshCount}/${movies?.length || 0}` : '更新所有电影信息'}
        </button>
        <p className="refresh-hint">如果导演/演员显示不全点击重新获取</p>
      </div>

      {monthlyData && monthlyData.length > 0 && (
        <div className="stats-section">
          <h3>观影趋势</h3>
          <div className="chart-container">
            {monthlyData.map(([month, count]) => (
              <div key={month} className="chart-bar">
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ height: `${Math.max(0, (count / Math.max(...monthlyData.map(m => m[1]), 1))) * 100}%` }}></div>
                </div>
                <div className="chart-bar-label">{month}</div>
                <div className="chart-bar-num">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pieSlices.length > 0 && (
        <div className="stats-section">
          <h3>类型偏好</h3>
          <div className="pie-chart-container">
            <svg viewBox="0 0 200 200" className="pie-chart">
              {piePaths.map(p => (
                <path key={p.label} d={p.path} fill={p.color} stroke="#fff" strokeWidth="1">
                  <title>{p.label}: {p.count}部 ({p.pct}%)</title>
                </path>
              ))}
            </svg>
            <div className="pie-legend">
              {pieSlices.map(s => (
                <div key={s.label} className="pie-legend-item">
                  <span className="pie-legend-color" style={{ background: s.color }}></span>
                  <span className="pie-legend-label">{s.label}</span>
                  <span className="pie-legend-pct">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {directorData && directorData.length > 0 && (
        <div className="stats-section">
          <h3>导演榜</h3>
          <div className="genre-bars">
            {(directorData || []).slice(0, 10).map(([d, count], i) => {
              const maxD = Math.max(...(directorData || []).map(([, c]) => c), 1);
              return (
                <div key={d} className="genre-bar">
                  <div className="genre-bar-label">{d}</div>
                  <div className="genre-bar-track">
                    <div className="genre-bar-fill" style={{ width: `${(count / maxD) * 100}%`, background: MORANDI_COLORS[i % MORANDI_COLORS.length] }}></div>
                  </div>
                  <div className="genre-bar-num">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {actorData && actorData.length > 0 && (
        <div className="stats-section">
          <h3>演员榜</h3>
          <div className="genre-bars">
            {(actorData || []).slice(0, 10).map(([a, count], i) => {
              const maxA = Math.max(...(actorData || []).map(([, c]) => c), 1);
              return (
                <div key={a} className="genre-bar">
                  <div className="genre-bar-label">{a}</div>
                  <div className="genre-bar-track">
                    <div className="genre-bar-fill" style={{ width: `${(count / maxA) * 100}%`, background: MORANDI_COLORS[i % MORANDI_COLORS.length] }}></div>
                  </div>
                  <div className="genre-bar-num">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {yearlyData && yearlyData.length > 0 && (
        <div className="stats-section">
          <h3>按年份</h3>
          <div className="year-bars">
            {(yearlyData || []).map(([y, count], i) => {
              const maxCount = Math.max(...(yearlyData || []).map(([, c]) => c), 1);
              return (
                <div key={y} className="year-bar">
                  <div className="year-bar-label">{y}</div>
                  <div className="year-bar-track">
                    <div className="year-bar-fill" style={{ width: `${(count / maxCount) * 100}%`, background: MORANDI_COLORS[i % MORANDI_COLORS.length] }}></div>
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
