import React, { useState } from 'react';
import { useGameStore } from '../store';

interface LoginViewProps {
  onLogin: (name: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void; 
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onOpenSettings, onOpenHelp }) => {
  const { setPlayerName, login, addLog } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length === 0) {
      alert('Please enter your name.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegisterMode) {
        if (typeof setPlayerName === 'function') setPlayerName(username);
        addLog(`📝 New Operator Registered: Welcome ${username}`);
        onLogin(username); 
      } else {
        const success = await login(username, password);
        if (success) {
          if (typeof setPlayerName === 'function') setPlayerName(username);
          addLog(`🔐 Authentication Successful: Welcome ${username}`);
          onLogin(username); 
        } else {
          alert('Authentication Failed. Check your name or password.');
        }
      }
    } catch (error) {
      alert('Connection Error to Fortified Server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 font-body text-slate-200 overflow-hidden flex flex-col relative">
      {/* 背景演出 */}
      <div className="fixed inset-0 z-0 island-silhouette opacity-40" />
      <div className="fixed inset-0 z-10 tropical-flare pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-transparent flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-black tracking-tighter text-orange-500 uppercase tracking-widest text-left font-fix">
          Cebu Conquest
        </div>
        <div className="flex items-center gap-6">
          {/* 設定ボタン */}
          <button 
            onClick={onOpenSettings}
            className="pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
            title="SETTINGS"
          >
            <span className="text-slate-400 material-symbols-outlined cursor-pointer group-hover:text-orange-300 transition-colors">
              settings
            </span>
          </button>
          
          {/* ヘルプボタン */}
          <button 
            onClick={onOpenHelp}
            className="pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
            title="HOW TO PLAY"
          >
            <span className="text-slate-400 material-symbols-outlined cursor-pointer group-hover:text-cyan-400 transition-colors">
              help
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-4 text-center">
        {/* Logo Section */}
        {/* 🚀 修正：font-fixの回り込みを防ぐため、flex-colとitems-centerを明示 */}
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="inline-flex px-3 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold tracking-[0.2em] mb-2 uppercase font-fix">
            Welcome to the Archipelago
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-orange-500 tracking-tighter mb-1 drop-shadow-[0_0_30px_rgba(249,115,22,0.5)] font-fix">
            CEBU CONQUEST
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide font-fix">Enter the battlefield.</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden text-left">
          <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${isRegisterMode ? 'bg-cyan-500' : 'bg-orange-500'}`}></div>

          <form className="space-y-4 text-left" onSubmit={handleSubmit}>
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 font-fix">User ID</label>
              <div className="relative group text-left">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">person</span>
                <input 
                  type="text" 
                  className="w-full bg-slate-950/50 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all font-fix"
                  placeholder="Username or ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 font-fix">Password</label>
              <div className="relative group text-left">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">lock</span>
                <input 
                  type="password" 
                  className="w-full bg-slate-950/50 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all font-fix"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {!isRegisterMode && (
              <div className="flex items-center justify-between text-[10px]">
                <label className="flex items-center text-slate-400 cursor-pointer font-fix">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-orange-500 mr-2 w-3 h-3"/> Stay logged in
                </label>
                <span className="text-orange-400 hover:text-orange-300 cursor-pointer font-fix">Forgot password?</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full font-black py-3 rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm uppercase text-center
                ${isRegisterMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'}
                ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              <span className="font-fix">
                {isLoading 
                  ? (isRegisterMode ? 'REGISTERING...' : 'ESTABLISHING LINK...') 
                  : (isRegisterMode ? 'REGISTER ACCOUNT' : 'ENTER CEBU (LOGIN)')}
              </span>
              {!isLoading && <span className="material-symbols-outlined text-lg">{isRegisterMode ? 'person_add' : 'arrow_forward'}</span>}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-950 px-2 text-slate-500 font-fix">
                  {isRegisterMode ? 'Already have an account?' : 'Or continue with'}
                </span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg transition-colors text-sm uppercase tracking-wide flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">{isRegisterMode ? 'login' : 'person_add'}</span>
              <span className="font-fix">{isRegisterMode ? 'BACK TO LOGIN' : 'CREATE NEW ACCOUNT'}</span>
            </button>
          </form>
        </div>

        {/* Social Proof Box */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl">
          <div className="bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border border-slate-800/50 flex items-center gap-3 text-left">
            <div className="bg-orange-500/20 p-1.5 rounded-lg shrink-0"><span className="material-symbols-outlined text-orange-400 text-lg">groups</span></div>
            <div className="flex flex-col text-left">
              <div className="text-white font-bold text-sm font-fix leading-none">No Laravel</div>
              <div className="text-slate-500 text-[10px] font-fix mt-1">Pure Native PHP Project.</div>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border border-slate-800/50 flex items-center gap-3 text-left">
            <div className="bg-orange-500/20 p-1.5 rounded-lg shrink-0"><span className="material-symbols-outlined text-orange-400 text-lg">military_tech</span></div>
            <div className="flex flex-col text-left">
              <div className="text-white font-bold text-sm font-fix leading-none">God Teachers</div>
              <div className="text-slate-500 text-[10px] font-fix mt-1">Unbelievable Mentorship.</div>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border border-slate-800/50 flex items-center gap-3 text-left">
            <div className="bg-orange-500/20 p-1.5 rounded-lg shrink-0"><span className="material-symbols-outlined text-orange-400 text-lg">map</span></div>
            <div className="flex flex-col text-left">
              <div className="text-white font-bold text-sm font-fix leading-none">Island Lore</div>
              <div className="text-slate-500 text-[10px] font-fix mt-1">Cebu Conquest Lore.</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-20 bg-slate-950/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-center w-full px-8 py-4 border-t border-slate-800 text-[10px]">
        <div className="text-orange-500 font-bold uppercase tracking-widest text-left font-fix">© 2026 Batch21 [AM GI Offline]</div>
        <div className="flex gap-6 text-slate-500 font-medium text-right items-center">
          <span className="font-fix">ENCRYPTION: JWT-SHA256</span>
          <span className="hidden md:inline font-fix">|</span>
          <span className="font-fix">STATUS: ENFORCED</span>
        </div>
      </footer>
    </div>
  );
};