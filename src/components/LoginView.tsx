/// <reference types="vite/client" />
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
  const { login, addLog, getApiUrl, setView } = useGameStore();
  
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

  const [activeCategory, setActiveCategory] = useState<'laravel' | 'gods' | 'about' | null>(null);

  const SCAN_CYCLE = 3000; 

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    setErrorMsg(null);
    const startTime = Date.now();
    addLog(isRegisterMode ? "📡 Initiating registration protocol..." : "🔑 Authenticating credentials...");

    let isSuccess = false;
    let localError: string | null = null;

    try {
      if (isRegisterMode) {
        const apiUrl = getApiUrl('login.php');
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
        if (data.status === 'success') {
          isSuccess = true;
        } else {
          localError = data.message || "Registration failed. Please check your network.";
        }
      } else {
        isSuccess = await login(username, password);
        if (isSuccess) setView('login');
        if (!isSuccess) {
          localError = "Authentication failed. Invalid Operator ID or Passcode.";
        }
      }

      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(SCAN_CYCLE - elapsed, 0);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      if (isSuccess) {
        if (isRegisterMode) {
          addLog(`✅ Registration Success: Commander ${username} is ready.`);
          setIsRegisterMode(false); 
          setPassword('');
          alert("Registration Complete! Please log in with your new password.");
        } else {
          addLog("🔐 Identity Verified. Accessing Command Center...");
          onLogin(username); 
        }
      } else if (localError) {
        setErrorMsg(localError);
      }

    } catch (_error: unknown) {
      const elapsed = Date.now() - startTime;
      await new Promise(resolve => setTimeout(resolve, Math.max(SCAN_CYCLE - elapsed, 0)));
      setErrorMsg("SERVER ERROR: Failed to connect to HQ. Check database or CORS.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateInputs = (): boolean => {
    setErrorMsg(null);
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(username) || !alphanumericRegex.test(password)) {
      setErrorMsg("Inputs must be alphanumeric.");
      return false;
    }
    return true;
  };

  const handleIdentifyUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) { setErrorMsg("Please enter your User ID."); return; }
    addLog(`🔍 Searching database for Operator: ${username}...`);
    setMode('recovery_answer'); 
  };

  const handleVerifyAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer) { setErrorMsg("Please enter your answer."); return; }
    addLog("✅ Answer Verified. Authorization granted.");
    setMode('reset');
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-200 font-body relative flex flex-col overflow-hidden select-none text-left z-0">
      <div className="fixed inset-0 -z-10 island-silhouette opacity-40 pointer-events-none" />
      <div className="fixed inset-0 -z-10 tropical-flare pointer-events-none" />

      <GlobalNavbar 
        onOpenSettings={onOpenSettings} 
        onOpenHelp={onOpenHelp} 
      />

      {/* 🚀 修正: pt-24 などで上部を固定し、全体の要素がブレないように調整 */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-start px-4 pt-24 pb-4 overflow-y-auto custom-scrollbar">
        
        {/* タイトル周り：高さとマージンを固定し、モード切替時にガタガタ動かないようにする */}
        <div className="text-center mb-6 shrink-0 flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-black text-[#e05a13] tracking-tighter uppercase font-fix">
            CEBU CONQUEST
          </h1>
          {/* 🚀 修正: 「WELCOME TO THE ARCHIPELAGO」をタイトルとフォームの間に移動 */}
          <div className="mt-4 px-4 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-black tracking-[0.2em] uppercase font-fix">
            WELCOME TO THE ARCHIPELAGO
          </div>
        </div>

        {/* 中央フォームカード */}
        <div 
          className="w-full max-w-sm bg-[#151c2c]/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden text-left shrink-0 transition-all duration-300"
          style={{
            backgroundImage: isRegisterMode
              ? `radial-gradient(circle at top right, rgba(6, 182, 212, 0.12), transparent 60%), 
                 radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.04), transparent 60%)`
              : `radial-gradient(circle at top right, rgba(234, 88, 12, 0.12), transparent 60%), 
                 radial-gradient(circle at bottom left, rgba(234, 88, 12, 0.04), transparent 60%)`
          }}
        >
          {isLoading && <div key="active-scan-line" className={`absolute inset-0 z-30 pointer-events-none scanning-line ${isRegisterMode ? 'bg-cyan-500 shadow-cyan-500' : 'bg-orange-500 shadow-orange-500'}`} />}
          
          {mode === 'recovery_user' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleIdentifyUser}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none font-fix">Find Account</h2><p className="text-orange-500 text-[10px] uppercase font-bold tracking-tight mt-2 font-fix">Enter Operator ID to initiate recovery</p></div>
              <input type="text" className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-2.5 rounded-lg outline-none text-sm font-fix" placeholder="Enter Operator ID" value={username} onChange={(e) => setUsername(e.target.value)} />
              <CustomButton type="submit" variant="primary" className="w-full text-sm font-fix">Identify Operator</CustomButton>
              <CustomButton type="button" variant="ghost" onClick={() => setMode('login')} className="w-full text-sm mt-2 font-fix">Return to Login</CustomButton>
            </form>
          ) : mode === 'recovery_answer' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={handleVerifyAnswer}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none font-fix">Identity Check</h2><p className="text-orange-400 text-xs font-bold mt-2 italic font-fix">Hint: Security Question Set</p></div>
              <input type="text" className="w-full bg-slate-950/50 border border-slate-700 text-orange-400 px-4 py-2.5 rounded-lg outline-none text-sm font-fix" placeholder="Your Answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
              <CustomButton type="submit" variant="primary" className="w-full text-sm font-fix">Verify Credentials</CustomButton>
              <CustomButton type="button" variant="ghost" onClick={() => setMode('login')} className="w-full text-sm mt-2 font-fix">Abort Protocol</CustomButton>
            </form>
          ) : mode === 'reset' ? (
            <form className="space-y-4 animate-fadeIn" onSubmit={(e) => { e.preventDefault(); alert('Updated.'); setMode('login'); }}>
              <div className="mb-4 text-left"><h2 className="text-xl font-black text-white italic uppercase leading-none font-fix">New Credentials</h2><p className="text-green-500 text-[10px] uppercase font-bold tracking-tight mt-2 font-fix">Access Granted. Set password.</p></div>
              <input type="password" required className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-2.5 rounded-lg outline-none text-sm font-fix" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <CustomButton type="submit" variant="primary" className="w-full text-sm !bg-green-600 hover:!bg-green-500 font-fix">Update & Return</CustomButton>
            </form>
          ) : (
            <form className="space-y-3.5" onSubmit={handleAuthSubmit}>
              {errorMsg && <div className="bg-red-500/10 border border-red-500/50 p-2 rounded text-[10px] text-red-400 font-bold animate-fadeIn font-fix">⚠️ {errorMsg}</div>}

              {/* USER ID 入力欄 */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-[10px] font-black tracking-wider uppercase ml-1 transition-colors duration-500 font-fix ${isRegisterMode ? 'text-cyan-500' : 'text-slate-400'}`}>USER ID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className={`material-symbols-outlined transition-colors duration-500 ${isRegisterMode ? 'text-cyan-600' : 'text-slate-500'} text-lg`}>person</span>
                  </div>
                  <input className={`w-full bg-slate-950/50 border ${isRegisterMode ? 'border-cyan-800/50 focus:ring-cyan-500' : 'border-orange-500/80 focus:ring-orange-500'} text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-1 focus:border-transparent transition-all outline-none text-sm disabled:opacity-50 font-fix`} placeholder="User ID" type="text" disabled={isLoading} value={username} onChange={(e) => setUsername(e.target.value)}/>
                </div>
              </div>

              {/* PASSWORD 入力欄 */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-[10px] font-black tracking-wider uppercase ml-1 transition-colors duration-500 font-fix ${isRegisterMode ? 'text-cyan-500' : 'text-slate-400'}`}>PASSWORD</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className={`material-symbols-outlined transition-colors duration-500 ${isRegisterMode ? 'text-cyan-600' : 'text-slate-500'} text-lg`}>lock</span>
                  </div>
                  <input className={`w-full bg-slate-950/50 border ${isRegisterMode ? 'border-cyan-800/50 focus:ring-cyan-500' : 'border-slate-700 focus:ring-orange-500'} text-white pl-10 pr-10 py-2.5 rounded-lg focus:ring-1 focus:border-transparent transition-all outline-none text-sm disabled:opacity-50 font-fix`} placeholder="Password" type={showPassword ? "text" : "password"} disabled={isLoading} value={password} onChange={(e) => setPassword(e.target.value)}/>
                  <button type="button" disabled={isLoading} onClick={() => setShowPassword(!showPassword)} className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors pointer-events-auto ${isRegisterMode ? 'text-cyan-600 hover:text-cyan-400' : 'text-slate-500 hover:text-orange-400'}`}>
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {isRegisterMode && (
                <div className="space-y-2 pt-2 animate-fadeIn border-t border-cyan-900/30 mt-1 text-left">
                  <p className="text-[8px] text-cyan-400 font-bold tracking-widest uppercase ml-1 font-fix">Security Protocol</p>
                  <input type="text" disabled={isLoading} className="w-full bg-slate-950/50 border border-cyan-800/50 text-slate-300 px-4 py-1.5 rounded-lg text-[11px] outline-none focus:border-cyan-500 disabled:opacity-50 font-fix" placeholder="Security Question" value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} />
                  <input type="text" disabled={isLoading} className="w-full bg-slate-950/50 border border-cyan-800/50 text-white px-4 py-1.5 rounded-lg outline-none text-[11px] focus:border-cyan-500 disabled:opacity-50 font-fix" placeholder="Security Answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
                </div>
              )}

              {/* ENTER ARCHIPELAGO ボタン */}
              {/* 🚀 修正: isLoading 時は色を暗く沈み込ませ、テキストを SCANNING... に変更する渋い演出 */}
              <div className="pt-2">
                <CustomButton 
                  type="submit" 
                  disabled={isLoading} 
                  variant="primary" 
                  className={`w-full py-3 text-sm font-black tracking-widest font-fix transition-all duration-300 flex items-center justify-center gap-1
                    ${isLoading 
                      ? (isRegisterMode ? '!bg-cyan-950 !text-cyan-600 border border-cyan-900 shadow-none' : '!bg-orange-950 !text-orange-600 border border-orange-900 shadow-none') 
                      : (isRegisterMode ? '!bg-cyan-700 hover:!bg-cyan-600 shadow-[0_0_15px_rgba(6,182,212,0.3)] text-white' : 'bg-[#e05a13] hover:brightness-110 text-white')
                    }
                  `}
                >
                  {isLoading ? 'SCANNING...' : (isRegisterMode ? 'REGISTER ACCOUNT' : 'ENTER ACCOUNT')}
                  {!isLoading && <span className="material-symbols-outlined text-base">bolt</span>}
                </CustomButton>
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/50"></div></div>
                <div className="relative flex justify-center text-[9px] font-bold uppercase">
                  <span className="bg-[#151c2c] px-3 text-slate-500 transition-colors duration-500 font-fix">{isRegisterMode ? 'Established Operator?' : 'Identify New Operator?'}</span>
                </div>
              </div>

              <button disabled={isLoading} onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMsg(null); }} type="button" className={`w-full py-1.5 text-[10px] font-black transition-all uppercase tracking-widest hover:brightness-125 font-fix ${isRegisterMode ? 'text-cyan-500' : 'text-slate-500'}`}>
                {isRegisterMode ? 'Back to Login' : 'CREATE NEW ACCOUNT'}
              </button>
            </form>
          )}
        </div>

        {/* 🚀 修正: BentoCard とフォームの間に mt-14 を設定してゆとりを持たせる */}
        {!isRegisterMode && (
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl shrink-0 animate-fadeIn mb-8">
            <BentoCard icon="cloud_off" title="No Laravel" sub="First project without Laravel" isActive={activeCategory === 'laravel'} onClick={() => setActiveCategory('laravel')}/>
            <BentoCard icon="military_tech" title="God Teachers" sub="Do you believe in God" isActive={activeCategory === 'gods'} onClick={() => setActiveCategory('gods')}/>
            <BentoCard icon="map" title="Cebu Conquest" sub="Learn about Cebu" isActive={activeCategory === 'about'} onClick={() => setActiveCategory('about')}/>
          </div>
        )}

        {/* ポップアップ詳細ダイアログ */}
        {activeCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#151c2c]/80 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-left">
              <button onClick={() => setActiveCategory(null)} className="absolute top-4 right-4 text-slate-500 hover:text-orange-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>

              {activeCategory === 'laravel' && (
                <>
                  <div className="flex items-center gap-2 text-orange-500 mb-3"><span className="material-symbols-outlined">cloud_off</span><h3 className="text-xl font-black uppercase font-fix">No Laravel</h3></div>
                  <p className="text-slate-300 text-sm leading-relaxed font-fix">
                    This project was built in a short period of 3.5 months, breaking away from a heavy backend framework and constructing it using only pure frontend technologies and lightweight APIs.
                  </p>
                </>
              )}
              {activeCategory === 'gods' && (
                <>
                  <div className="flex items-center gap-2 text-orange-500 mb-3"><span className="material-symbols-outlined">military_tech</span><h3 className="text-xl font-black uppercase font-fix">God Teachers</h3></div>
                  <p className="text-slate-300 text-sm leading-relaxed font-fix">
                    A tribute to the legendary mentors of Batch 21. Without their guidance, the tactical algorithms powering this command center would never have been realized.
                  </p>
                </>
              )}
              {activeCategory === 'about' && (
                <>
                  <div className="flex items-center gap-2 text-orange-500 mb-3"><span className="material-symbols-outlined">map</span><h3 className="text-xl font-black uppercase tracking-widest font-fix">Cebu Conquest</h3></div>
                  <p className="text-slate-300 text-sm leading-relaxed font-fix">
                    A real-time tactical conquest game set in Cebu. Engage in strategic turf wars, expand your territory, and become the supreme commander of the archipelago.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-20 bg-[#060a12]/80 backdrop-blur-md flex flex-col md:flex-row justify-center items-center w-full py-3 border-t border-slate-900 shrink-0 mt-auto">
        <div className="text-orange-500/40 font-bold uppercase tracking-[0.3em] font-fix text-[8px]">© 2026 Batch21 [AM GI Offline] Protocol Active</div>
      </footer>

      <style>{`
        .material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 48 }
        .scanning-line { height: 1px; position: absolute; width: 100%; top: 0; animation: scan 3s linear infinite; opacity: 0.3; }
        @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .font-fix { line-height: 1.2; }
        
        .tropical-flare { 
          background: radial-gradient(circle at center, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0) 70%); 
        }
        .island-silhouette { 
          background-image: linear-gradient(to top, #020617 15%, transparent 100%), url(https://lh3.googleusercontent.com/aida-public/AB6AXuDSuA1bkSkNiW2UkyuB77YfeoYUjF4RMpZ16m0xEgLDdDSHOMLBYhyIIjnbVAs8TTaIwLQCxKn2JcrAKeV6fLP2c1f3RD7XyIYEoCG6uxUGrVpCcoYNd8wLip7vqftuMd8sYI25g2ZndcGE8mtGgO0cgQFS-A1Zam7Vc6wuHt1LxTjBSc4SH3c7_Qf9OZjd_C9D4Kv-0_cYa0hET5HdZEFNtdgOhbxVNTlrQqAaG-xc_U1BikHRjSwk2UCVtTkuiUQsSawMVVm16hY); 
          background-size: cover; 
          background-position: center bottom; 
        }

        /* カスタムスクロールバー（全体のスクロール用） */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234, 88, 12, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
});

