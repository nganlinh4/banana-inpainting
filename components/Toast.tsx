import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-green-500/90 border-green-400/50',
    error: 'bg-red-500/90 border-red-400/50',
    info: 'bg-blue-500/90 border-blue-400/50',
  };

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  };

  return (
    <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-clay-hover backdrop-blur-md border animate-bounce-in max-w-[90vw] md:max-w-md ${bgColors[type]}`}>
      <span className="material-symbols-rounded text-2xl text-white shadow-sm">{icons[type]}</span>
      <p className="font-bold text-white text-shadow-sm pr-2">{message}</p>
      <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors text-white">
        <span className="material-symbols-rounded text-lg">close</span>
      </button>
    </div>
  );
};

export default Toast;