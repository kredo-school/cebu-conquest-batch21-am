import React from 'react';

interface PlayerCardProps {
  name: string;
  id: string;
  isReady: boolean;
  isNPC?: boolean;
  isMe: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ name, id, isReady, isNPC, isMe }) => {
  return (
    <div className={`p-4 rounded-xl border-l-4 bg-slate-900/60 backdrop-blur-md transition-all h-full shadow-2xl flex flex-col 
      ${isReady ? 'border-brand-500 shadow-brand-500/10' : 'border-slate-800 opacity-60'}
      ${isNPC ? 'border-red-500/50' : ''}`}>
      
      <div className="relative mb-4 text-left overflow-hidden rounded-lg bg-slate-950">
        <img 
          className={`w-full aspect-video object-cover transition-transform duration-500 ${isReady ? 'scale-105' : 'grayscale'}`} 
          src={isNPC 
            ? 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=400' 
            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || id}`} 
          alt="" 
        />
        {isMe && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-brand-500 text-[9px] font-black text-slate-950 rounded shadow-lg font-fix">
            YOU
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-auto px-1">
        <div className="flex flex-col text-left">
          <span className={`text-[10px] font-bold uppercase tracking-widest leading-none mb-1 font-fix ${isNPC ? 'text-red-500' : 'text-brand-500'}`}>
            {isNPC ? 'Neural Bot' : 'Operator'}
          </span>
          <span className="font-black text-white uppercase text-sm truncate max-w-[140px] font-fix">
            {isNPC && <span className="text-red-500 mr-1">[BOT]</span>}
            {name || "Unknown"}
          </span>
        </div>
        {isReady && (
          <span className="material-symbols-outlined text-brand-500 text-lg" style={{ fontVariationSettings: '"FILL" 1' }}>
            check_circle
          </span>
        )}
      </div>
    </div>
  );
};