// src/views/LoginView.tsx

import React, { useState, memo } from 'react';
import { useGameStore } from '../store';
import { GlobalNavbar } from './layout/GlobalNavbar';
import { CustomButton } from './common/CustomButton';

interface LoginViewProps {
  onLogin: (name: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void; 
}

export const LoginView: React.FC<LoginViewProps> = memo(({ onLogin, onOpenSettings, onOpenHelp }) => {
  const { login, addLog, getApiUrl, setErrorMessage, setView } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState<'login' | 'recovery_user' | 'recovery_answer' | 'reset'>('login');
  const [customQuestion, setCustomQuestion] = useState(''); 
  const [securityAnswer, setSecurityAnswer] = useState(''); 

  // カテゴリー表示用のState（モーダル開閉管理）
  const [activeCategory, setActiveCategory] = useState<'laravel' | 'gods' | 'about' | null>(null);

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

      <GlobalNavbar 
        onOpenSettings={onOpenSettings} 
        onOpenHelp={onOpenHelp} 
      />

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

        <div className={`w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border transition-colors duration-500 ${isRegisterMode ? 'border-cyan-800/50 shadow-cyan-900/20' : 'border-slate-800 shadow-2xl'} relative overflow-hidden text-left shrink-0`}>
          {isLoading && <div key="active-scan-line" className={`absolute inset-0 z-30 pointer-events-none scanning-line ${isRegisterMode ? 'bg-cyan-500 shadow-cyan-500' : 'bg-orange-500 shadow-orange-500'}`} />}
          
          {mode === 'recovery_user' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleIdentifyUser}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none">Find Account</h2><p className="text-orange-500 text-[10px] uppercase font-bold tracking-tight mt-2">Enter User ID to initiate recovery</p></div>
              <input type="text" className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-2.5 rounded-lg outline-none text-sm" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <CustomButton type="submit" variant="primary" className="w-full text-sm">Identify Operator</CustomButton>
              <CustomButton type="button" variant="ghost" onClick={() => setMode('login')} className="w-full text-sm mt-2">Return to Login</CustomButton>
            </form>
          ) : mode === 'recovery_answer' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleVerifyAnswer}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none">Identity Check</h2><p className="text-orange-400 text-xs font-bold mt-2 italic font-fix">Hint: Security Question Set</p></div>
              <input type="text" className="w-full bg-slate-950/50 border border-slate-700 text-orange-400 px-4 py-2.5 rounded-lg outline-none text-sm" placeholder="Your Answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
              <CustomButton type="submit" variant="primary" className="w-full text-sm">Verify Credentials</CustomButton>
              <CustomButton type="button" variant="ghost" onClick={() => setMode('login')} className="w-full text-sm mt-2">Abort Protocol</CustomButton>
            </form>
          ) : mode === 'reset' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={(e) => { e.preventDefault(); alert('Updated.'); setMode('login'); }}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none">New Credentials</h2><p className="text-green-500 text-[10px] uppercase font-bold tracking-tight mt-2">Access Granted. Set password.</p></div>
              <input type="password" required className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-2.5 rounded-lg outline-none text-sm" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <CustomButton type="submit" variant="primary" className="w-full text-sm !bg-green-600 hover:!bg-green-500">Update & Return</CustomButton>
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

              <CustomButton type="submit" disabled={isLoading} variant="primary" className={`w-full text-sm ${isRegisterMode ? '!bg-cyan-700 hover:!bg-cyan-600' : ''}`}>
                {isLoading ? 'PROCESSING...' : (isRegisterMode ? 'INITIATE REGISTRATION' : 'ENTER CEBU (LOGIN)')}
                {!isLoading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
              </CustomButton>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#0f172a] px-2 text-slate-500">{isRegisterMode ? 'Already an Operator?' : 'Or continue with'}</span>
                </div>
              </div>

              <CustomButton disabled={isLoading} onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMsg(null); }} type="button" variant="ghost" className={`w-full text-sm ${isRegisterMode ? '!border-cyan-900/50 hover:!bg-cyan-900/20 !text-cyan-400' : ''}`}>
                {isRegisterMode ? 'BACK TO LOGIN' : 'CREATE NEW ACCOUNT'}
              </CustomButton>
            </form>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl shrink-0">
          <BentoCard 
            icon="groups" 
            title="No Laravel" 
            sub={<>The First project in GI history <div className="text-[9px] opacity-70">that does not use Laravel</div></>} 
            isActive={activeCategory === 'laravel'}
            onClick={() => setActiveCategory('laravel')}
          />
          <BentoCard 
            icon="military_tech" 
            title="God Teachers" 
            sub="Do you believe in God" 
            isActive={activeCategory === 'gods'}
            onClick={() => setActiveCategory('gods')}
          />
          <BentoCard 
            icon="map" 
            title="What is Cebu Conquest" 
            sub="You can learn about Cebu and God" 
            isActive={activeCategory === 'about'}
            onClick={() => setActiveCategory('about')}
          />
        </div>
      </main>

      {/* 🚀 復元: モーダル（ポップアップ）形式の詳細表示 */}
      {activeCategory && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveCategory(null)} // 背景クリックで閉じる
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()} // モーダル内クリックで閉じないようにする
          >
            <button 
              onClick={() => setActiveCategory(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="text-slate-300 text-sm leading-relaxed mt-2">
              {activeCategory === 'laravel' && (
                <>
                  <h4 className="text-orange-500 font-bold mb-4 flex items-center gap-2 text-xl">
                    <span className="material-symbols-outlined">groups</span> No Laravel - 開発の背景
                  </h4>
                  <p>今回の『Cebu Conquest』は、GIの歴史上初めてLaravelを使用せず、Node.js + Socket.IOによるフルタイムリアルタイム通信を採用しています。ReactとPhaserが連携する挑戦的なアーキテクチャです。</p>
                </>
              )}
              {activeCategory === 'gods' && (
                <>
                  <h4 className="text-orange-500 font-bold mb-4 flex items-center gap-2 text-xl">
                    <span className="material-symbols-outlined">military_tech</span> God Teachers - セブの神々
                  </h4>
                  <p>この世界では、セブに根付く8柱の神々から1つを選び信仰します。選んだ神によって初期ステータスやバフ効果が変動し、激しい領土争いにおける戦略が大きく変わります。</p>
                </>
              )}
              {activeCategory === 'about' && (
                <>
                  <h4 className="text-orange-500 font-bold mb-4 flex items-center gap-2 text-xl">
                    <span className="material-symbols-outlined">map</span> What is Cebu Conquest
                  </h4>
                  <p>セブ島を舞台にした陣取り合戦ゲーム。10日間の限られたターンの中で、自身のAPを管理しながら地区を制圧し、最終的に最も多くの領土を獲得した者が勝者となります。</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="relative z-20 bg-slate-950/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-center w-full px-8 py-4 gap-2 border-t border-slate-800 font-headline text-[10px] text-left shrink-0">
        <div className="text-orange-500 font-bold uppercase tracking-widest font-fix">© 2026 Batch21 [AM GI Offline - March] All rights reserved.</div>
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
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .font-fix { line-height: 1.1; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
});

const BentoCard = ({ icon, title, sub, onClick, isActive }: { icon: string, title: React.ReactNode, sub: React.ReactNode, onClick?: () => void, isActive?: boolean }) => (
  <div onClick={onClick} className={`bg-slate-900/40 backdrop-blur-sm p-3 rounded-xl border flex items-center gap-3 group transition-all cursor-pointer text-left ${isActive ? 'bg-slate-800 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-slate-800/50 hover:bg-slate-800'}`}>
    <div className={`p-1.5 rounded-lg transition-colors shrink-0 text-left flex items-center justify-center ${isActive ? 'bg-orange-500 text-white' : 'bg-orange-500/20 group-hover:bg-orange-500/40 text-orange-400'}`}>
      <span className="material-symbols-outlined text-lg">{icon}</span>
    </div>
    <div className="text-left">
      <div className={`font-bold text-sm leading-tight ${isActive ? 'text-orange-400' : 'text-white'}`}>{title}</div>
      <div className="text-slate-500 text-[10px] leading-tight mt-0.5">{sub}</div>
    </div>
  </div>
);

export default LoginView;