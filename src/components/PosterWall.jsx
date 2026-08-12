import { posterUrl } from '../lib/tmdb';

export default function PosterWall({ movies, onClick }) {
  if (!movies || movies.length === 0) {
    return (
      <div className="empty">
        <span className="empty-flower">❀</span>
        <p>海报墙是空的</p>
        <p className="empty-hint">添加一些电影吧</p>
      </div>
    );
  }

  return (
    <div className="poster-wall">
      {movies.map(m => {
        const poster = m.movie?.poster;
        return (
          <button key={m.id} className="poster-item" onClick={() => onClick(m.id)}>
            {poster ? (
              <img className="poster-img" src={posterUrl(poster, 'w342')} alt="" />
            ) : (
              <div className="poster-placeholder">🎬</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
