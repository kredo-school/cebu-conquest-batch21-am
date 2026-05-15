/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, memo } from 'react';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager';
import { useBGM } from '../hook/useBGM';
import { CustomButton } from './common/CustomButton';

interface SettingsViewProps {
  onBack: () => void;
}

type TabType = 'sound' | 'gameplay' | 'notifications' | 'account';
type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

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

  const handleSave = () => {
    try { SoundManager.playSe('capture'); } catch (_e) { /* ignore */ }
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onBack();
    }, 1500);
  };

  const handleLogout = () => {
    if (window.confirm("ログアウトしてタイトルに戻りますか？")) {
      useGameStore.persist.clearStorage();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] bg-slate-950 font-body text-slate-200 overflow-hidden flex flex-col relative select-none text-left">
      {/* 🚀 背景演出：LoginViewと完全に統一 */}
      <div className="fixed inset-0 z-0 island-silhouette opacity-40" />
      <div className="fixed inset-0 z-10 tropical-flare pointer-events-none" />

      {/* ヘッダー：GlobalNavbarの質感に準拠 */}
      <header className="relative z-30 flex items-center justify-between px-6 py-4 lg:px-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center justify-center p-2 hover:bg-orange-500/10 rounded-full transition-colors active:scale-90">
            <span className="material-symbols-outlined text-orange-500 text-3xl">arrow_back</span>
          </button>
          <div className="flex flex-col text-left">
            <div className="px-3 py-0.5 w-fit rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold tracking-[0.2em] mb-1 uppercase">
              System Configuration
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none font-fix">SETTINGS</h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] text-slate-500 font-mono uppercase">Operator Active</p>
            <p className="text-sm font-bold text-white italic font-fix">{playerName || "Operator"}</p>
          </div>
          <div className="size-10 rounded-full border-2 border-orange-500 overflow-hidden bg-slate-900 shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
            {playerAvatar ? <img src={playerAvatar} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-600 m-1.5">person</span>}
          </div>
        </div>
      </header>

      <main className="relative z-20 flex-1 px-6 py-8 lg:px-40 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* サイドバータブ：BentoCardのデザインを完全に移植 */}
          <div className="hidden lg:flex flex-col col-span-3 gap-3">
            <SettingsTab active={activeTab === 'sound'} onClick={() => setActiveTab('sound')} icon="volume_up" title="Audio Output" sub="Master & BGM" />
            <SettingsTab active={activeTab === 'gameplay'} onClick={() => setActiveTab('gameplay')} icon="sports_esports" title="Game Logic" sub="Quality & Camera" />
            <SettingsTab active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon="notifications" title="Comm Link" sub="Alert Protocols" />
            <SettingsTab active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon="account_circle" title="Operator ID" sub="Neural Identity" />
          </div>

          {/* コンテンツエリア：LoginViewのメインカードスタイル */}
          <div className="col-span-1 lg:col-span-9">
            <div className="w-full bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden min-h-[550px] flex flex-col">
              
              {/* 各セクションのコンテンツ */}
              <div className="flex-1">
                {activeTab === 'sound' && (
                  <div className="animate-fadeIn space-y-10">
                    <SectionHeader title="Sound Protocols" sub="Manage sensory input levels" />
                    <div className="space-y-10 max-w-2xl">
                      <VolumeSlider label="Master Volume" value={Math.round(masterVolume * 100)} onChange={(v) => setMasterVolume(v/100)} />
                      <VolumeSlider label="BGM Channel" value={Math.round(bgmVolume * 100)} onChange={(v) => { setBgmVolume(v/100); SoundManager.setBgmVolume(v/100); }} />
                      <VolumeSlider label="SE Feedback" value={Math.round(seVolume * 100)} onChange={(v) => { setSeVolume(v/100); SoundManager.playSe('click'); }} />
                    </div>
                  </div>
                )}

                {activeTab === 'gameplay' && (
                  <div className="animate-fadeIn space-y-10">
                    <SectionHeader title="Tactical Logic" sub="Fine-tune execution parameters" />
                    <div className="space-y-12 max-w-2xl">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visual Processing Quality</label>
                        <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                          {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as GraphicsQuality[]).map((q) => (
                            <button key={q} onClick={() => setGraphicsQuality(q)} className={`flex-1 py-3 rounded-lg text-[10px] font-black transition-all uppercase font-fix ${graphicsQuality === q ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                      <VolumeSlider label="Camera Sensitivity" value={cameraSensitivity} onChange={setCameraSensitivity} />
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="animate-fadeIn space-y-8">
                    <SectionHeader title="Communication Link" sub="External signal reception" />
                    <div className="space-y-2">
                      <ToggleItem label="Receive Combat Requests" active={notifyMatchRequest} onToggle={() => setNotifyMatchRequest(!notifyMatchRequest)} />
                      <ToggleItem label="Global Update Intelligence" active={notifyEventUpdate} onToggle={() => setNotifyEventUpdate(!notifyEventUpdate)} />
                    </div>
                  </div>
                )}

                {activeTab === 'account' && (
                  <div className="animate-fadeIn space-y-8">
                    <SectionHeader title="Neural Identity" sub="Encryption & Access data" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="flex flex-col items-center gap-4 p-6 bg-slate-950/30 rounded-2xl border border-slate-800/50 group">
                        <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <div className="size-28 rounded-full border-4 border-orange-500 overflow-hidden shadow-[0_0_25px_rgba(249,115,22,0.3)] bg-slate-900 flex items-center justify-center transition-transform group-hover:scale-105">
                            {playerAvatar ? <img src={playerAvatar} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-700 text-6xl">person_add</span>}
                          </div>
                          <div className="absolute inset-0 bg-orange-600/40 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-all">
                            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                          </div>
                          <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-fix">Update Photo</p>
                      </div>
                      <div className="md:col-span-2 space-y-6">
                        <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                          <p className="text-[9px] text-orange-500 uppercase tracking-[0.4em] font-black mb-2">Authenticated Operator ID</p>
                          <p className="text-3xl font-mono font-black text-white tracking-widest drop-shadow-md">
                            {myId?.substring(0,8).toUpperCase() || '82739405'}
                          </p>
                        </div>
                        <CustomButton onClick={handleLogout} variant="ghost" className="w-full !bg-red-500/5 !border-red-500/20 !text-red-500 hover:!bg-red-500 hover:!text-white">TERMINATE NEURAL LINK</CustomButton>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* フッターアクション：LoginViewのCustomButtonスタイル */}
              <div className="mt-12 pt-6 border-t border-white/5 flex justify-end gap-4">
                <CustomButton onClick={onBack} variant="ghost" className="px-8">CANCEL</CustomButton>
                <CustomButton onClick={handleSave} variant="primary" className="px-12 py-4 text-sm font-black italic tracking-[0.2em]">
                  SAVE & SYNC <span className="material-symbols-outlined ml-1">bolt</span>
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-20 bg-slate-950/80 backdrop-blur-md flex justify-center items-center w-full py-3 border-t border-slate-800">
        <div className="text-orange-500/50 font-bold uppercase tracking-[0.3em] font-fix text-[8px]">© 2026 Batch21 [AM GI Offline] Protocol Active</div>
      </footer>

      {/* 🚀 トースト通知：LoginViewのモーダルスタイルを応用 */}
      {showToast && (
        <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-orange-600 text-slate-950 px-10 py-5 rounded-lg skew-x-[-10deg] shadow-[0_0_50px_rgba(249,115,22,0.5)] border-4 border-white/20 font-black italic tracking-widest uppercase">
            Configuration Locked
          </div>
        </div>
      )}

      <style>{`
        .island-silhouette { 
          background-image: linear-gradient(to top, #020617 15%, transparent 100%), url(https://lh3.googleusercontent.com/aida-public/AB6AXuDSuA1bkSkNiW2UkyuB77YfeoYUjF4RMpZ16m0xEgLDdDSHOMLBYhyIIjnbVAs8TTaIwLQCxKn2JcrAKeV6fLP2c1f3RD7XyIYEoCG6uxUGrVpCcoYNd8wLip7vqftuMd8sYI25g2ZndcGE8mtGgO0cgQFS-A1Zam7Vc6wuHt1LxTjBSc4SH3c7_Qf9OZjd_C9D4Kv-0_cYa0hET5HdZEFNtdgOhbxVNTlrQqAaG-xc_U1BikHRjSwk2UCVtTkuiUQsSawMVVm16hY);
          background-size: cover; background-position: center bottom;
        }
        .tropical-flare { background: radial-gradient(circle at center, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0) 70%) }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .font-fix { line-height: 1; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ea580c; border-radius: 10px; }
        
        input[type='range'] { -webkit-appearance: none; background: transparent; }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; height: 18px; width: 18px;
          background: #fff; border: 4px solid #ea580c;
          border-radius: 50%; cursor: pointer; margin-top: -7px;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
        }
        input[type='range']::-webkit-slider-runnable-track {
          width: 100%; height: 4px; background: #1e293b; border-radius: 2px;
        }
      `}</style>
    </div>
  );
});

// --- 再利用可能なコンポーネント（LoginViewのDNAを継承） ---

const SettingsTab = ({ active, onClick, icon, title, sub }: { active: boolean, onClick: () => void, icon: string, title: string, sub: string }) => (
  <div onClick={onClick} className={`bg-slate-900/40 backdrop-blur-sm p-4 rounded-xl border flex items-center gap-4 group transition-all cursor-pointer text-left ${active ? 'bg-slate-800 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-slate-800/50 hover:bg-slate-800'}`}>
    <div className={`p-2 rounded-lg transition-colors shrink-0 flex items-center justify-center ${active ? 'bg-orange-500 text-white' : 'bg-orange-500/20 group-hover:bg-orange-500/40 text-orange-400'}`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
    <div className="text-left overflow-hidden">
      <div className={`font-black text-sm uppercase leading-tight italic truncate ${active ? 'text-white' : 'text-slate-200'}`}>{title}</div>
      <div className="text-slate-500 text-[9px] uppercase tracking-widest leading-tight mt-0.5 truncate">{sub}</div>
    </div>
  </div>
);

const SectionHeader = ({ title, sub }: { title: string, sub: string }) => (
  <div className="mb-8 text-left">
    <h2 className="text-2xl font-black text-white italic uppercase leading-none tracking-tighter">{title}</h2>
    <p className="text-orange-500 text-[10px] uppercase font-bold tracking-widest mt-2">{sub}</p>
  </div>
);

const VolumeSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
  <div className="space-y-4 text-left">
    <div className="flex justify-between items-end">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</label>
      <span className="text-2xl font-black italic text-orange-500">{value}%</span>
    </div>
    <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full" />
  </div>
);

const ToggleItem = ({ label, active, onToggle }: { label: string, active: boolean, onToggle: () => void }) => (
  <div className="flex items-center justify-between py-5 border-b border-white/5 last:border-0 group">
    <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{label}</p>
    <button onClick={onToggle} className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all border-2 ${active ? 'bg-orange-600 border-orange-500' : 'bg-slate-800 border-slate-700'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-md ${active ? 'translate-x-8' : 'translate-x-1'}`}></span>
    </button>
  </div>
);

export default SettingsView;