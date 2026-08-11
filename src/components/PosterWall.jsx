import { posterUrl } from '../lib/tmdb';

export default function PosterWall({ movies, onClick }) {
  if (movies.length === 0) return <div className="empty">🎬 筛选结果为空</div>;

  return (
    <div className="poster-wall">
      {movies.map(m => (
        <button key={m.id} className="poster-wall-item" onClick={() => onClick(m.id)} title={m.movie.title}>
          {m.movie.poster ? (
            <img src={posterUrl(m.movie.poster, 'w342')} alt="" className="poster-wall-img" loading="lazy" />
          ) : (
            <div className="poster-wall-empty">
              <span>🎬</span>
            </div>
          )}
          <div className="poster-wall-overlay">
            <div className="poster-wall-overlay-title">{m.movie.title}</div>
            <div className="poster-wall-overlay-year">{m.movie.year}</div>
            {m.rating > 0 && <div className="poster-wall-overlay-rating">{'★'.repeat(m.rating)}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}
