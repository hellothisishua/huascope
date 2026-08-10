import { useState } from 'react';
import { useAuth } from '../lib/store.jsx';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || '出错了，请重试');
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <div className="auth-flower">🌸</div>
        <h2>HuaScope</h2>
        <p className="auth-sub">{isSignUp ? '创建新账号' : '登录你的账号'}</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="邮箱地址"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密码"
            required
            minLength={6}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '请稍候...' : (isSignUp ? '注册' : '登录')}
          </button>
        </form>

        <button 
          className="btn-text auth-switch"
          onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
        >
          {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
        </button>
      </div>
    </div>
  );
}
