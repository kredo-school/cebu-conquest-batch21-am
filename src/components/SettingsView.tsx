/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, memo } from 'react';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager';
import { useBGM } from '../hook/useBGM';

interface SettingsViewProps {
  onBack: () => void;
}

type TabType = 'sound' | 'gameplay' | 'notifications' | 'account';
type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

// ✅ サブコンポーネント用の型定義
interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

interface ToggleItemProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = memo(({ onBack }) => {
  const { 
    playerName, myId, 
    bgmVolume, setBgmVolume, 
    seVolume, setSeVolume,
    masterVolume, setMasterVolume,
    graphicsQuality, setGraphicsQuality,
    notifyMatchRequest, setNotifyMatchRequest,
    notifyEventUpdate, setNotifyEventUpdate,
    cameraSensitivity, setCameraSensitivity,
    playerAvatar, setPlayerAvatar 
  } = useGameStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('sound');
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playBGM, stopBGM } = useBGM();

  useEffect(() => {
    playBGM('setting');
    return () => stopBGM();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 画像変更プロトコル ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        alert("画像サイズが大きすぎます。1MB以下の画像を選択してください。");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlayerAvatar(reader.result as string);
        try { SoundManager.playSe('click'); } catch (_e) { /* ignore */ }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 設定保存プロトコル ---
  const handleSave = () => {
    try { SoundManager.playSe('capture'); } catch (_e) { /* ignore */ }
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onBack();
    }, 1500);
  };

  // --- ログアウト ---
  const handleLogout = () => {
    if (window.confirm("ログアウトしてタイトルに戻りますか？")) {
      useGameStore.persist.clearStorage();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] bg-[#23180f] text-slate-100 font-display overflow-y-auto custom-scrollbar">
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden text-left">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#fa7000]/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-green-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ヘッダーエリア */}
        <header className="flex items-center justify-between border-b border-[#fa7000]/20 px-6 py-4 lg:px-40 bg-[#23180f]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center justify-center p-2 hover:bg-[#fa7000]/10 rounded-full transition-colors active:scale-90">
              <span className="material-symbols-outlined text-[#fa7000] text-3xl">arrow_back</span>
            </button>
            <div className="flex flex-col text-left">
              <h1 className="text-xl font-bold tracking-tight text-white uppercase leading-none font-fix">Cebu Conquest</h1>
              <p className="text-[10px] text-[#fa7000] font-black tracking-widest uppercase mt-1 font-fix">Settings / 設定</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-baseline gap-3 text-right">
              <p className="text-[10px] text-slate-400 font-mono uppercase font-fix">UserID: {myId?.substring(0,8).toUpperCase() || '82739405'}</p>
              <p className="text-sm font-bold text-white italic font-fix">{playerName || "Operator"}</p>
            </div>
            {/* アバター表示：No Image対応 */}
            <div className="size-10 rounded-full border-2 border-[#fa7000] overflow-hidden bg-slate-900 shrink-0 flex items-center justify-center shadow-[0_0_10px_rgba(250,112,0,0.2)]">
               {playerAvatar ? (
                 <img src={playerAvatar} alt="avatar" className="w-full h-full object-cover" />
               ) : (
                 <span className="material-symbols-outlined text-slate-600 text-2xl">person</span>
               )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 lg:px-40 max-w-6xl mx-auto w-full relative z-10 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* サイドバータブ */}
            <div className="hidden lg:flex flex-col col-span-3 gap-2">
              <NavButton active={activeTab === 'sound'} onClick={() => setActiveTab('sound')} icon="volume_up" label="サウンド" />
              <NavButton active={activeTab === 'gameplay'} onClick={() => setActiveTab('gameplay')} icon="sports_esports" label="ゲームプレイ" />
              <NavButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon="notifications" label="通知設定" />
              <NavButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon="account_circle" label="アカウント" />
            </div>

            {/* コンテンツエリア */}
            <div className="col-span-1 lg:col-span-9 space-y-10">
              
              {/* --- SOUND SECTION --- */}
              {activeTab === 'sound' && (
                <section className="bg-white/5 rounded-xl p-8 border border-white/10 backdrop-blur-sm animate-fadeIn">
                  <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                    <span className="material-symbols-outlined text-[#fa7000]">volume_up</span>
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider font-fix">Sound Settings</h2>
                  </div>
                  <div className="space-y-10">
                    <VolumeSlider label="マスター音量" value={Math.round(masterVolume * 100)} onChange={(v: number) => setMasterVolume(v/100)} />
                    <VolumeSlider label="BGM音量" value={Math.round(bgmVolume * 100)} onChange={(v: number) => { setBgmVolume(v/100); try { SoundManager.setBgmVolume(v/100); } catch(_e) {} }} />
                    <VolumeSlider label="SE音量" value={Math.round(seVolume * 100)} onChange={(v: number) => { setSeVolume(v/100); try { SoundManager.playSe('click'); } catch(_e) {} }} />
                  </div>
                </section>
              )}

              {/* --- GAMEPLAY SECTION --- */}
              {activeTab === 'gameplay' && (
                <section className="animate-fadeIn">
                  <header className="mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase leading-none font-fix">Gameplay</h2>
                    <p className="text-[#fa7000]/70 mt-2 font-medium italic text-sm font-fix">Fine-tune your tactical experience</p>
                  </header>

                  <div className="space-y-10">
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-[#fa7000]">high_quality</span>
                        <h3 className="text-lg font-bold text-white font-fix">グラフィックス品質</h3>
                      </div>
                      <div className="flex h-12 w-full items-center justify-center rounded-xl bg-white/5 p-1 border border-white/10">
                        {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as GraphicsQuality[]).map((q) => (
                          <label key={q} className={`flex cursor-pointer h-full grow items-center justify-center rounded-lg px-2 text-[10px] font-black transition-all uppercase font-fix ${graphicsQuality === q ? 'bg-[#fa7000] text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}>
                            {q === 'LOW' ? '低' : q === 'MEDIUM' ? '中' : q === 'HIGH' ? '高' : 'ウルトラ'}
                            <input type="radio" className="hidden" value={q} checked={graphicsQuality === q} onChange={() => setGraphicsQuality(q)} />
                          </label>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#fa7000]">photo_camera</span>
                          <h3 className="text-lg font-bold text-white font-fix">カメラ感度</h3>
                        </div>
                        <span className="text-[#fa7000] font-black font-fix">{cameraSensitivity}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={cameraSensitivity} onChange={(e) => setCameraSensitivity(parseInt(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#fa7000]" />
                    </section>
                  </div>

                  <footer className="mt-16 pt-8 border-t border-white/10 flex justify-end gap-4 pb-4">
                    <button onClick={onBack} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white hover:bg-white/10 transition-colors font-fix">キャンセル</button>
                    <button onClick={handleSave} className="px-8 py-2.5 rounded-lg bg-[#fa7000] text-white text-sm font-bold shadow-lg shadow-[#fa7000]/30 hover:scale-105 active:scale-95 transition-all font-fix">設定を保存</button>
                  </footer>
                </section>
              )}

              {/* --- NOTIFICATIONS SECTION --- */}
              {activeTab === 'notifications' && (
                <section className="bg-white/5 rounded-xl p-8 border border-white/10 backdrop-blur-sm animate-fadeIn">
                  <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                    <span className="material-symbols-outlined text-[#fa7000]">notifications</span>
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider font-fix">Notifications</h2>
                  </div>
                  <div className="space-y-4">
                    <ToggleItem label="対戦リクエストを受け取る" active={notifyMatchRequest} onToggle={() => setNotifyMatchRequest(!notifyMatchRequest)} />
                    <ToggleItem label="イベント・アップデート情報を受け取る" active={notifyEventUpdate} onToggle={() => setNotifyEventUpdate(!notifyEventUpdate)} />
                  </div>
                </section>
              )}

              {/* --- ACCOUNT SECTION --- */}
              {activeTab === 'account' && (
                <section className="bg-white/5 rounded-xl p-8 border border-white/10 backdrop-blur-sm animate-fadeIn">
                  <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                    <span className="material-symbols-outlined text-[#fa7000]">account_circle</span>
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider font-fix">Account Management</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-white/5 rounded-xl border border-white/5 group">
                      <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        {/* プレビュー：No Image対応 */}
                        <div className="size-24 rounded-full border-4 border-[#fa7000] overflow-hidden shadow-[0_0_20px_rgba(250,112,0,0.3)] bg-slate-900 flex items-center justify-center transition-transform group-hover:scale-105">
                          {playerAvatar ? (
                            <img src={playerAvatar} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center opacity-40">
                              <span className="material-symbols-outlined text-slate-500 text-5xl">no_accounts</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                          <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                      </div>
                      <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-fix">Edit Profile Image</p>
                    </div>

                    <div className="md:col-span-2 relative overflow-hidden bg-gradient-to-r from-[#23180f] to-[#2d1e14] rounded-xl border border-white/10 flex flex-col items-stretch transition-all shadow-2xl">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#fa7000] shadow-[0_0_15px_rgba(250,112,0,0.4)]"></div>
                      <div className="flex-1 flex flex-col justify-center pl-10 py-6 text-left">
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black font-fix mb-1">System Identity Active</p>
                        <div className="flex items-baseline gap-4">
                          <span className="material-symbols-outlined text-[#fa7000]/50 text-2xl">fingerprint</span>
                          <p className="text-3xl font-mono font-black text-white tracking-[0.2em] drop-shadow-md font-fix">
                            {myId ? `${myId.substring(0,4)} - ${myId.substring(4,8)}`.toUpperCase() : '8273 - 9405'}
                          </p>
                        </div>
                        <p className="text-[9px] text-slate-600 uppercase mt-2 tracking-widest font-fix">Operator: {playerName || "Unauthorized"}</p>
                      </div>
                      <div className="bg-black/20 px-8 py-6 flex flex-row lg:flex-col justify-center gap-4 min-w-[240px]">
                        <button onClick={() => alert("Coming Soon...")} className="flex-1 flex items-center justify-center gap-3 px-6 py-3 bg-white/5 hover:bg-[#fa7000]/10 border border-white/10 hover:border-[#fa7000]/50 text-white font-black text-xs uppercase rounded-lg transition-all font-fix">
                          <span className="material-symbols-outlined text-lg text-[#fa7000]">link</span>
                          <span>Link Account</span>
                        </button>
                        <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-3 px-6 py-3 bg-red-500/5 hover:bg-red-500 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-white font-black text-xs uppercase rounded-lg transition-all font-fix">
                          <span className="material-symbols-outlined text-lg">logout</span>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* フッター戻るボタン */}
              <div className="flex justify-center pt-10 pb-12">
                <button onClick={onBack} className="group relative px-16 py-4 overflow-hidden rounded-full bg-[#23180f] border border-[#fa7000]/50 text-white font-black tracking-[0.3em] uppercase transition-all hover:border-[#fa7000] hover:shadow-[0_0_30px_rgba(250,112,0,0.2)] active:scale-95 font-fix">
                  <div className="absolute inset-0 bg-[#fa7000]/10 group-hover:bg-[#fa7000]/20 transition-all"></div>
                  <div className="relative flex items-center gap-2"><span className="material-symbols-outlined">chevron_left</span>Back to Command</div>
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>

      {showToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[30000] animate-pulse pointer-events-none">
          <div className="bg-[#fa7000] text-[#23180f] px-10 py-4 rounded-sm skew-x-[-10deg] shadow-[0_0_50px_rgba(250,112,0,0.5)] border-2 border-white/30">
            <p className="text-xl font-black italic tracking-[0.2em] uppercase font-fix">System Config Updated</p>
          </div>
        </div>
      )}

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        .font-fix { line-height: 1.1; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fa7000; border-radius: 10px; }
      `}</style>
    </div>
  );
});

// --- サブコンポーネント ---

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left group font-fix ${active ? 'bg-[#fa7000]/20 border-l-4 border-[#fa7000] text-white' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'}`}>
    <span className={`material-symbols-outlined ${active ? 'text-[#fa7000]' : 'group-hover:text-[#fa7000]'} transition-colors`}>{icon}</span>
    <span className="text-sm font-bold">{label}</span>
  </button>
);

const VolumeSlider: React.FC<VolumeSliderProps> = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-3 text-left">
    <div className="flex justify-between items-end">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-fix">{label}</label>
      <span className="text-lg font-mono font-bold text-[#fa7000] font-fix">{value}%</span>
    </div>
    <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#fa7000]" />
  </div>
);

const ToggleItem: React.FC<ToggleItemProps> = ({ label, active, onToggle }) => (
  <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 text-left">
    <p className="text-sm font-bold text-slate-300 font-fix">{label}</p>
    <button onClick={onToggle} className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${active ? 'bg-[#fa7000]' : 'bg-slate-700'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-7' : 'translate-x-1'}`}></span>
    </button>
  </div>
);

export default SettingsView;