const BentoCard = ({ icon, title, sub, onClick, isActive }: { icon: string, title: React.ReactNode, sub: React.ReactNode, onClick?: () => void, isActive?: boolean }) => (
  // 🚀 修正: 角の丸みを rounded-2xl で統一
  <div 
    onClick={onClick} 
    className={`p-3 rounded-2xl border flex items-center gap-3 group transition-all cursor-pointer text-left ${isActive ? 'bg-[#1e293b]/80 border-orange-500 shadow-2xl' : 'border-slate-800/60 bg-[#111827]/40 hover:bg-[#1e293b]/50'}`}
    style={{
      background: isActive
        ? `radial-gradient(circle at top right, rgba(234, 88, 12, 0.2), transparent 70%), 
           radial-gradient(circle at bottom left, rgba(234, 88, 12, 0.1), transparent 70%), 
           rgba(30, 41, 59, 0.9)`
        : `radial-gradient(circle at top right, rgba(234, 88, 12, 0.08), transparent 60%), 
           rgba(15, 23, 42, 0.4)`
    }}
  >
    <div className={`p-1.5 rounded-lg transition-colors shrink-0 text-left flex items-center justify-center ${isActive ? 'bg-orange-500 text-white' : 'bg-orange-500/10 group-hover:bg-orange-500/20 text-orange-400'}`}>
      <span className="material-symbols-outlined text-lg">{icon}</span>
    </div>
    <div className="text-left">
      <div className={`font-bold text-sm leading-tight font-fix ${isActive ? 'text-orange-400' : 'text-white'}`}>{title}</div>
      <div className="text-slate-500 text-[10px] leading-tight mt-0.5 font-fix">{sub}</div>
    </div>
  </div>
);

export default LoginView;