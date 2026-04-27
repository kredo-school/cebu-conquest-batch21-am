import React, { useState } from 'react';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager';

interface SettingsViewProps {
  onBack: () => void;
}

type TabType = 'sound' | 'gameplay' | 'notifications' | 'account';

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const { playerName, myId, bgmVolume, setBgmVolume, seVolume, setSeVolume } = useGameStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('sound');

  // --- 状態管理 ---
  const [masterVol, setMasterVol] = useState(80);
  const [quality, setQuality] = useState('high');
  const [fps, setFps] = useState('60 FPS');
  const [allowRequests, setAllowRequests] = useState(true);
  const [allowEvents, setAllowEvents] = useState(true);

  const handleLogout = () => {
    if (window.confirm("ログアウトしてタイトルに戻りますか？")) {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] bg-[#23180f] text-slate-100 font-display overflow-y-auto custom-scrollbar">
      {/* Background Decor: デザインにあったBlur演出 */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden text-left">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#fa7000]/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-green-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header: デザイン通りのUIDと名前表示 */}
        <header className="flex items-center justify-between border-b border-[#fa7000]/20 px-6 py-4 lg:px-40 bg-[#23180f]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center justify-center p-2 hover:bg-[#fa7000]/10 rounded-full transition-colors active:scale-90">
              <span className="material-symbols-outlined text-[#fa7000] text-3xl">arrow_back</span>
            </button>
            <div className="flex flex-col text-left">
              {/* 🚀 修正：font-fixを追加 */}
              <h1 className="text-xl font-bold tracking-tight text-white uppercase leading-none font-fix">Cebu Conquest</h1>
              {/* 🚀 修正：font-fixを追加 */}
              <p className="text-[10px] text-[#fa7000] font-black tracking-widest uppercase mt-1 font-fix">Settings / 設定</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              {/* 🚀 修正：font-fixを追加 */}
              <p className="text-[10px] text-slate-400 font-mono uppercase font-fix">UID: {myId?.substring(0,8).toUpperCase() || '82739405'}</p>
              {/* 🚀 修正：font-fixを追加 */}
              <p className="text-sm font-bold text-white italic font-fix">{playerName || "Operator"}</p>
            </div>
            <div className="size-10 rounded-full border-2 border-[#fa7000] overflow-hidden bg-slate-800">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${playerName}`} alt="avatar" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 lg:px-40 max-w-6xl mx-auto w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Sidebar Navigation */}
            <div className="hidden lg:flex flex-col col-span-3 gap-2">
              <NavButton active={activeTab === 'sound'} onClick={() => setActiveTab('sound')} icon="volume_up" label="サウンド" />
              <NavButton active={activeTab === 'gameplay'} onClick={() => setActiveTab('gameplay')} icon="sports_esports" label="ゲームプレイ" />
              <NavButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon="notifications" label="通知設定" />
              <NavButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon="account_circle" label="アカウント" />
            </div>

            {/* Main Content Area */}
            <div className="col-span-1 lg:col-span-9 space-y-10">
              
              {/* --- SOUND SECTION --- */}
              {activeTab === 'sound' && (
                <section className="bg-white/5 rounded-xl p-8 border border-white/10 backdrop-blur-sm animate-fadeIn">
                  <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4 text-left">
                    <span className="material-symbols-outlined text-[#fa7000]">volume_up</span>
                    {/* 🚀 修正：font-fixを追加 */}
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider font-fix">Sound Settings</h2>
                  </div>
                  <div className="space-y-10">
                    <VolumeSlider label="マスター音量" value={masterVol} onChange={setMasterVol} />
                    <VolumeSlider label="BGM音量" value={Math.round(bgmVolume * 100)} onChange={(v: number) => { setBgmVolume(v/100); SoundManager.setBgmVolume(v/100); }} />
                    <VolumeSlider label="SE音量" value={Math.round(seVolume * 100)} onChange={(v: number) => { setSeVolume(v/100); SoundManager.playSe('click'); }} />
                  </div>
                </section>
              )}

              {/* --- GAMEPLAY SECTION --- */}
              {activeTab === 'gameplay' && (
                <section className="bg-white/5 rounded-xl p-8 border border-white/10 backdrop-blur-sm animate-fadeIn text-left">
                  <header className="mb-10">
                    {/* 🚀 修正：font-fixを追加 */}
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase leading-none font-fix">Gameplay</h2>
                    {/* 🚀 修正：font-fixを追加 */}
                    <p className="text-[#fa7000]/70 mt-2 font-medium italic text-sm font-fix">Fine-tune your tactical experience</p>
                  </header>
                  <div className="space-y-10">
                    <div className="space-y-4">
                      {/* 🚀 修正：font-fixを追加 */}
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-fix">Graphics Quality</h3>
                      <div className="flex h-12 w-full items-center justify-center rounded-xl bg-white/5 p-1 border border-white/10">
                        {['low', 'medium', 'high', 'ultra'].map((q) => (
                          <label key={q} className={`flex cursor-pointer h-full grow items-center justify-center rounded-lg px-2 text-[10px] font-black transition-all uppercase font-fix ${quality === q ? 'bg-[#fa7000] text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}>
                            {q}
                            <input type="radio" className="hidden" value={q} checked={quality === q} onChange={(e) => setQuality(e.target.value)} />
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* 🚀 修正：font-fixを追加 */}
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-fix">Frame Rate Limit</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {['30 FPS', '60 FPS', 'Unlimited'].map((f) => (
                          <button key={f} onClick={() => setFps(f)} className={`py-3 rounded-xl border transition-all text-[10px] font-black uppercase font-fix ${fps === f ? 'border-[#fa7000] bg-[#fa7000]/10 text-[#fa7000]' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* --- NOTIFICATIONS SECTION --- */}
              {activeTab === 'notifications' && (
                <section className="bg-white/5 rounded-xl p-8 border border-white/10 backdrop-blur-sm animate-fadeIn">
                  <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4 text-left">
                    <span className="material-symbols-outlined text-[#fa7000]">notifications</span>
                    {/* 🚀 修正：font-fixを追加 */}
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider font-fix">Notifications</h2>
                  </div>
                  <div className="space-y-4">
                    <ToggleItem label="対戦リクエストを受け取る" active={allowRequests} onToggle={() => setAllowRequests(!allowRequests)} />
                    <ToggleItem label="イベント・アップデート情報を受け取る" active={allowEvents} onToggle={() => setAllowEvents(!allowEvents)} />
                  </div>
                </section>
              )}

              {/* 🚀 --- ACCOUNT SECTION (New Design Integrated) --- */}
              {activeTab === 'account' && (
                <section className="bg-white/5 rounded-xl p-8 border border-white/10 backdrop-blur-sm animate-fadeIn" id="account">
                  <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4 text-left">
                    <span className="material-symbols-outlined text-[#fa7000]">account_circle</span>
                    {/* 🚀 修正：font-fixを追加 */}
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider font-fix">Account Management</h2>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="p-6 bg-[#23180f]/50 rounded-lg border border-white/5 flex-1 text-left">
                      {/* 🚀 修正：font-fixを追加 */}
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2 font-bold leading-none font-fix">Current Operator ID</p>
                      {/* 🚀 修正：font-fixを追加 */}
                      <p className="text-2xl font-mono font-bold text-white tracking-[0.2em] font-fix">
                        {myId ? `${myId.substring(0,4)} - ${myId.substring(4,8)}`.toUpperCase() : '8273 - 9405'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button className="flex items-center justify-center gap-2 px-8 py-4 bg-[#fa7000] hover:bg-[#fa7000]/90 text-white font-black text-xs uppercase rounded-lg transition-all shadow-[0_0_20px_rgba(250,112,0,0.3)] active:scale-95 font-fix">
                        <span className="material-symbols-outlined text-sm">link</span>
                        Link Account
                      </button>
                      <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-8 py-4 bg-transparent border border-white/20 hover:bg-red-500/10 hover:border-red-500/50 text-slate-400 hover:text-red-500 font-black text-xs uppercase rounded-lg transition-all active:scale-95 font-fix">
                        <span className="material-symbols-outlined text-sm">logout</span>
                        Logout
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Bottom Return Button */}
              <div className="flex justify-center pt-10 pb-12">
                <button onClick={onBack} className="group relative px-16 py-4 overflow-hidden rounded-full bg-[#23180f] border border-[#fa7000]/50 text-white font-black tracking-[0.3em] uppercase transition-all hover:border-[#fa7000] hover:shadow-[0_0_30px_rgba(250,112,0,0.2)] active:scale-95 font-fix">
                  <div className="absolute inset-0 bg-[#fa7000]/10 group-hover:bg-[#fa7000]/20 transition-all"></div>
                  <div className="relative flex items-center gap-2">
                    <span className="material-symbols-outlined">chevron_left</span>
                    Back to Command
                  </div>
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
};

// --- Sub-Components ---

const NavButton = ({ active, onClick, icon, label }: any) => (
  // 🚀 修正：font-fixを追加
  <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left group font-fix ${active ? 'bg-[#fa7000]/20 border-l-4 border-[#fa7000] text-white' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'}`}>
    <span className={`material-symbols-outlined ${active ? 'text-[#fa7000]' : 'group-hover:text-[#fa7000]'} transition-colors`}>{icon}</span>
    <span className={`text-sm font-bold ${active ? '' : 'font-medium'}`}>{label}</span>
  </button>
);

const VolumeSlider = ({ label, value, onChange }: any) => (
  <div className="flex flex-col gap-3 text-left">
    <div className="flex justify-between items-end">
      {/* 🚀 修正：font-fixを追加 */}
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-fix">{label}</label>
      {/* 🚀 修正：font-fixを追加 */}
      <span className="text-lg font-mono font-bold text-[#fa7000] font-fix">{value}%</span>
    </div>
    <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#fa7000]" />
  </div>
);

const ToggleItem = ({ label, active, onToggle }: any) => (
  <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
    {/* 🚀 修正：font-fixを追加 */}
    <p className="text-sm font-bold text-slate-300 font-fix">{label}</p>
    <button onClick={onToggle} className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${active ? 'bg-[#fa7000]' : 'bg-slate-700'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-7' : 'translate-x-1'}`}></span>
    </button>
  </div>
);