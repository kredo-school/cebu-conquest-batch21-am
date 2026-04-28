import React, { useState } from 'react';
import { useGameStore } from '../store';

interface LoginViewProps {
  onLogin: (name: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void; 
}

const INTEL_DATA: Record<string, { title: string; subtitle: string; body: string; icon: string }> = {
  "Native PHP Engine": {
    title: "NO LARAVEL POLICY",
    subtitle: "PURE NATIVE ARCHITECTURE",
    icon: "groups",
    body: "本プロジェクトは、モダンフレームワークの魔法に頼らず、生のPHPによる堅牢なサーバー構築を証明するための実証実験である。ブラックボックスを排除した完全な制御により、圧倒的な実行速度を実現している。"
  },
  "Mentorship Records": {
    title: "GOD TEACHERS",
    subtitle: "UNBELIEVABLE GUIDANCE",
    icon: "military_tech",
    body: "セブの戦地には、数々の開発を潜り抜けた伝説のメンターたちが存在する。彼らの指導は時に厳しく、時に慈愛に満き、未熟なオペレーターを一流のエンジニアへと鍛え上げる。"
  },
  "Mactan Archipelago Lore": {
    title: "ISLAND LORE",
    subtitle: "CEBU CONQUEST HISTORY",
    icon: "map",
    body: "1521年、マクタン島。ラプ＝ラプとマゼランの死闘からすべては始まった。この物語は、その魂を継承した現代のオペレーターたちが、セブの覇権を巡ってデジタルな領土を奪い合う戦記である。"
  }
};

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onOpenSettings, onOpenHelp }) => {
  const { setPlayerName, login, addLog } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);

  const [mode, setMode] = useState<'login' | 'recovery' | 'reset'>('login');
  const [inputMasterKey, setInputMasterKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [masterKey, setMasterKey] = useState('');
  const [activeIntel, setActiveIntel] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length === 0) {
      alert('Please enter your name.');
      return;
    }
    setIsLoading(true);
    if (isRegisterMode) {
      const generated = "CEBU-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      setMasterKey(generated);
      addLog(`🚨 EMERGENCY: Master Key generated for ${username}.`);
      setIsLoading(false);
      setShowKeyModal(true);
    } else {
      const success = await login(username, password);
      if (success) {
        if (typeof setPlayerName === 'function') setPlayerName(username);
        addLog(`🔐 Welcome Back, Commander ${username}.`);
        onLogin(username); 
      } else {
        alert('Authentication Failed.');
        setIsLoading(false);
      }
    }
  };

  const handleKeyValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMasterKey.length < 5) { alert('Invalid Security Key.'); return; }
    addLog("🔑 Master Key Accepted. Security Interlock Disengaged.");
    setMode('reset');
  };

  return (
    <div className="w-full h-full bg-slate-950 font-body text-slate-200 overflow-hidden flex flex-col relative">
      <div className="fixed inset-0 z-0 island-silhouette opacity-40" />
      <div className="fixed inset-0 z-10 tropical-flare pointer-events-none" />

      <header className="fixed top-0 left-0 w-full z-50 bg-transparent flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-black tracking-tighter text-orange-500 uppercase font-fix">Cebu Conquest</div>
        <div className="flex items-center gap-6">
          <button onClick={onOpenSettings} className="pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
            <span className="text-slate-400 material-symbols-outlined group-hover:text-orange-300">settings</span>
          </button>
          <button onClick={onOpenHelp} className="pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
            <span className="text-slate-400 material-symbols-outlined group-hover:text-cyan-400">help</span>
          </button>
        </div>
      </header>

      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-4 text-center">
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="inline-flex px-3 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold tracking-[0.2em] mb-2 uppercase font-fix">Security Terminal</div>
          <h1 className="text-4xl md:text-6xl font-black text-orange-500 tracking-tighter mb-1 font-fix uppercase">CEBU CONQUEST</h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide font-fix">Enter the battlefield.</p>
        </div>

        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden text-left mb-8 transition-all">
          <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${mode === 'login' ? (isRegisterMode ? 'bg-cyan-500' : 'bg-orange-500') : 'bg-red-500'}`}></div>

          {mode === 'recovery' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleKeyValidate}>
              <div className="mb-4">
                <h2 className="text-xl font-black text-white italic font-fix uppercase">Restore Access</h2>
                <p className="text-red-500 text-[10px] uppercase font-bold tracking-tight font-fix mt-2">Enter Master Key to bypass security</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-fix">Master Recovery Key</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">key</span>
                  <input type="text" required className="w-full bg-slate-950/50 border border-slate-800 text-orange-500 pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm font-mono tracking-widest" placeholder="CEBU-XXXX-XXXX" value={inputMasterKey} onChange={(e) => setInputMasterKey(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="w-full font-black py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg active:scale-95 transition-all text-sm uppercase font-fix">Validate Security Key</button>
              
              {/* 🚀 修正：Return to Login デザイン維持 ＋ バグ修正 */}
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setMode('login'); }} 
                className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg transition-colors text-sm uppercase tracking-wide flex justify-center items-center gap-2 mt-4"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                <span className="font-fix">Return to Login</span>
              </button>
            </form>

          ) : mode === 'reset' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={(e) => { e.preventDefault(); alert('Password Updated.'); setMode('login'); }}>
              <div className="mb-4 text-left">
                <h2 className="text-xl font-black text-white italic font-fix uppercase">New Credentials</h2>
                <p className="text-green-500 text-[10px] uppercase font-bold tracking-tight font-fix mt-2">Access Granted. Update password.</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-fix">Set New Password</label>
                <input type="password" required className="w-full bg-slate-950/50 border border-slate-800 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-fix" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <button type="submit" className="w-full font-black py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-lg uppercase text-sm font-fix">Update & Return</button>
            </form>

          ) : (
            <form className="space-y-4 text-left" onSubmit={handleAuthSubmit}>
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 font-fix">User ID</label>
                <div className="relative group text-left">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">person</span>
                  <input type="text" className="w-full bg-slate-950/50 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-fix" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 font-fix">Password</label>
                <div className="relative group text-left">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">lock</span>
                  <input type="password" className="w-full bg-slate-950/50 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-fix" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              {/* 🚀 修正：新規登録モードのときは Stay logged in / Forgot password? を隠す */}
              {!isRegisterMode && (
                <div className="flex justify-between items-center text-[10px]">
                  <label className="flex items-center text-slate-400 cursor-pointer font-fix hover:text-white transition-colors" onClick={() => setStayLoggedIn(!stayLoggedIn)}>
                    <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-all ${stayLoggedIn ? 'bg-orange-600 border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-slate-800 border-slate-700'}`}>
                      {stayLoggedIn && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                    </div>
                    Stay logged in
                  </label>
                  <span onClick={() => setMode('recovery')} className="text-orange-400 hover:text-orange-300 cursor-pointer font-fix underline-offset-4 hover:underline">Forgot password?</span>
                </div>
              )}

              <button type="submit" disabled={isLoading} className={`w-full font-black py-3 rounded-lg shadow-lg active:scale-95 transition-all text-sm uppercase text-white ${isRegisterMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'} ${isLoading ? 'opacity-70 cursor-wait' : ''}`}>
                <span className="font-fix">{isLoading ? 'PROCESSING...' : (isRegisterMode ? 'INITIATE REGISTRATION' : 'AUTHENTICATE')}</span>
                {!isLoading && <span className="material-symbols-outlined text-lg">{isRegisterMode ? 'person_add' : 'arrow_forward'}</span>}
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase text-center">
                  <span className="bg-slate-900 px-2 text-slate-500 font-fix">{isRegisterMode ? 'Already have an account?' : 'Or continue with'}</span>
                </div>
              </div>

              {/* デザイン維持：CREATE NEW ACCOUNT / BACK TO LOGIN */}
              <button 
                type="button" 
                onClick={() => setIsRegisterMode(!isRegisterMode)} 
                className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg transition-colors text-sm uppercase tracking-wide flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">{isRegisterMode ? 'login' : 'person_add'}</span>
                <span className="font-fix">{isRegisterMode ? 'BACK TO LOGIN' : 'CREATE NEW ACCOUNT'}</span>
              </button>
            </form>
          )}
        </div>

        {/* インテルカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl">
          {Object.entries(INTEL_DATA).map(([key, data]) => (
            <div key={key} onClick={() => { setActiveIntel(key); addLog(`📡 Accessing Intel: ${data.title}`); }}
              className="bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border border-slate-800/50 flex items-center gap-3 text-left cursor-pointer hover:bg-slate-800 hover:border-orange-500/30 hover:-translate-y-1 transition-all group">
              <div className="bg-orange-500/20 p-1.5 rounded-lg shrink-0 group-hover:bg-orange-500/40 transition-colors"><span className="material-symbols-outlined text-orange-400 text-lg">{data.icon}</span></div>
              <div className="flex flex-col text-left"><div className="text-white font-bold text-sm font-fix leading-none group-hover:text-orange-400">{data.title.replace(' POLICY', '').replace(' RECORDS', '')}</div><div className="text-slate-500 text-[10px] font-fix mt-1 uppercase">{data.subtitle}</div></div>
            </div>
          ))}
        </div>
      </main>

      {/* マスターキー発行モーダル */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/50 rounded-3xl p-8 relative shadow-[0_0_60px_rgba(239,68,68,0.3)]">
            <div className="text-center mb-6">
              <span className="material-symbols-outlined text-red-500 text-6xl mb-2 animate-pulse">warning</span>
              <h2 className="text-2xl font-black text-white italic font-fix uppercase">Master Key Issued</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest font-fix text-center">Commander, Save this key or lose your account forever.</p>
            </div>
            <div className="bg-black/60 rounded-2xl p-6 border border-red-500/20 text-center mb-8">
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-2 font-fix">Recovery Code</p>
              <div className="text-2xl font-mono font-black text-white tracking-[0.2em] break-all select-all">{masterKey}</div>
            </div>
            <button onClick={() => { setShowKeyModal(false); onLogin(username); }} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all uppercase tracking-widest text-xs font-fix shadow-lg active:scale-95">
              I HAVE SECURED MY KEY
            </button>
          </div>
        </div>
      )}

      {/* インテル詳細モーダル */}
      {activeIntel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-orange-500/30 rounded-3xl p-8 relative shadow-[0_0_50px_rgba(249,115,22,0.2)]">
            <button onClick={() => setActiveIntel(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><span className="material-symbols-outlined text-3xl">close</span></button>
            <div className="flex items-center gap-4 mb-6 text-left">
              <div className="bg-orange-500/20 p-3 rounded-2xl"><span className="material-symbols-outlined text-orange-400 text-4xl">{INTEL_DATA[activeIntel].icon}</span></div>
              <div className="text-left"><h2 className="text-2xl font-black text-white italic font-fix uppercase tracking-tighter">{INTEL_DATA[activeIntel].title}</h2><p className="text-orange-500 text-xs font-bold tracking-widest uppercase font-fix">{INTEL_DATA[activeIntel].subtitle}</p></div>
            </div>
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/5 text-left mb-8"><p className="text-slate-300 leading-relaxed font-medium font-fix text-sm">{INTEL_DATA[activeIntel].body}</p></div>
            <button onClick={() => setActiveIntel(null)} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-all uppercase tracking-widest text-xs font-fix shadow-lg">Acknowledge & Close</button>
          </div>
        </div>
      )}
    </div>
  );
};