import React, { useState } from 'react';
import { useGameStore } from '../store';

interface LoginViewProps {
  onLogin: (name: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { setPlayerName, login, addLog } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // フォーム送信のデフォルト挙動を防止
    if (username.trim().length === 0) {
      alert('Please enter your name.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        if (typeof setPlayerName === 'function') setPlayerName(username);
        addLog(`🔐 Authentication Successful: Welcome ${username}`);
        onLogin(username); 
      } else {
        alert('Authentication Failed. Check your name or password.');
      }
    } catch (error) {
      alert('Connection Error to Fortified Server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 font-body text-slate-200 overflow-hidden h-screen flex flex-col relative">
      {/* 🚀 背景演出：島のシルエットとオレンジの光 */}
      <div className="fixed inset-0 z-0 island-silhouette opacity-40" />
      <div className="fixed inset-0 z-10 tropical-flare pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-transparent flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-black tracking-tighter text-orange-500 uppercase tracking-widest">
          Cebu Conquest
        </div>
        <div className="flex items-center gap-6">
          <span className="text-slate-400 material-symbols-outlined cursor-pointer hover:text-orange-300 transition-colors">settings</span>
          <span className="text-slate-400 material-symbols-outlined cursor-pointer hover:text-orange-300 transition-colors">help</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-4">
        {/* Logo Section */}
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold tracking-[0.2em] mb-2 uppercase">
            Welcome to the Archipelago
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-orange-500 tracking-tighter mb-1 drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]">
            CEBU CONQUEST
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide">Enter the battlefield.</p>
        </div>

        {/* 🚀 Login Card：いっせいさんの送ってくれたデザインを反映 */}
        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 shadow-2xl">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1">User ID</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">person</span>
                <input 
                  type="text" 
                  className="w-full bg-slate-950/50 border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
                  placeholder="Username or ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1">Password</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">lock</span>
                <input 
                  type="password" 
                  className="w-full bg-slate-950/50 border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <label className="flex items-center text-slate-400 cursor-pointer">
                <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-orange-500 mr-2 w-3 h-3"/> Stay logged in
              </label>
              <span className="text-orange-400 hover:text-orange-300 cursor-pointer">Forgot password?</span>
            </div>

            {/* Login Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm uppercase ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isLoading ? 'ESTABLISHING LINK...' : 'ENTER CEBU (LOGIN)'}
              {!isLoading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-slate-900/60 px-2 text-slate-500">Or continue with</span></div>
            </div>

            <button type="button" className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg transition-colors text-sm uppercase tracking-wide">
              CREATE NEW ACCOUNT
            </button>
          </form>
        </div>

        {/* Social Proof Box (Bento Fragment) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl">
          <div className="bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border border-slate-800/50 flex items-center gap-3">
            <div className="bg-orange-500/20 p-1.5 rounded-lg"><span className="material-symbols-outlined text-orange-400 text-lg">groups</span></div>
            <div>
              <div className="text-white font-bold text-sm">No Laravel</div>
              <div className="text-slate-500 text-[10px]">Pure Native PHP Project.</div>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border border-slate-800/50 flex items-center gap-3">
            <div className="bg-orange-500/20 p-1.5 rounded-lg"><span className="material-symbols-outlined text-orange-400 text-lg">military_tech</span></div>
            <div>
              <div className="text-white font-bold text-sm">God Teachers</div>
              <div className="text-slate-500 text-[10px]">Unbelievable Mentorship.</div>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border border-slate-800/50 flex items-center gap-3">
            <div className="bg-orange-500/20 p-1.5 rounded-lg"><span className="material-symbols-outlined text-orange-400 text-lg">map</span></div>
            <div>
              <div className="text-white font-bold text-sm">Island Lore</div>
              <div className="text-slate-500 text-[10px]">Cebu Conquest Lore.</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-20 bg-slate-950/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-center w-full px-8 py-4 border-t border-slate-800 text-[10px]">
        <div className="text-orange-500 font-bold uppercase tracking-widest">© 2026 Batch21 [AM GI Offline]</div>
        <div className="flex gap-6 text-slate-500 font-medium">
          <span>ENCRYPTION: JWT-SHA256</span>
          <span className="hidden md:inline">|</span>
          <span>STATUS: ENFORCED</span>
        </div>
      </footer>
    </div>
  );
};