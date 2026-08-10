import { posterUrl } from '../lib/tmdb';

export default function PosterWall({ movies, onClick }) {
  if (movies.length === 0) return <div className="empty">🎬 筛选结果为空</div>;

  return (
    <div className="poster-wall">
      {movies.map(m => (
        <button key={m.id} className="poster-item" onClick={() => onClick(m.id)} title={m.movie.title}>
          {m.movie.poster ? (
            <img src={posterUrl(m.movie.poster, 'w185')} alt="" className="poster-img" loading="lazy" />
          ) : (
            <div className="poster-placeholder">
              <span>🎬</span>
              <span className="poster-placeholder-title">{m.movie.title}</span>
            </div>
          )}
          <div className="poster-overlay">
            <div className="poster-overlay-title">{m.movie.title}</div>
            <div className="poster-overlay-year">{m.movie.year}</div>
            {m.rating > 0 && <div className="poster-overlay-rating">{'★'.repeat(m.rating)}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}
