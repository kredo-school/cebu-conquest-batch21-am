import React, { useState } from 'react';
import { useGameStore } from '../store'; 

interface LoginViewProps {
  onLogin: (name: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  // 🚀 storeから必要な関数を抽出。loginを追加。
  const { setPlayerName, login, addLog } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 🔐 ログイン実行アクション（なおさんのJWT認証バックエンド連動版）
   */
  const handleLogin = async () => {
    if (username.trim().length === 0) {
      alert('Please enter your name.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. storeのlogin関数を実行（ここでJWT取得とステータス初期化が行われる）
      const success = await login(username, password);

      if (success) {
        // 2. エラー回避策：setPlayerNameが存在する場合のみ実行
        if (typeof setPlayerName === 'function') {
          setPlayerName(username);
        }

        addLog(`🔐 Authentication Successful: Welcome ${username}`);
        
        // 3. ゲーム画面へ遷移
        onLogin(username); 
      } else {
        alert('Authentication Failed. Check your name or password.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert('Connection Error to Fortified Server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>CEBU CONQUEST</h1>
      <p style={subtitleStyle}>〜 Fortified Session 〜</p>

      {/* ユーザー名入力 */}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={inputStyle}
      />

      {/* パスワード入力（なおさんの要塞化により必須になりました） */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ ...inputStyle, marginBottom: '30px' }}
      />

      <button 
        onClick={handleLogin} 
        style={{ ...buttonStyle, opacity: isLoading ? 0.7 : 1 }}
        disabled={isLoading}
      >
        {isLoading ? 'Establishing Secure Link...' : '🚀 ENTER CEBU CITY'}
      </button>

      {/* 下部にデバッグ用の情報を少し出すと「要塞化」っぽくてカッコいいです */}
      <div style={{ marginTop: '20px', fontSize: '10px', color: '#64748b', letterSpacing: '2px' }}>
        ENCRYPTION: JWT-SHA256 | STATUS: ENFORCED
      </div>
    </div>
  );
};

// --- 🎨 デザインの設定（以前のものを維持） ---
const containerStyle: React.CSSProperties = { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)', color: 'white', fontFamily: 'sans-serif', boxSizing: 'border-box', padding: '0 20px' };
const titleStyle: React.CSSProperties = { fontSize: '5vw', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '10px', textShadow: '0 0 20px rgba(59, 130, 246, 0.6)', textAlign: 'center' };
const subtitleStyle: React.CSSProperties = { color: '#3b82f6', marginBottom: '30px', fontSize: '1.5vw', letterSpacing: '3px', fontWeight: 'bold' };
const inputStyle: React.CSSProperties = { padding: '12px 20px', fontSize: '24px', borderRadius: '8px', border: '2px solid #3b82f6', backgroundColor: '#1e293b', color: 'white', width: '80%', maxWidth: '400px', textAlign: 'center', marginBottom: '10px', outline: 'none', boxSizing: 'border-box' };
const buttonStyle: React.CSSProperties = { padding: '15px 50px', fontSize: '24px', fontWeight: 'bold', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)', transition: '0.2s transform', width: '80%', maxWidth: '400px' };