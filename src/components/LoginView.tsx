import React, { useState, memo } from 'react';
import { useGameStore } from '../store';

interface LoginViewProps {
  onLogin: (name: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void; 
}

/**
 * 🛰️ LoginView: GDD v3.1 最終版
 * 修正内容：
 * 1. バッジをタイトルの真上に配置 (image_84925b.png 準拠)
 * 2. 登録モード：独自の質問・回答入力に対応
 * 3. スキャン演出：カード内を上から下へ移動するパルス線 (isLoading時)
 * 4. システムアラート：image_847f98.jpg の警告UIを完全再現
 */
export const LoginView: React.FC<LoginViewProps> = memo(({ onLogin, onOpenSettings, onOpenHelp }) => {
  const { login, addLog, setErrorMessage, errorMessage, hideError } = useGameStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 🚀 カスタム質問と回答
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage("IDとPASSWORDを入力してください。");
      return;
    }

    setIsLoading(true);
    addLog(isRegisterMode ? "📡 指令：新規アカウント登録中..." : "🔑 指令：認証シーケンス実行中...");

    try {
      // 🚀 ビデオ演出に合わせ、スキャンが走りきる時間を確保 (2.5秒)
      const scanAnimation = new Promise(resolve => setTimeout(resolve, 2500));
      
      let success = false;
      if (isRegisterMode) {
        const apiUrl = "http://localhost/cebu-conquest-batch21-am/api/login.php";
        const [res] = await Promise.all([
          fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username, password, 
              security_question: securityQuestion,
              security_answer: securityAnswer,
              action: 'register' 
            })
          }),
          scanAnimation
        ]);
        const data = await res.json();
        success = data.status === 'success';
        if (success) {
          setIsRegisterMode(false);
          addLog("✅ 登録完了。");
        } else {
          setErrorMessage(data.message || "SERVER ERROR: 接続に失敗しました。");
        }
      } else {
        const [loginSuccess] = await Promise.all([login(username, password), scanAnimation]);
        success = loginSuccess;
        if (success) {
          addLog(`🟢 お帰りなさい、コマンダー ${username}。`);
          onLogin(username);
        } else {
          setErrorMessage("SERVER ERROR: 接続に失敗しました。");
        }
      }
    } catch (error) {
      setErrorMessage("SERVER ERROR: 接続に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const themeColor = isRegisterMode ? 'cyan' : 'orange';

  return (
    <div className="bg-slate-950 font-body text-slate-200 overflow-hidden h-screen w-screen flex flex-col relative select-none">
      
      <div className="fixed inset-0 z-0 island-silhouette opacity-40"></div>
      <div className="fixed inset-0 z-10 tropical-flare pointer-events-none"></div>

      {/* 🛰️ Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-10 py-6">
        <div className="text-xl font-black tracking-[0.4em] text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          Cebu Conquest
        </div>
        <div className="flex items-center gap-8">
          <button onClick={onOpenSettings} className="text-slate-500 hover:text-white transition-all material-symbols-outlined text-2xl">settings</button>
          <button onClick={onOpenHelp} className="text-slate-500 hover:text-white transition-all material-symbols-outlined text-2xl">help</button>
        </div>
      </header>

      {/* 🎮 Main UI */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4">
        
        {/* 🚀 image_84925b.png / image_848da6.png 準拠：バッジをタイトルの上に配置 */}
        <div className="flex flex-col items-center mb-10 animate-fadeIn">
          <div className={`px-4 py-0.5 rounded-full border border-${themeColor}-500/50 bg-${themeColor}-500/10 text-${themeColor}-500 text-[10px] font-black tracking-[0.4em] mb-4 uppercase transition-all duration-500`}>
            {isRegisterMode ? "Establishing New Account" : "Welcome to the Archipelago"}
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-2 italic uppercase font-fix drop-shadow-[0_0_20px_rgba(234,88,12,0.6)]">
            CEBU<span className="text-orange-600">CONQUEST</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.5em] uppercase">Enter the battlefield.</p>
        </div>

        {/* 🔑 Auth Card */}
        <div className={`w-full max-w-sm bg-slate-900/60 backdrop-blur-2xl p-8 rounded-3xl border transition-all duration-500 shadow-2xl relative overflow-hidden ${isRegisterMode ? 'border-cyan-500/30' : 'border-white/5'}`}>
          
          {/* 🚀 スキャン線 (上から下へ移動) */}
          {isLoading && (
            <div className="absolute inset-0 z-50 pointer-events-none">
              <div className={`absolute left-0 w-full h-[2px] shadow-[0_0_15px_currentcolor] animate-scanLine ${isRegisterMode ? 'bg-cyan-400 text-cyan-400' : 'bg-orange-500 text-orange-500'}`} />
            </div>
          )}

          <form className="space-y-6" onSubmit={handleAuthSubmit}>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 tracking-widest uppercase ml-1">User ID</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-500 material-symbols-outlined text-lg">person</span>
                <input 
                  className="w-full bg-black/40 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-orange-600 transition-all outline-none text-sm font-bold" 
                  placeholder="Username or ID" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 tracking-widest uppercase ml-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-500 material-symbols-outlined text-lg">lock</span>
                <input 
                  className="w-full bg-black/40 border border-white/10 text-white pl-12 pr-12 py-3.5 rounded-xl focus:ring-2 focus:ring-orange-600 transition-all outline-none text-sm font-bold" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* 🚀 登録モード：独自Q&A入力 */}
            {isRegisterMode && (
              <div className="space-y-6 pt-2 border-t border-white/5 animate-slideIn">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-cyan-500 tracking-widest uppercase ml-1">Security Question</label>
                  <input 
                    className="w-full bg-black/40 border border-cyan-500/30 text-white px-5 py-3.5 rounded-xl focus:ring-2 focus:ring-cyan-600 transition-all outline-none text-sm font-bold" 
                    placeholder="Create Question" 
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-cyan-500 tracking-widest uppercase ml-1">Security Answer</label>
                  <input 
                    className="w-full bg-black/40 border border-cyan-500/30 text-white px-5 py-3.5 rounded-xl focus:ring-2 focus:ring-cyan-600 transition-all outline-none text-sm font-bold" 
                    placeholder="Enter Answer" 
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button 
              className={`w-full ${isRegisterMode ? 'bg-cyan-600' : 'bg-orange-600'} hover:opacity-90 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest`} 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : isRegisterMode ? 'Confirm Registration' : 'Enter Cebu (Login)'}
              <span className="material-symbols-outlined text-lg">{isRegisterMode ? 'how_to_reg' : 'arrow_forward'}</span>
            </button>

            <button 
              type="button" 
              onClick={() => setIsRegisterMode(!isRegisterMode)} 
              className="w-full text-[9px] font-black text-slate-600 hover:text-orange-500 uppercase tracking-[0.3em] transition-colors"
            >
              {isRegisterMode ? 'Back to Authentication' : 'Create New Command Account'}
            </button>
          </form>
        </div>
      </main>

      {/* 🚀 image_847f98.jpg 準拠：システムアラートUI */}
      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={hideError}>
          <div className="relative w-full max-w-xl bg-black border-2 border-orange-600 shadow-[0_0_50px_rgba(234,88,12,0.6)] p-10 flex items-center gap-8 group cursor-pointer overflow-hidden">
            {/* 右側の縦ライン演出 */}
            <div className="absolute top-0 right-6 h-full w-1.5 bg-orange-600/40"></div>
            {/* 警告アイコン */}
            <div className="w-20 h-20 border-2 border-orange-600 flex items-center justify-center rotate-45 shrink-0 bg-orange-600/10">
              <span className="material-symbols-outlined text-orange-500 -rotate-45 text-5xl font-bold">priority_high</span>
            </div>
            {/* メッセージエリア */}
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-black text-orange-600 tracking-[0.5em] uppercase">System Alert: Action Rejected</div>
              <div className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
                 {errorMessage}
              </div>
            </div>
            {/* 下部のプログレスバー演出 */}
            <div className="absolute bottom-0 left-0 h-1.5 bg-orange-600 animate-shrinkOut" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}

      <footer className="relative z-20 flex justify-between items-center w-full px-10 py-6 border-t border-white/5 font-inter text-[9px] text-slate-600">
        <div className="uppercase tracking-widest font-black">© 2026 Cebu Conquest Batch21 [AM]</div>
        <div className="flex gap-8 uppercase font-black">
          <span>Encryption: AES-256</span>
          <span>Status: Enforced</span>
        </div>
      </footer>

      <style>{`
        .island-silhouette {
          background-image: linear-gradient(to top, #020617 20%, transparent 100%), url(https://lh3.googleusercontent.com/aida-public/AB6AXuDSuA1bkSkNiW2UkyuB77YfeoYUjF4RMpZ16m0xEgLDdDSHOMLBYhyIIjnbVAs8TTaIwLQCxKn2JcrAKeV6fLP2c1f3RD7XyIYEoCG6uxUGrVpCcoYNd8wLip7vqftuMd8sYI25g2ZndcGE8mtGgO0cgQFS-A1Zam7Vc6wuHt1LxTjBSc4SH3c7_Qf9OZjd_C9D4Kv-0_cYa0hET5HdZEFNtdgOhbxVNTlrQqAaG-xc_U1BikHRjSwk2UCVtTkuiUQsSawMVVm16hY);
          background-size: cover;
          background-position: center bottom;
        }
        .tropical-flare { background: radial-gradient(circle at center, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0) 70%); }
        @keyframes scanLine {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scanLine { animation: scanLine 1.5s linear infinite; }
        @keyframes shrinkOut { from { width: 100%; } to { width: 0%; } }
        .animate-shrinkOut { animation: shrinkOut 4s linear forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
        .font-fix { line-height: 0.9; }
      `}</style>
    </div>
  );
});

export default LoginView;