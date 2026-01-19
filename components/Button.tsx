import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: string;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  icon, 
  isLoading,
  disabled,
  ...props 
}) => {
  
  const baseStyles = "inline-flex items-center justify-center gap-2 px-6 py-3 font-extrabold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none";
  
  const variants = {
    // Fixed colors: 'pink-400' -> 'pink' because custom config overrides defaults
    // Changed text: 'text-white' -> 'text-text' (dark) because pastel bg has low contrast with white
    primary: "text-text bg-gradient-to-br from-pink to-purple shadow-clay hover:shadow-clay-hover hover:-translate-y-1 active:shadow-clay-pressed active:translate-y-0",
    secondary: "text-text bg-white shadow-clay hover:shadow-clay-hover hover:-translate-y-1 active:shadow-clay-pressed active:translate-y-0",
    danger: "text-white bg-gradient-to-br from-red-500 to-red-600 shadow-clay hover:shadow-clay-hover hover:-translate-y-1 active:shadow-clay-pressed active:translate-y-0",
    ghost: "text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text hover:shadow-sm",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin material-symbols-rounded">progress_activity</span>
      ) : icon ? (
        <span className="material-symbols-rounded text-xl">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export default Button;