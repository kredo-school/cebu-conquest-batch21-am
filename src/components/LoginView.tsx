import React, { useState } from 'react';

// ① 【意味】このコンポーネントが外（App.tsx）とやり取りするルール
// 【役割】「名前が決まったらこの関数を呼んでね」という約束（Props）を定義します
interface LoginViewProps {
  onLogin: (name: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  // ② 【意味】「状態（State）」の作成
  // 【役割】ユーザーが入力中の名前をプログラムに一時的に覚えさせておく「メモ帳」です
  // playerName: 現在の文字 / setPlayerName: 文字を書き換えるためのペン
  const [playerName, setPlayerName] = useState('');

  // ③ 【意味】ボタンが押された時の「作戦（関数）」
  // 【役割】名前が空っぽじゃないかチェックし、OKなら親（App.tsx）に報告します
  const handleStart = () => {
    if (playerName.trim().length > 0) {
      onLogin(playerName); // バケツに名前を入れて、親へパス！
    } else {
      alert('Please enter  your name.');
    }
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>CEBU CONQUEST</h1>
      <p style={subtitleStyle}>〜 Entry permit to Cebu City 〜</p>

      {/* ④ 【意味】入力フォーム（Input） */}
      {/* 【役割】ユーザーのキーボード入力を受け取り、リアルタイムでメモ帳（State）に反映します */}
      <input
        type="text"
        placeholder="Enter your name..."
        value={playerName} // 表示する文字はメモ帳から持ってくる
        onChange={(e) => setPlayerName(e.target.value)} // 1文字打つたびにメモ帳を更新
        style={inputStyle}
      />

      {/* ⑤ 【意味】実行ボタン */}
      {/* 【役割】クリックされたら ③ の作戦（handleStart）を発動させます */}
      <button onClick={handleStart} style={buttonStyle}>
        Battle start
      </button>
    </div>
  );
};

// --- 🎨 デザインの設定（ここを大幅に変更！） ---
const containerStyle: React.CSSProperties = {
  height: '100vh',
  width: '100vw', // 画面の幅100%
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center', // 横方向の中央配置はそのまま
  justifyContent: 'center', // 縦方向の中央配置はそのまま
  background: 'radial-gradient(circle, #1e3a8a 0%, #0f172a 100%)',
  color: 'white',
  fontFamily: 'sans-serif',
  boxSizing: 'border-box', // paddingを含めた計算にする
  padding: '0 20px', // 画面端の余白
};

const titleStyle: React.CSSProperties = {
  fontSize: '5vw', // 画面幅に合わせたフォントサイズ（レスポンシブ）
  fontWeight: 'bold',
  letterSpacing: '4px',
  marginBottom: '10px',
  textShadow: '0 0 20px rgba(59, 130, 246, 0.6)',
  textAlign: 'center', // タイトルも中央
};

const subtitleStyle: React.CSSProperties = {
  color: '#94a3b8',
  marginBottom: '30px',
  fontSize: '2vw', // 画面幅に合わせたフォントサイズ
};

const inputStyle: React.CSSProperties = {
  padding: '12px 20px',
  fontSize: '24px', // フォントも大きく
  borderRadius: '8px',
  border: '2px solid #3b82f6',
  backgroundColor: '#1e293b',
  color: 'white',
  // ★幅を固定（300px）から相対的（80%）に変更！
  width: '80%', 
  // ★画面が広い時のために、最大幅も決めておく
  maxWidth: '800px', 
  textAlign: 'center',
  marginBottom: '20px',
  outline: 'none',
  boxSizing: 'border-box', // paddingを含めた計算にする
};

const buttonStyle: React.CSSProperties = {
  padding: '15px 50px',
  fontSize: '24px', // フォントも大きく
  fontWeight: 'bold',
  backgroundColor: '#f97316',
  color: 'white',
  border: 'none',
  borderRadius: '50px',
  cursor: 'pointer',
  boxShadow: '0 6px 0 #9a3412',
  transition: '0.2s transform',
  // ★ボタンも幅を広く！
  width: '80%', 
  maxWidth: '800px',
};