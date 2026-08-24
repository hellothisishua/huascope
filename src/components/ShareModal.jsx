import { useState } from 'react';
import { encodeShare } from '../lib/store.jsx';

export default function ShareModal({ movies, onClose }) {
  const [shareCode, setShareCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const watchedMovies = movies.filter(m => m.status === 'watched');

  const handleGenerate = async () => {
    if (watchedMovies.length === 0) return;
    setLoading(true);
    try {
      const code = await encodeShare(watchedMovies);
      setShareCode(code);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overlay" role="dialog">
      <div className="overlay-backdrop" onClick={onClose}></div>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>x</button>
        <h2>🔗 分享观影清单</h2>

        <p style={{fontSize:13,color:'var(--txt2)',marginBottom:12}}>
          已看过的电影：{watchedMovies.length} 部
        </p>

        {!shareCode ? (
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:13,color:'var(--txt2)',marginBottom:16}}>
              生成一个短分享码，朋友输入后就能看到你的清单
            </p>
            <button
              className="btn btn-primary share-copy-btn"
              onClick={handleGenerate}
              disabled={loading || watchedMovies.length === 0}
            >
              {loading ? '生成中...' : '生成分享码'}
            </button>
            {watchedMovies.length === 0 && (
              <p style={{fontSize:12,color:'var(--txt3)',marginTop:12}}>
                先标记几部看过的电影吧
              </p>
            )}
          </div>
        ) : (
                  <div style={{textAlign:'center'}}>
                    <div style={{
                      fontSize:32, fontWeight:600,
                      color:'var(--brown)', marginBottom:16,
                      fontFamily:'"Noto Serif SC", serif',
                      letterSpacing:'0.05em'
                    }}>
                      {shareCode}
                    </div>
                    <p style={{fontSize:13,color:'var(--txt2)',marginBottom:16}}>
                      把这个短语发给朋友，对方在「导入」里输入即可
                    </p>
                    <button
                      className="btn btn-primary share-copy-btn"
                      onClick={handleCopy}
                    >
                      {copied ? '✅ 已复制' : '📋 复制短语'}
                    </button>
                    <button
                      className="btn-text share-copy-btn"
                      onClick={handleGenerate}
                      style={{marginTop:8}}
                    >
                      重新生成
                    </button>
                  </div>
                )}
      </div>
    </div>
  );
}