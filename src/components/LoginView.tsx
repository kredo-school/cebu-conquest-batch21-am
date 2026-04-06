import React, { useState } from 'react';
import axios from 'axios'; // ✅ 通信用に追加
import { useGameStore } from '../store'; // ✅ ステート保存用に追加

interface LoginViewProps {
  onLogin: (name: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { setStatus, addLog } = useGameStore();
  
  // ✅ ユーザー名とパスワードの両方を管理 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ ログイン実行アクション
  const handleStart = async () => {
    if (username.trim().length === 0 || password.trim().length === 0) {
      alert('Please enter both your name and password.');
      return;
    }

    setIsLoading(true);
    try {
      // ✅ PHPのAPIエンドポイントを叩く (Naoさんの作成したAPIと連携) 
      // ※ URLはチームの環境（例: http://localhost/api/login.php）に合わせて調整してください
      const response = await axios.post('http://your-backend-url/api/login.php', {
        username: username,
        password: password
      });

      if (response.data.success) {
        // ✅ サーバーから受け取ったユーザーデータをグローバルステートに保存 
        setStatus({
          myId: response.data.userId,
          myTeam: response.data.team || 'red',
          hp: response.data.hp || 100,
          stamina: response.data.stamina || 100,
        });

        addLog(`🔐 ログイン成功: Welcome ${username}`);
        onLogin(username); // 親コンポーネントへ通知して画面遷移
      } else {
        alert('Login failed: ' + response.data.message);
      }
    } catch (error) {
      console.error("Login API Error:", error);
      // ⚠️ 開発用モック: 通信エラーでも名前だけで進めるようにしておく（任意）
      addLog("⚠️ API接続失敗。開発用ローカルモードで開始します。");
      onLogin(username);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>CEBU CONQUEST</h1>
      <p style={subtitleStyle}>〜 Entry permit to Cebu City 〜</p>

      {/* ユーザー名入力 */}
      <input
        type="text"
        placeholder="Enter your name..."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={inputStyle}
      />

      {/* ✅ パスワード入力の追加  */}
      <input
        type="password"
        placeholder="Enter password..."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ ...inputStyle, marginBottom: '30px' }}
      />

      <button 
        onClick={handleStart} 
        style={{ ...buttonStyle, opacity: isLoading ? 0.7 : 1 }}
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Battle start'}
      </button>
    </div>
  );
};

// --- 🎨 デザインの設定（提供されたデザインを継承） ---
const containerStyle: React.CSSProperties = {
  height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: 'radial-gradient(circle, #1e3a8a 0%, #0f172a 100%)',
  color: 'white', fontFamily: 'sans-serif', boxSizing: 'border-box', padding: '0 20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '5vw', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '10px',
  textShadow: '0 0 20px rgba(59, 130, 246, 0.6)', textAlign: 'center',
};

const subtitleStyle: React.CSSProperties = {
  color: '#94a3b8', marginBottom: '30px', fontSize: '2vw',
};

const inputStyle: React.CSSProperties = {
  padding: '12px 20px', fontSize: '24px', borderRadius: '8px', border: '2px solid #3b82f6',
  backgroundColor: '#1e293b', color: 'white', width: '80%', maxWidth: '800px',
  textAlign: 'center', marginBottom: '10px', outline: 'none', boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  padding: '15px 50px', fontSize: '24px', fontWeight: 'bold', backgroundColor: '#f97316',
  color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer',
  boxShadow: '0 6px 0 #9a3412', transition: '0.2s transform', width: '80%', maxWidth: '800px',
};