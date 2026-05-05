import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost';
}

export const CustomButton: React.FC<Props> = ({ onClick, children, variant = 'primary', disabled, className = '', ...rest }) => {
  const baseStyle = "px-6 py-2 rounded-full font-bold transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 font-fix uppercase tracking-widest text-sm shadow-lg";
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-500 shadow-orange-900/20",
    danger: "bg-red-600 text-white hover:bg-red-500 shadow-red-900/20",
    ghost: "border-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};
