import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      {/* 背景のぼかし */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>

      {/* モニター風パネル */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* ヘッダー */}
        <div className="p-6 border-b border-cyan-500/20 bg-cyan-500/5 flex justify-between items-center">
          <div>
            {/* 🚀 修正: font-fixを追加 */}
            <h2 className="text-2xl font-black text-cyan-400 italic tracking-tighter uppercase font-fix">Tactical Manual</h2>
            {/* 🚀 修正: font-fixを追加 */}
            <p className="text-[10px] text-cyan-700 font-bold tracking-[0.3em] uppercase mt-1 font-fix">Operation: Cebu Conquest</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
          
          {/* Section 1: Objective */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-cyan-400">target</span>
              </div>
              {/* 🚀 修正: font-fixを追加 */}
              <h3 className="text-lg font-black text-white uppercase tracking-widest font-fix">01. 勝利条件</h3>
            </div>
            {/* 🚀 修正: font-fixを追加 */}
            <p className="text-slate-400 text-sm leading-relaxed pl-11 font-fix">
              セブ島の各地区を占拠し、最終的に**最も高い占有率（Occupancy）**を獲得した指揮官が勝利となります。
              敵の拠点を奪い、自軍の領土を拡大してください。
            </p>
          </section>

          {/* Section 2: Resources */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-cyan-400">bolt</span>
              </div>
              {/* 🚀 修正: font-fixを追加 */}
              <h3 className="text-lg font-black text-white uppercase tracking-widest font-fix">02. リソース管理</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-11">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                {/* 🚀 修正: font-fixを追加 */}
                <span className="text-cyan-400 font-black text-[10px] uppercase block mb-2 font-fix">AP (Action Points)</span>
                {/* 🚀 修正: font-fixを追加 */}
                <p className="text-slate-300 text-xs font-fix">移動、攻撃、占拠などの行動に必要です。毎ターン一定量回復します。</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                {/* 🚀 修正: font-fixを追加 */}
                <span className="text-orange-400 font-black text-[10px] uppercase block mb-2 font-fix">Armor (HP)</span>
                {/* 🚀 修正: font-fixを追加 */}
                <p className="text-slate-300 text-xs font-fix">ユニットの耐久値です。0になると戦線離脱となり、拠点を失うリスクが生じます。</p>
              </div>
            </div>
          </section>

          {/* Section 3: Divine Blessings */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-cyan-400">auto_awesome</span>
              </div>
              {/* 🚀 修正: font-fixを追加 */}
              <h3 className="text-lg font-black text-white uppercase tracking-widest font-fix">03. 守護神の加護</h3>
            </div>
            {/* 🚀 修正: font-fixを追加 */}
            <p className="text-slate-400 text-sm leading-relaxed pl-11 mb-4 font-fix">
              出撃前に選択する守護神によって、特殊なバフが付与されます。
            </p>
            <ul className="grid grid-cols-2 gap-3 pl-11 text-[11px] text-slate-500 font-bold uppercase italic">
              {/* 🚀 修正: 各リストアイテムにfont-fixを追加 */}
              <li className="font-fix">• Lapu-Lapu: 攻撃力強化</li>
              <li className="font-fix">• Sebuna: 最大AP増加</li>
              <li className="font-fix">• Kredo: AP回復速度UP</li>
              <li className="font-fix">• Bakunawa: 夜間ステルス</li>
            </ul>
          </section>

        </div>

        {/* フッター */}
        <div className="p-4 bg-slate-950/50 border-t border-cyan-500/10 text-center">
          {/* 🚀 修正: font-fixを追加 */}
          <p className="text-[9px] text-cyan-900 font-black tracking-[0.5em] uppercase font-fix">System: Manual v1.0.4 - Operational</p>
        </div>
      </div>
    </div>
  );
};