
import React, { useRef } from 'react';
import { ReferenceAsset } from '../types';

interface AssetLibraryProps {
  assets: ReferenceAsset[];
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: (asset: ReferenceAsset) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, assetData: string) => void;
  t: any;
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({
  assets, isDragOver, onDragOver, onDragLeave, onDrop,
  onUpload, onEdit, onDelete, onDragStart, t
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (assets.length === 0) return null;

  return (
    <div 
        className={`w-full mt-6 bg-white/70 dark:bg-gray-900/80 backdrop-blur-md rounded-[24px] shadow-lg border border-white/40 dark:border-white/10 p-4 animate-float-up transition-colors duration-200 ${isDragOver ? 'bg-purple-100/50 dark:bg-purple-900/30 border-purple-400' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
         <div className="flex items-center justify-between mb-2 px-2">
             <div className="flex items-center gap-2">
                 <span className="material-symbols-rounded text-purple-500">collections</span>
                 <h3 className="font-bold text-text">{t.libraryTitle}</h3>
                 <span className="text-xs text-text-muted bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">{t.libraryDragHint}</span>
                 
                 <label className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full cursor-pointer transition-colors ml-2" title={t.uploadTitle}>
                    <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={onUpload}
                    />
                    <span className="material-symbols-rounded text-purple-500 dark:text-purple-400 text-lg">add_photo_alternate</span>
                </label>
             </div>
         </div>
         
         <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
             {assets.map((asset) => (
                 <div 
                   key={asset.id}
                   draggable="true"
                   onDragStart={(e) => onDragStart(e, asset.data)}
                   className="flex-shrink-0 relative group w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shadow-clay border border-white/20 cursor-grab active:cursor-grabbing snap-start hover:-translate-y-1 transition-transform duration-200"
                 >
                    <img src={asset.data} alt="Asset" className="w-full h-full object-cover pointer-events-none" />
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                            onClick={() => onEdit(asset)}
                            className="w-7 h-7 bg-white rounded-full text-text flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                            title={t.edit}
                        >
                            <span className="material-symbols-rounded text-sm">edit</span>
                        </button>
                        <button 
                            onClick={() => onDelete(asset.id)}
                            className="w-7 h-7 bg-red-500 rounded-full text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                            title={t.delete}
                        >
                            <span className="material-symbols-rounded text-sm">close</span>
                        </button>
                    </div>
                 </div>
             ))}
         </div>
    </div>
  );
};

export default AssetLibrary;
