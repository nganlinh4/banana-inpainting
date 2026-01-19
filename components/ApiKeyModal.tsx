
import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  onCancel: () => void;
  t: any;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, onCancel, t }) => {
  const [input, setInput] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <Card className="max-w-md w-full p-8 flex flex-col gap-4">
          <h3 className="text-2xl font-black text-text">{t.groqKeyTitle}</h3>
          <p className="text-text-muted">
             {t.groqKeyDesc}{' '}
             <a href={t.groqLinkText} target="_blank" rel="noopener noreferrer" className="text-purple font-bold hover:underline">
               {t.groqLinkText}
             </a>
          </p>
          <input 
            type="password" 
            placeholder={t.groqKeyPlaceholder}
            className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black/50 text-text outline-none focus:ring-2 focus:ring-purple"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave(input)}
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-2">
             <Button variant="ghost" onClick={onCancel}>{t.cancel}</Button>
             <Button onClick={() => onSave(input)}>{t.save}</Button>
          </div>
       </Card>
    </div>
  );
};

export default ApiKeyModal;
