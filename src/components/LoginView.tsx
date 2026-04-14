import React, { useState } from 'react';
import { useGameStore } from '../store'; 

interface LoginViewProps {
  onLogin: (name: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { setStatus, addLog, setPlayerName } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // 開発中は入力しなくてもOKにしています
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 🔐 ログイン実行アクション（Week 2 開発用ショートカット版）
   */
  const handleStart = () => {
    if (username.trim().length === 0) {
      alert('Please enter your name.');
      return;
    }

    setIsLoading(true);

    // 🔴 API通信をスキップして、直接Storeを更新する（CORSエラーを回避）
    setTimeout(() => {
      // 1. 名前をStoreに保存
      setPlayerName(username);

      // 2. 初期ステータスを強制セット
      setStatus({
        myId: `dev_${Date.now()}`,
        myTeam: username === 'issei' ? 'red' : 'blue', // 名前に応じて自動振り分け
        hp: 100,
        stamina: 100,
      });

      addLog(`🛠️ 開発モードでログイン: Welcome ${username}`);
      
      // 3. 親コンポーネント(App.tsx)の処理を実行
      onLogin(username); 

      setIsLoading(false);
    }, 500); // 少しだけ「通信してる感」を出すための待ち時間
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>CEBU CONQUEST</h1>
      <p style={subtitleStyle}>〜 Week 2 Debug Mode 〜</p>

      {/* ユーザー名入力 */}
      <input
        type="text"
        placeholder="Enter your name..."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={inputStyle}
      />

      {/* パスワード入力（表示のみ残していますが、チェックはしません） */}
      <input
        type="password"
        placeholder="Password (any is OK in Debug)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ ...inputStyle, marginBottom: '30px' }}
      />

      <button 
        onClick={handleStart} 
        style={{ ...buttonStyle, opacity: isLoading ? 0.7 : 1 }}
        disabled={isLoading}
      >
        {isLoading ? 'Entering Game...' : '🚀 Skip API & Start'}
      </button>
    </div>
  );
};

// --- 🎨 デザインの設定（以前のものを維持） ---
const containerStyle: React.CSSProperties = { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #1e3a8a 0%, #0f172a 100%)', color: 'white', fontFamily: 'sans-serif', boxSizing: 'border-box', padding: '0 20px' };
const titleStyle: React.CSSProperties = { fontSize: '5vw', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '10px', textShadow: '0 0 20px rgba(59, 130, 246, 0.6)', textAlign: 'center' };
const subtitleStyle: React.CSSProperties = { color: '#94a3b8', marginBottom: '30px', fontSize: '2vw' };
const inputStyle: React.CSSProperties = { padding: '12px 20px', fontSize: '24px', borderRadius: '8px', border: '2px solid #3b82f6', backgroundColor: '#1e293b', color: 'white', width: '80%', maxWidth: '800px', textAlign: 'center', marginBottom: '10px', outline: 'none', boxSizing: 'border-box' };
const buttonStyle: React.CSSProperties = { padding: '15px 50px', fontSize: '24px', fontWeight: 'bold', backgroundColor: '#f97316', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 6px 0 #9a3412', transition: '0.2s transform', width: '80%', maxWidth: '800px' };