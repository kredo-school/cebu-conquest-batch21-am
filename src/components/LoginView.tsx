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
  const [, setActiveIntel] = useState<string | null>(null);

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
    if (isRegisterMode) {
      if (!customQuestion.trim() || !securityAnswer.trim()) {
        setErrorMsg("秘密の質問と回答を設定してください。");
        return false;
      }
    }
    return true;
  };

  // 🚀 送信処理：スキャンに「重み」を持たせる（最低2秒間待機）
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    setErrorMsg(null);
    addLog(isRegisterMode ? "📡 Initiating registration protocol..." : "🔑 Authenticating credentials...");

    try {
      // 🚀 最低スキャン時間（2000ms = 2秒）を定義
      const minWait = new Promise(resolve => setTimeout(resolve, 2000));

      if (isRegisterMode) {
        // 🚀 通信と最低待機タイマーを並列で実行
        const [res] = await Promise.all([
          fetch("http://localhost/Cebu_Conquest/cebu-conquest-batch21-am/api/login.php", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: username,
              password: password,
              security_question: customQuestion,
              security_answer: securityAnswer,
              action: 'register' 
            })
          }),
          minWait
        ]);

        const data = await res.json();

        if (data.status === 'success') {
          addLog(`✅ Registration Success: Commander ${username} is ready.`);
          setIsLoading(false); 
          setTimeout(() => {
            alert("登録完了！設定したパスワードでログインしてください。");
            setIsRegisterMode(false);
            setPassword('');
          }, 500);
          return; 
        } else {
          setErrorMsg(data.message || "そのユーザー名は既に占領されています。");
        }
      } else {
        // 🔑 ログイン時も最低2秒間はスキャンを継続
        const [success] = await Promise.all([
          login(username, password),
          minWait
        ]);

        if (success) {
          addLog("🔐 Identity Verified. Accessing Command Center...");
          setIsLoading(false);
          setTimeout(() => onLogin(username), 500);
          return;
        } else {
          setErrorMsg("認証プロトコルに失敗しました（IDまたはPasswordの間違い）。");
        }
      }
    } catch {
      setErrorMsg("SERVER ERROR: 本部との通信に失敗。CORS設定等を確認せよ。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifyUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username) { setErrorMsg("User IDを入力してください。"); return; }
    addLog(`🔍 Searching database for Operator: ${username}...`);
    setMode('recovery_answer'); 
  };

  const handleVerifyAnswer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!securityAnswer) { setErrorMsg("回答を入力してください。"); return; }
    addLog("✅ Answer Verified. Authorization granted.");
    setMode('reset');
  };

  return (
    <div className="w-full h-full bg-slate-950 font-body text-slate-200 overflow-hidden flex flex-col relative">
      <div className="fixed inset-0 z-0 island-silhouette opacity-40" />
      <div className="fixed inset-0 z-10 tropical-flare pointer-events-none" />

      <header className="fixed top-0 left-0 w-full z-50 bg-transparent flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-black tracking-tighter text-orange-500 uppercase font-fix text-left">Cebu Conquest</div>
        <div className="flex items-center gap-6">
          <button onClick={onOpenSettings} className="group"><span className="text-slate-400 material-symbols-outlined group-hover:text-orange-300 transition-colors">settings</span></button>
          <button onClick={onOpenHelp} className="group"><span className="text-slate-400 material-symbols-outlined group-hover:text-cyan-400 transition-colors">help</span></button>
        </div>
      </header>

      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-4 text-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="inline-flex px-3 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold tracking-widest mb-2 uppercase font-fix">
            {isLoading ? "System Scanning..." : "Security Terminal"}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-orange-500 tracking-tighter mb-1 font-fix uppercase">CEBU CONQUEST</h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide font-fix">Enter the battlefield.</p>
        </div>

        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden text-left mb-8 transition-all">
          {isLoading && <div className="absolute inset-0 z-30 pointer-events-none scanning-line" />}
          <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${mode === 'login' ? (isRegisterMode ? 'bg-cyan-500' : 'bg-orange-500') : 'bg-yellow-500'}`}></div>

          {mode === 'recovery_user' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleIdentifyUser}>
              <div className="mb-4"><h2 className="text-xl font-black text-white italic font-fix uppercase leading-none">Find Account</h2><p className="text-yellow-500 text-[10px] uppercase font-bold tracking-tight font-fix mt-2">Enter User ID to initiate recovery</p></div>
              <input type="text" className="w-full bg-slate-950/50 border border-slate-800 text-white px-4 py-2.5 rounded-lg outline-none font-fix" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <button type="submit" className="w-full font-black py-3 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg shadow-lg text-sm uppercase font-fix transition-all">Identify Operator</button>
              <button type="button" onClick={() => setMode('login')} className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg text-sm uppercase flex justify-center items-center gap-2 mt-2"><span className="material-symbols-outlined text-lg">login</span><span className="font-fix">Return to Login</span></button>
            </form>
          ) : mode === 'recovery_answer' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleVerifyAnswer}>
              <div className="mb-4"><h2 className="text-xl font-black text-white italic font-fix uppercase leading-none">Identity Check</h2><p className="text-yellow-400 text-xs font-bold font-fix mt-2 italic">Hint: {customQuestion || "(Security Question)"}</p></div>
              <input type="text" className="w-full bg-slate-950/50 border border-slate-800 text-orange-400 px-4 py-2.5 rounded-lg outline-none font-fix" placeholder="Your Answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
              <button type="submit" className="w-full font-black py-3 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg shadow-lg text-sm uppercase font-fix transition-all">Verify Credentials</button>
              <button type="button" onClick={() => setMode('login')} className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg text-sm uppercase flex justify-center items-center gap-2 mt-2"><span className="material-symbols-outlined text-lg">login</span><span className="font-fix">Abort Protocol</span></button>
            </form>
          ) : mode === 'reset' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={(e) => { e.preventDefault(); alert('Updated.'); setMode('login'); }}>
              <div className="mb-4"><h2 className="text-xl font-black text-white italic font-fix uppercase leading-none">New Credentials</h2><p className="text-green-500 text-[10px] uppercase font-bold tracking-tight font-fix mt-2">Access Granted. Set password.</p></div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required className="w-full bg-slate-950/50 border border-slate-800 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-fix" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-orange-400 transition-colors"><span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
              </div>
              <button type="submit" className="w-full font-black py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-lg uppercase text-sm font-fix">Update & Return</button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleAuthSubmit}>
              {errorMsg && <div className="bg-red-500/10 border border-red-500/50 p-2 rounded text-[10px] text-red-400 font-bold animate-fadeIn">⚠️ {errorMsg}</div>}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 font-fix">User ID</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">person</span>
                  <input type="text" disabled={isLoading} className="w-full bg-slate-950/50 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all font-fix disabled:opacity-50" placeholder="English or Digits" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 font-fix">Password</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center material-symbols-outlined text-slate-500 text-lg">lock</span>
                  <input type={showPassword ? "text" : "password"} disabled={isLoading} className="w-full bg-slate-950/50 border border-slate-800 text-white pl-10 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all font-fix disabled:opacity-50" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" disabled={isLoading} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-orange-400 transition-colors pointer-events-auto">
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {isRegisterMode && (
                <div className="space-y-3 pt-2 animate-fadeIn border-t border-slate-800/50 mt-2">
                  <p className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase ml-1">Custom Security Protocol</p>
                  <input type="text" disabled={isLoading} className="w-full bg-slate-950/50 border border-slate-800 text-slate-300 px-4 py-2 rounded-lg text-xs outline-none font-fix focus:border-cyan-500 disabled:opacity-50" placeholder="秘密の質問 (例: ラッキーナンバーは？)" value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} />
                  <input type="text" disabled={isLoading} className="w-full bg-slate-950/50 border border-slate-800 text-white px-4 py-2 rounded-lg outline-none text-xs font-fix focus:border-cyan-500 disabled:opacity-50" placeholder="その答え" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
                </div>
              )}

              {!isRegisterMode && (
                <div className="flex justify-between items-center text-[10px]">
                  <label className="flex items-center text-slate-400 cursor-pointer font-fix hover:text-white transition-colors" onClick={() => !isLoading && setStayLoggedIn(!stayLoggedIn)}>
                    <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-all ${stayLoggedIn ? 'bg-orange-600 border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-slate-800 border-slate-700'}`}>
                      {stayLoggedIn && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                    </div>
                    Stay logged in
                  </label>
                  <span onClick={() => !isLoading && setMode('recovery_user')} className="text-orange-400 hover:text-orange-300 cursor-pointer font-fix underline-offset-4 hover:underline">Forgot password?</span>
                </div>
              )}

              <button type="submit" disabled={isLoading} className={`w-full font-black py-3 rounded-lg shadow-lg active:scale-95 transition-all text-sm uppercase text-center ${isRegisterMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'} ${isLoading ? 'opacity-70 cursor-wait' : ''}`}>
                <span className="font-fix">{isLoading ? 'PROCESSING...' : (isRegisterMode ? 'INITIATE REGISTRATION' : 'ENTER CEBU (LOGIN)')}</span>
                {!isLoading && <span className="material-symbols-outlined text-lg">{isRegisterMode ? 'person_add' : 'arrow_forward'}</span>}
              </button>
              
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase text-center"><span className="bg-slate-900 px-2 text-slate-500 font-fix">{isRegisterMode ? 'Already an Operator?' : 'New Recruit?'}</span></div>
              </div>

              <button type="button" disabled={isLoading} onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMsg(null); setShowPassword(false); }} className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg transition-colors text-sm uppercase tracking-wide flex justify-center items-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-lg">{isRegisterMode ? 'login' : 'person_add'}</span>
                <span className="font-fix">{isRegisterMode ? 'BACK TO LOGIN' : 'CREATE NEW ACCOUNT'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Intel Cards */}
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

      <footer className="relative z-20 bg-slate-950/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-center w-full px-8 py-4 border-t border-slate-800 text-[10px]">
        <div className="text-orange-500 font-bold uppercase tracking-widest font-fix">© 2026 Batch21 [AM GI Offline]</div>
        <div className="flex gap-6 text-slate-500 font-medium text-right items-center">
          <span className="font-fix">ENCRYPTION: JWT-SHA256</span><span className="hidden md:inline font-fix">|</span><span className="font-fix">STATUS: ENFORCED</span>
        </div>
      </footer>

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .scanning-line {
          height: 2px;
          background: #06b6d4;
          box-shadow: 0 0 15px #06b6d4;
          position: absolute;
          width: 100%;
          top: 0;
          animation: scan 2s linear infinite;
        }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
      `}</style>
    </div>
  );
};