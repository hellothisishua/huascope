export default function YearSummary({ movies }) {
  const watched = movies.filter(m => m.status === 'watched');
  const totalRuntime = watched.reduce((sum, m) => sum + (m.movie.runtime || 0), 0);
  const totalHours = (totalRuntime / 60).toFixed(1);
  const avgRating = watched.length > 0
    ? (watched.reduce((s, m) => s + m.rating, 0) / watched.length).toFixed(1)
    : '0.0';

  // 按年份分组
  const byYear = {};
  watched.forEach(m => {
    const y = m.movie.year || '—';
    if (!byYear[y]) byYear[y] = { count: 0, runtime: 0, ratings: [] };
    byYear[y].count++;
    byYear[y].runtime += m.movie.runtime || 0;
    if (m.rating > 0) byYear[y].ratings.push(m.rating);
  });
  const yearEntries = Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0]));

  // 按类型统计
  const byGenre = {};
  watched.forEach(m => {
    (m.movie.genres || []).forEach(g => {
      if (!byGenre[g]) byGenre[g] = 0;
      byGenre[g]++;
    });
  });
  const genreEntries = Object.entries(byGenre).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // 按导演统计
  const byDirector = {};
  watched.forEach(m => {
    const director = m.movie.director;
    if (director) {
      if (!byDirector[director]) byDirector[director] = { count: 0, movies: [] };
      byDirector[director].count++;
      byDirector[director].movies.push(m);
    }
  });
  const directorEntries = Object.entries(byDirector).sort((a, b) => b[1].count - a[1].count).slice(0, 10);

  // 按演员统计
  const byActor = {};
  watched.forEach(m => {
    (m.movie.cast || []).forEach(actor => {
      if (!byActor[actor]) byActor[actor] = { count: 0, movies: [] };
      byActor[actor].count++;
      byActor[actor].movies.push(m);
    });
  });
  const actorEntries = Object.entries(byActor).sort((a, b) => b[1].count - a[1].count).slice(0, 10);

  // 评分分布
  const ratingDist = [0, 0, 0, 0, 0, 0];
  watched.forEach(m => { if (m.rating > 0) ratingDist[m.rating]++; });
  const maxDist = Math.max(...ratingDist, 1);

  // 最高评分
  const topRated = [...watched].filter(m => m.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 5);

  // 当前年
  const currentYear = new Date().getFullYear();
  const thisYear = byYear[String(currentYear)] || { count: 0, runtime: 0, ratings: [] };

  return (
    <div className="stats-page">
      {/* 总览 */}
      <div className="stats-hero">
        <div className="stats-hero-main">
          <div className="stats-hero-num">{watched.length}</div>
          <div className="stats-hero-label">部已看过</div>
        </div>
        <div className="stats-hero-grid">
          <div className="stat-mini">
            <div className="stat-mini-num">{totalHours}h</div>
            <div className="stat-mini-label">总时长</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-num">{avgRating}</div>
            <div className="stat-mini-label">平均评分</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-num">{thisYear.count}</div>
            <div className="stat-mini-label">{currentYear}年</div>
          </div>
        </div>
      </div>

      {/* 按年份 */}
      {yearEntries.length > 0 && (
        <div className="stats-section">
          <h3>📅 按年份</h3>
          <div className="year-bars">
            {yearEntries.map(([y, d]) => {
              const avgR = d.ratings.length > 0 ? (d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length).toFixed(1) : '—';
              const maxCount = Math.max(...yearEntries.map(([, dd]) => dd.count), 1);
              return (
                <div key={y} className="year-bar">
                  <div className="year-bar-label">{y}</div>
                  <div className="year-bar-track">
                    <div className="year-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%` }}></div>
                  </div>
                  <div className="year-bar-num">{d.count} 部</div>
                  <div className="year-bar-runtime">{(d.runtime / 60).toFixed(1)}h</div>
                  <div className="year-bar-avg">⭐ {avgR}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 类型分布 */}
      {genreEntries.length > 0 && (
        <div className="stats-section">
          <h3>🎭 类型分布</h3>
          <div className="genre-bars">
            {genreEntries.map(([g, count]) => {
              const maxG = Math.max(...genreEntries.map(([, c]) => c), 1);
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
      {directorEntries.length > 0 && (
        <div className="stats-section">
          <h3>🎬 导演统计</h3>
          <div className="genre-bars">
            {directorEntries.map(([d, data]) => {
              const maxD = Math.max(...directorEntries.map(([, dd]) => dd.count), 1);
              return (
                <div key={d} className="genre-bar">
                  <div className="genre-bar-label">{d}</div>
                  <div className="genre-bar-track">
                    <div className="genre-bar-fill" style={{ width: `${(data.count / maxD) * 100}%` }}></div>
                  </div>
                  <div className="genre-bar-num">{data.count} 部</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 演员统计 */}
      {actorEntries.length > 0 && (
        <div className="stats-section">
          <h3>🎭 演员统计</h3>
          <div className="genre-bars">
            {actorEntries.map(([a, data]) => {
              const maxA = Math.max(...actorEntries.map(([, dd]) => dd.count), 1);
              return (
                <div key={a} className="genre-bar">
                  <div className="genre-bar-label">{a}</div>
                  <div className="genre-bar-track">
                    <div className="genre-bar-fill" style={{ width: `${(data.count / maxA) * 100}%` }}></div>
                  </div>
                  <div className="genre-bar-num">{data.count} 部</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 评分分布 */}
      {ratingDist.slice(1).some(c => c > 0) && (
        <div className="stats-section">
          <h3>⭐ 评分分布</h3>
          <div className="rating-dist">
            {[5, 4, 3, 2, 1].map(s => (
              <div key={s} className="rating-dist-row">
                <span className="rating-dist-label">{'★'.repeat(s)}</span>
                <div className="rating-dist-track">
                  <div className="rating-dist-fill" style={{ width: `${(ratingDist[s] / maxDist) * 100}%` }}></div>
                </div>
                <span className="rating-dist-num">{ratingDist[s]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 */}
      {topRated.length > 0 && (
        <div className="stats-section">
          <h3>🏆 最高评分</h3>
          <div className="top-list">
            {topRated.map((m, i) => (
              <div key={m.id} className="top-item">
                <span className="top-rank">#{i + 1}</span>
                <span className="top-title">{m.movie.title}</span>
                <span className="top-year">{m.movie.year}</span>
                <span className="top-stars">{'★'.repeat(m.rating)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {watched.length === 0 && (
        <div className="empty">
          <p>📊 还没有已看过的电影</p>
          <p className="empty-sub">标记几部"看过"后这里会出现统计</p>
        </div>
      )}
    </div>
  );
}
