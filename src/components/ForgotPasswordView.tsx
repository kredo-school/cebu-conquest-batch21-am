import React, { useState } from 'react';
import { useGameStore } from '../store';

export const ForgotPasswordView: React.FC = () => {
  const { setView, addLog } = useGameStore();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    addLog(`📡 Recovery request sent for: ${email}`);
    setIsSent(true);
  };

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl border border-orange-500/30 shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-orange-500"></div>
        
        <h2 className="text-2xl font-black text-white mb-2 italic font-fix">RECOVERY MODE</h2>
        <p className="text-slate-400 text-xs mb-6 font-fix">Enter your registered email to receive a decryption key.</p>

        {!isSent ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-fix">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full bg-slate-950/50 border border-slate-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 font-fix"
                placeholder="operator@cebu-conquest.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-lg transition-all uppercase text-sm font-fix">
              Send Recovery Link
            </button>
          </form>
        ) : (
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg text-center">
            <span className="material-symbols-outlined text-orange-500 text-4xl mb-2">mark_email_read</span>
            <p className="text-white font-bold text-sm font-fix">Transmission Successful.</p>
            <p className="text-slate-400 text-[10px] mt-1 font-fix">Check your terminal for the reset link.</p>
          </div>
        )}

        <button 
          onClick={() => setView('login')} 
          className="w-full mt-6 text-[10px] text-slate-500 hover:text-white transition-colors uppercase font-bold tracking-widest font-fix"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
};