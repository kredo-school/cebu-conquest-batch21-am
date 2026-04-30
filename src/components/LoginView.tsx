// src/components/LoginView.tsx
import React, { useState } from 'react';
import { useGameStore } from '../store';

interface LoginViewProps {
  onLogin: (name: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void; 
}

const INTEL_DATA: Record<string, { title: string; subtitle: string; body: string; icon: string }> = {
  "Native PHP Engine": { title: "NO LARAVEL POLICY", subtitle: "PURE NATIVE ARCHITECTURE", icon: "groups", body: "本プロジェクトは、モダンフレームワークの魔法に頼らず、生のPHPによる堅牢なサーバー構築を証明するための実証実験である。ブラックボックスを排除した完全な制御を実現している。" },
  "Mentorship Records": { title: "GOD TEACHERS", subtitle: "UNBELIEVABLE GUIDANCE", icon: "military_tech", body: "セブの戦地には、数々の開発を潜り抜けた伝説のメンターたちが存在する。彼らの指導は時に厳しく、時に慈愛に満き、未熟なオペレーターを一流のエンジニアへと鍛え上げる。" },
  "Mactan Archipelago Lore": { title: "ISLAND LORE", subtitle: "CEBU CONQUEST HISTORY", icon: "map", body: "1521年、マクタン島。ラプ＝ラプ とマゼランの死闘からすべては始まった。この物語は、その魂を継承した現代のオペレーターたちが、セブの覇権を巡ってデジタルな領土を奪い合う戦記である。" }
};

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onOpenSettings, onOpenHelp }) => {
  const { login, addLog } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState<'login' | 'recovery_user' | 'recovery_answer' | 'reset'>('login');
  const [customQuestion, setCustomQuestion] = useState(''); 
  const [securityAnswer, setSecurityAnswer] = useState(''); 
  const [activeIntel, setActiveIntel] = useState<string | null>(null); // 🚀 選択中のインテルID

  const validateInputs = (): boolean => {
    setErrorMsg(null);
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(username)) {
      setErrorMsg("User IDは英語か数字で入力してください。");
      return false;
    }
    if (!alphanumericRegex.test(password)) {
      setErrorMsg("Passwordは英語か数字で入力してください。");
      return false;
    }
    return true;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    setIsLoading(true);
    setErrorMsg(null);
    addLog(isRegisterMode ? "📡 Initiating registration protocol..." : "🔑 Authenticating credentials...");

    try {
      const minWait = new Promise(resolve => setTimeout(resolve, 2000));
      if (isRegisterMode) {
        const [res] = await Promise.all([
          fetch("http://localhost/Cebu_Conquest/cebu-conquest-batch21-am/api/login.php", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username, password, security_question: customQuestion, security_answer: securityAnswer, action: 'register' 
            })
          }),
          minWait
        ]);
        const data = await res.json();
        if (data.status === 'success') {
          setIsRegisterMode(false);
          setPassword('');
          alert("登録完了！");
        } else {
          setErrorMsg(data.message || "エラーが発生しました。");
        }
      } else {
        const [success] = await Promise.all([login(username, password), minWait]);
        if (success) {
          onLogin(username);
        } else {
          setErrorMsg("IDまたはPasswordが違います。");
        }
      }
    } catch (error) {
      setErrorMsg("SERVER ERROR: 通信に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 font-body text-slate-200 overflow-hidden flex flex-col relative">
      <div className="fixed inset-0 z-0 island-silhouette opacity-40" />
      <div className="fixed inset-0 z-10 tropical-flare pointer-events-none" />

      <header className="fixed top-0 left-0 w-full z-50 bg-transparent flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-black tracking-tighter text-orange-500 uppercase font-fix text-left">Cebu Conquest</div>
        <div className="flex items-center gap-6">
          <button onClick={onOpenSettings} className="group pointer-events-auto"><span className="text-slate-400 material-symbols-outlined group-hover:text-orange-300 transition-colors">settings</span></button>
          <button onClick={onOpenHelp} className="group pointer-events-auto"><span className="text-slate-400 material-symbols-outlined group-hover:text-cyan-400 transition-colors">help</span></button>
        </div>
      </header>

      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-4 text-center">
        {/* ログインフォーム部分（省略せず維持） */}
        <div className="mb-6 flex flex-col items-center">
          <div className="inline-flex px-3 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold tracking-widest mb-2 uppercase font-fix">
            {isLoading ? "System Scanning..." : "Security Terminal"}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-orange-500 tracking-tighter mb-1 font-fix uppercase">CEBU CONQUEST</h1>
        </div>

        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden text-left mb-8">
          {isLoading && <div className="absolute inset-0 z-30 pointer-events-none scanning-line" />}
          <form className="space-y-4" onSubmit={handleAuthSubmit}>
            {errorMsg && <div className="bg-red-500/10 border border-red-500/50 p-2 rounded text-[10px] text-red-400 font-bold animate-fadeIn">⚠️ {errorMsg}</div>}
            <input type="text" disabled={isLoading} className="w-full bg-slate-950/50 border border-slate-800 text-white px-4 py-2.5 rounded-lg outline-none text-sm font-fix" placeholder="User ID" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type={showPassword ? "text" : "password"} disabled={isLoading} className="w-full bg-slate-950/50 border border-slate-800 text-white px-4 py-2.5 rounded-lg outline-none text-sm font-fix" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" disabled={isLoading} className="w-full font-black py-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white uppercase text-sm font-fix active:scale-95 transition-all">
              {isLoading ? 'PROCESSING...' : 'ENTER CEBU (LOGIN)'}
            </button>
            <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)} className="w-full text-slate-500 text-[10px] uppercase font-bold hover:text-slate-300 transition-colors">
              {isRegisterMode ? 'Back to Login' : 'Create New Account'}
            </button>
          </form>
        </div>

        {/* 🚀 修正: Intel Cards (クリックできるように z-index と pointer-events を強化) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl relative z-30">
          {Object.entries(INTEL_DATA).map(([key, data]) => (
            <button 
              key={key} 
              onClick={() => { 
                setActiveIntel(key); 
                addLog(`📡 Accessing Intel: ${data.title}`); 
              }}
              className="bg-slate-900/40 backdrop-blur-sm p-4 rounded-xl border border-slate-800/50 flex items-center gap-3 text-left hover:bg-slate-800 hover:border-orange-500/30 hover:-translate-y-1 transition-all group pointer-events-auto shadow-lg"
            >
              <div className="bg-orange-500/20 p-2 rounded-lg shrink-0 group-hover:bg-orange-500/40 transition-colors">
                <span className="material-symbols-outlined text-orange-400 text-xl">{data.icon}</span>
              </div>
              <div className="flex flex-col text-left">
                <div className="text-white font-bold text-sm font-fix leading-none group-hover:text-orange-400">
                  {data.title.replace(' POLICY', '').replace(' RECORDS', '')}
                </div>
                <div className="text-slate-500 text-[9px] font-fix mt-1 uppercase tracking-tighter">
                  {data.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* 🚀 復活: インテル詳細表示モーダル */}
      {activeIntel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-orange-500/30 p-8 rounded-3xl max-w-lg shadow-[0_0_50px_rgba(249,115,22,0.2)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-orange-500/20 p-3 rounded-2xl">
                <span className="material-symbols-outlined text-orange-500 text-3xl">{INTEL_DATA[activeIntel].icon}</span>
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-black text-white italic font-fix uppercase leading-none">{INTEL_DATA[activeIntel].title}</h2>
                <p className="text-orange-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-1 font-fix">{INTEL_DATA[activeIntel].subtitle}</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed text-left font-fix mb-8 border-l-2 border-orange-500/30 pl-4">
              {INTEL_DATA[activeIntel].body}
            </p>
            <button 
              onClick={() => setActiveIntel(null)}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl border border-white/10 transition-all uppercase text-xs tracking-widest font-fix"
            >
              Close Intel
            </button>
          </div>
        </div>
      )}

      <footer className="relative z-20 bg-slate-950/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-center w-full px-8 py-4 border-t border-slate-800 text-[10px]">
        <div className="text-orange-500 font-bold uppercase tracking-widest font-fix">© 2026 Batch21 [AM GI Offline]</div>
        <div className="flex gap-6 text-slate-500 font-medium text-right items-center">
          <span className="font-fix">ENCRYPTION: JWT-SHA256</span>
          <span className="font-fix">STATUS: ENFORCED</span>
        </div>
      </footer>

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .scanning-line { height: 2px; background: #06b6d4; box-shadow: 0 0 15px #06b6d4; position: absolute; width: 100%; top: 0; animation: scan 2s linear infinite; }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
      `}</style>
    </div>
  );
};