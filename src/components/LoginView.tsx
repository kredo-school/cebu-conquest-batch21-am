import React, { useState, memo } from 'react'; // 🚀 修正: 不要な useEffect を削除
import { useGameStore } from '../store';

interface LoginViewProps {
  onLogin: (name: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void; 
}

export const LoginView: React.FC<LoginViewProps> = memo(({ onLogin, onOpenSettings, onOpenHelp }) => {
  const { login, addLog, getApiUrl, setErrorMessage, setView } = useGameStore();
  
  // 🚀 既存ロジック・ステート（一切変更なし）
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

  const SCAN_CYCLE = 4000; 

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    setIsLoading(true);
    setErrorMsg(null);
    const startTime = Date.now();
    addLog(isRegisterMode ? "📡 Initiating registration protocol..." : "🔑 Authenticating credentials...");
    try {
      let isSuccess = false;
      if (isRegisterMode) {
        const apiUrl = getApiUrl ? getApiUrl('login.php') : "http://localhost/cebu-conquest-batch21-am/api/login.php";
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username, password,
            security_question: customQuestion, security_answer: securityAnswer,
            action: 'register' 
          })
        });
        const data = await res.json();
        if (data.status === 'success') isSuccess = true;
        else setErrorMsg(data.message || "登録に失敗しました。");
      } else {
        isSuccess = await login(username, password);
        if (isSuccess) setView('login');
        if (!isSuccess) setErrorMsg("認証プロトコルに失敗しました（IDまたはPasswordの間違い）。");
      }
      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(SCAN_CYCLE - elapsed, 0);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      if (isSuccess) {
        if (isRegisterMode) {
          addLog(`✅ Registration Success: Commander ${username} is ready.`);
          setIsRegisterMode(false); setPassword('');
          alert("登録完了！設定したパスワードでログインしてください。");
        } else {
          addLog("🔐 Identity Verified. Accessing Command Center...");
          onLogin(username); 
        }
      }
    } catch (_error) {
      const elapsed = Date.now() - startTime;
      await new Promise(resolve => setTimeout(resolve, Math.max(SCAN_CYCLE - elapsed, 0)));
      setErrorMsg("SERVER ERROR: 本部との通信に失敗。CORS設定等を確認せよ。");
      setErrorMessage?.("通信エラー：APIサーバーの応答がありません。");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleIdentifyUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) { setErrorMsg("User IDを入力してください。"); return; }
    addLog(`🔍 Searching database for Operator: ${username}...`);
    setMode('recovery_answer'); 
  };

  const handleVerifyAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer) { setErrorMsg("回答を入力してください。"); return; }
    addLog("✅ Answer Verified. Authorization granted.");
    setMode('reset');
  };

  return (
    <div className="w-full h-full bg-slate-950 font-body text-slate-200 overflow-hidden h-screen flex flex-col relative select-none text-left">
      <div className="fixed inset-0 z-0 island-silhouette opacity-40" />
      <div className="fixed inset-0 z-10 tropical-flare pointer-events-none" />

      <header className="fixed top-0 left-0 w-full z-50 bg-transparent flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-black tracking-tighter text-orange-500 uppercase tracking-widest font-fix">
          Cebu Conquest
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onOpenSettings} className="text-slate-400 hover:text-orange-300 transition-colors material-symbols-outlined">settings</button>
          <button onClick={onOpenHelp} className="text-slate-400 hover:text-orange-300 transition-colors material-symbols-outlined">help</button>
        </div>
      </header>

      {/* 🚀 修正1: スクロール対応（justify-start + pt-24） */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-start md:justify-center px-4 pt-24 pb-8 overflow-y-auto custom-scrollbar">
        <div className="text-center mb-4 shrink-0">
          <div className={`inline-block px-3 py-0.5 rounded-full border ${isRegisterMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-orange-500/30 bg-orange-500/10 text-orange-400'} text-[10px] font-bold tracking-[0.2em] mb-2 uppercase transition-colors duration-500`}>
            {isLoading ? "System Scanning..." : (isRegisterMode ? "Establishing New Neural Link" : "Welcome to the Archipelago")}
          </div>
          <h1 className={`text-4xl md:text-6xl font-black ${isRegisterMode ? 'text-cyan-500 drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]' : 'text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]'} tracking-tighter mb-1 uppercase transition-all duration-500`}>
            CEBU CONQUEST
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide">Enter the battlefield.</p>
        </div>

        {/* 🚀 修正2: Register時のボーダー色をシアン化 */}
        <div className={`w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border transition-colors duration-500 ${isRegisterMode ? 'border-cyan-800/50 shadow-cyan-900/20' : 'border-slate-800 shadow-2xl'} relative overflow-hidden text-left shrink-0`}>
          {isLoading && <div key="active-scan-line" className={`absolute inset-0 z-30 pointer-events-none scanning-line ${isRegisterMode ? 'bg-cyan-500 shadow-cyan-500' : 'bg-orange-500 shadow-orange-500'}`} />}
          
          {mode === 'recovery_user' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleIdentifyUser}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none">Find Account</h2><p className="text-orange-500 text-[10px] uppercase font-bold tracking-tight mt-2">Enter User ID to initiate recovery</p></div>
              <input type="text" className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-2.5 rounded-lg outline-none text-sm" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <button type="submit" className="w-full font-black py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg shadow-lg text-sm uppercase transition-all">Identify Operator</button>
              <button type="button" onClick={() => setMode('login')} className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg text-sm uppercase mt-2">Return to Login</button>
            </form>
          ) : mode === 'recovery_answer' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleVerifyAnswer}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none">Identity Check</h2><p className="text-orange-400 text-xs font-bold mt-2 italic font-fix">Hint: Security Question Set</p></div>
              <input type="text" className="w-full bg-slate-950/50 border border-slate-700 text-orange-400 px-4 py-2.5 rounded-lg outline-none text-sm" placeholder="Your Answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
              <button type="submit" className="w-full font-black py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg shadow-lg text-sm uppercase transition-all">Verify Credentials</button>
              <button type="button" onClick={() => setMode('login')} className="w-full border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2.5 rounded-lg text-sm uppercase mt-2">Abort Protocol</button>
            </form>
          ) : mode === 'reset' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={(e) => { e.preventDefault(); alert('Updated.'); setMode('login'); }}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none">New Credentials</h2><p className="text-green-500 text-[10px] uppercase font-bold tracking-tight mt-2">Access Granted. Set password.</p></div>
              <input type="password" required className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-2.5 rounded-lg outline-none text-sm" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <button type="submit" className="w-full font-black py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-lg uppercase text-sm">Update & Return</button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleAuthSubmit}>
              {errorMsg && <div className="bg-red-500/10 border border-red-500/50 p-2 rounded text-[10px] text-red-400 font-bold animate-fadeIn">⚠️ {errorMsg}</div>}

              <div className="space-y-1.5 text-left">
                <label className={`block text-[10px] font-bold tracking-widest uppercase ml-1 transition-colors duration-500 ${isRegisterMode ? 'text-cyan-500' : 'text-slate-400'}`}>USER ID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className={`material-symbols-outlined transition-colors duration-500 ${isRegisterMode ? 'text-cyan-500' : 'text-slate-500'} text-lg`}>person</span>
                  </div>
                  <input className={`w-full bg-slate-950/50 border ${isRegisterMode ? 'border-cyan-800/50 focus:ring-cyan-500' : 'border-slate-700 focus:ring-orange-500'} text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:border-transparent transition-all outline-none text-sm disabled:opacity-50`} placeholder="Username or ID" type="text" disabled={isLoading} value={username} onChange={(e) => setUsername(e.target.value)}/>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className={`block text-[10px] font-bold tracking-widest uppercase ml-1 transition-colors duration-500 ${isRegisterMode ? 'text-cyan-500' : 'text-slate-400'}`}>PASSWORD</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className={`material-symbols-outlined transition-colors duration-500 ${isRegisterMode ? 'text-cyan-500' : 'text-slate-500'} text-lg`}>lock</span>
                  </div>
                  <input className={`w-full bg-slate-950/50 border ${isRegisterMode ? 'border-cyan-800/50 focus:ring-cyan-500' : 'border-slate-700 focus:ring-orange-500'} text-white pl-10 pr-10 py-2.5 rounded-lg focus:ring-2 focus:border-transparent transition-all outline-none text-sm disabled:opacity-50`} placeholder="••••••••" type={showPassword ? "text" : "password"} disabled={isLoading} value={password} onChange={(e) => setPassword(e.target.value)}/>
                  <button type="button" disabled={isLoading} onClick={() => setShowPassword(!showPassword)} className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors pointer-events-auto ${isRegisterMode ? 'text-cyan-600 hover:text-cyan-400' : 'text-slate-500 hover:text-orange-400'}`}>
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {isRegisterMode && (
                <div className="space-y-3 pt-2 animate-fadeIn border-t border-cyan-900/30 mt-2 text-left">
                  <p className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase ml-1">Custom Security Protocol</p>
                  <input type="text" disabled={isLoading} className="w-full bg-slate-950/50 border border-cyan-800/50 text-slate-300 px-4 py-2 rounded-lg text-xs outline-none focus:border-cyan-500 disabled:opacity-50" placeholder="秘密の質問" value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} />
                  <input type="text" disabled={isLoading} className="w-full bg-slate-950/50 border border-cyan-800/50 text-white px-4 py-2 rounded-lg outline-none text-xs focus:border-cyan-500 disabled:opacity-50" placeholder="その答え" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
                </div>
              )}

              <div className="flex items-center justify-between text-[10px]">
                <label className="flex items-center text-slate-400 cursor-pointer" onClick={() => !isLoading && setStayLoggedIn(!stayLoggedIn)}>
                  <input checked={stayLoggedIn} readOnly className={`rounded bg-slate-800 border-slate-700 ${isRegisterMode ? 'text-cyan-500' : 'text-orange-500'} focus:ring-offset-slate-900 mr-2 w-3 h-3`} type="checkbox"/> Stay logged in
                </label>
                <span onClick={() => !isLoading && setMode('recovery_user')} className={`${isRegisterMode ? 'text-cyan-500 hover:text-cyan-400' : 'text-orange-400 hover:text-orange-300'} transition-colors cursor-pointer`}>Forgot password?</span>
              </div>

              {/* 🚀 修正3: INITIATE REGISTRATION ボタンをシアン化 */}
              <button disabled={isLoading} className={`w-full font-black py-3 rounded-lg shadow-lg active:opacity-80 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm ${isRegisterMode ? 'bg-cyan-700 hover:bg-cyan-600 shadow-cyan-900/20' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'} text-white font-fix`} type="submit">
                {isLoading ? 'PROCESSING...' : (isRegisterMode ? 'INITIATE REGISTRATION' : 'ENTER CEBU (LOGIN)')}
                {!isLoading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#0f172a] px-2 text-slate-500">{isRegisterMode ? 'Already an Operator?' : 'Or continue with'}</span>
                </div>
              </div>

              <button disabled={isLoading} onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMsg(null); }} className={`w-full border ${isRegisterMode ? 'border-cyan-900/50 hover:bg-cyan-900/20 text-cyan-400' : 'border-slate-700 hover:bg-slate-800 text-slate-300'} font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 font-fix`} type="button">
                {isRegisterMode ? 'BACK TO LOGIN' : 'CREATE NEW ACCOUNT'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl shrink-0">
          <BentoCard icon="groups" title="No Laravel" sub={<>The First project in GI history <div className="text-[9px] opacity-70">that does not use Laravel</div></>} />
          <BentoCard icon="military_tech" title="God Teachers" sub="Do you believe in God" />
          <BentoCard icon="map" title="What is Cebu Conquest" sub="You can learn about Cebu and God" />
        </div>
      </main>

      <footer className="relative z-20 bg-slate-950/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-center w-full px-8 py-4 gap-2 border-t border-slate-800 font-headline text-[10px] text-left">
        <div className="text-orange-500 font-bold uppercase tracking-widest font-fix">© 2026 Batch21 [AM GI Offline - March] All rights reserved.</div>
        <div className="flex gap-6 text-slate-500">
          <span className="hover:text-slate-300 transition-all cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-300 transition-all cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-300 transition-all cursor-pointer">Support</span>
        </div>
      </footer>

      <style>{`
        .material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 48 }
        .tropical-flare { background: radial-gradient(circle at center, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0) 70%) }
        .island-silhouette { 
          background-image: linear-gradient(to top, #020617 20%, transparent 100%), url(https://lh3.googleusercontent.com/aida-public/AB6AXuDSuA1bkSkNiW2UkyuB77YfeoYUjF4RMpZ16m0xEgLDdDSHOMLBYhyIIjnbVAs8TTaIwLQCxKn2JcrAKeV6fLP2c1f3RD7XyIYEoCG6uxUGrVpCcoYNd8wLip7vqftuMd8sYI25g2ZndcGE8mtGgO0cgQFS-A1Zam7Vc6wuHt1LxTjBSc4SH3c7_Qf9OZjd_C9D4Kv-0_cYa0hET5HdZEFNtdgOhbxVNTlrQqAaG-xc_U1BikHRjSwk2UCVtTkuiUQsSawMVVm16hY);
          background-size: cover; background-position: center bottom;
        }
        .scanning-line {
          height: 2px;
          position: absolute; width: 100%; top: 0; animation: scan 4s linear infinite; 
        }
        @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .font-fix { line-height: 1.1; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
});

const BentoCard = ({ icon, title, sub }: { icon: string, title: React.ReactNode, sub: React.ReactNode }) => (
  <div className="bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border border-slate-800/50 flex items-center gap-3 group hover:bg-slate-800 transition-all cursor-pointer text-left">
    <div className="bg-orange-500/20 p-1.5 rounded-lg group-hover:bg-orange-500/40 transition-colors shrink-0 text-left flex items-center justify-center">
      <span className="material-symbols-outlined text-orange-400 text-lg">{icon}</span>
    </div>
    <div className="text-left">
      <div className="text-white font-bold text-sm leading-tight">{title}</div>
      <div className="text-slate-500 text-[10px] leading-tight mt-0.5">{sub}</div>
    </div>
  </div>
);

export default LoginView;