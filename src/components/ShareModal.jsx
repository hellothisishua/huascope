import { useState } from 'react';

export default function ShareModal({ movies, onClose, encodeFn }) {
  const [copied, setCopied] = useState(false);
  const code = movies.length > 0 ? encodeFn(movies) : '';

  function copy() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="overlay" role="dialog">
      <div className="overlay-backdrop" onClick={onClose}></div>
      <div className="modal share-modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>🔗 分享观影清单</h2>
        <p className="modal-hint">
          复制下方分享码发给朋友，对方在 CineList 中点「导入分享码」即可同步你的清单（含状态和评分）
        </p>
        {movies.length === 0 ? (
          <div className="share-empty">清单还是空的，先添加几部电影吧</div>
        ) : (
          <>
            <textarea
              className="share-input"
              readOnly
              value={code}
              rows={5}
              onClick={(e) => e.target.select()}
            />
            <div className="share-stats">
              共 {movies.length} 部 · {movies.filter(m => m.status === 'watched').length} 已看
            </div>
            <button className="btn btn-primary share-copy-btn" onClick={copy}>
              {copied ? '✅ 已复制' : '📋 复制分享码'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
