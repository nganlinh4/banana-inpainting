
import React, { useRef, useEffect, useLayoutEffect } from 'react';
import Button from './Button';
import { StagedLayer, SelectionBox, DrawingMode, LayerTool } from '../types';

interface CanvasToolbarProps {
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isProcessing: boolean;
  
  stagedLayer: StagedLayer | null;
  setStagedLayer: (layer: StagedLayer | null) => void;
  onApplyLayer: () => void;
  setIsAdjustingFeather: (val: boolean) => void;
  pushLayerHistory: (layer: StagedLayer) => void;
  
  layerTool: LayerTool;
  setLayerTool: (tool: LayerTool) => void;
  eraserSettings: { size: number, softness: number };
  setEraserSettings: (settings: { size: number, softness: number }) => void;

  selection: SelectionBox | null;
  prompt: string;
  setPrompt: (val: string) => void;
  onGenerate: () => void;
  
  isRecording: boolean;
  isTranscribing: boolean;
  toggleRecording: () => void;
  micRippleRef: React.RefObject<HTMLDivElement>;
  
  onDownload: () => void;
  t: any;
  drawingMode: DrawingMode;
  setDrawingMode: (mode: DrawingMode) => void;
  hasTransforms?: boolean;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onBack, onUndo, onRedo, canUndo, canRedo, isProcessing,
  stagedLayer, setStagedLayer, onApplyLayer, setIsAdjustingFeather, pushLayerHistory,
  layerTool, setLayerTool, eraserSettings, setEraserSettings,
  selection, prompt, setPrompt, onGenerate,
  isRecording, isTranscribing, toggleRecording, micRippleRef,
  onDownload, t, drawingMode, setDrawingMode, hasTransforms
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
        if (textarea.clientWidth < 50) { textarea.style.height = 'auto'; return; }
        textarea.style.height = 'auto';
        if (prompt) {
            const newHeight = Math.min(textarea.scrollHeight, 200);
            textarea.style.height = `${newHeight}px`;
        }
    };
    adjustHeight();
    const timer = setTimeout(adjustHeight, 10);
    window.addEventListener('resize', adjustHeight);
    return () => { clearTimeout(timer); window.removeEventListener('resize', adjustHeight); };
  }, [prompt, stagedLayer]);

  return (
    <div className="w-full mb-6 p-3 flex flex-wrap items-center justify-between gap-4 z-20 sticky top-4 bg-white/70 dark:bg-gray-900/80 backdrop-blur-md rounded-[24px] shadow-lg border border-white/40 dark:border-white/10 transition-colors duration-300">
        <div className="flex items-center gap-2 shrink-0">
           <Button variant="ghost" onClick={onBack} title={t.back} className="!text-gray-700 dark:!text-white hover:!bg-black/5 dark:hover:!bg-white/10"><span className="material-symbols-rounded text-red-500 dark:text-red-400">arrow_back</span></Button>
           <div className="h-8 w-[1px] bg-gray-300 dark:bg-white/20 mx-1 hidden sm:block"></div>
           <Button variant="secondary" onClick={onUndo} disabled={!canUndo || isProcessing || !!stagedLayer} title={t.undo} className="!px-3 !bg-white/50 dark:!bg-white/10 !text-gray-700 dark:!text-white !border-0 hover:!bg-white/80 dark:hover:!bg-white/20 disabled:!opacity-30 shadow-none"><span className="material-symbols-rounded">undo</span></Button>
          <Button variant="secondary" onClick={onRedo} disabled={!canRedo || isProcessing || !!stagedLayer} title={t.redo} className="!px-3 !bg-white/50 dark:!bg-white/10 !text-gray-700 dark:!text-white !border-0 hover:!bg-white/80 dark:hover:!bg-white/20 disabled:!opacity-30 shadow-none"><span className="material-symbols-rounded">redo</span></Button>
        </div>

        <div className="flex-1 flex justify-center px-4 min-w-0">
          {stagedLayer ? (
            <div className="flex flex-col sm:flex-row w-full items-center gap-4 bg-white/60 dark:bg-black/40 px-4 py-2 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 shrink-0 border-r border-gray-300 dark:border-white/10 pr-4 mr-2">
                 <button onClick={() => setLayerTool('MOVE')} className={`p-2 rounded-xl transition-all ${layerTool === 'MOVE' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-500 hover:text-purple-500 hover:bg-black/5 dark:hover:bg-white/10'}`} title={t.moveHint}><span className="material-symbols-rounded text-xl">open_with</span></button>
                 <button onClick={() => setLayerTool('ERASER')} className={`p-2 rounded-xl transition-all ${layerTool === 'ERASER' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-500 hover:text-purple-500 hover:bg-black/5 dark:hover:bg-white/10'}`} title={t.layerEraser}><span className="material-symbols-rounded text-xl">ink_eraser</span></button>
              </div>
              <div className="flex flex-1 items-center gap-6 min-w-[200px]">
                 {layerTool === 'MOVE' ? (
                   <div className="flex flex-1 items-center gap-3">
                     <span className="material-symbols-rounded text-purple-600 dark:text-purple-300 text-lg" title={t.edgeBlur}>blur_on</span>
                     <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase text-gray-500">{t.edgeBlur}</span>
                        <input type="range" min="0" max="100" value={stagedLayer.feather} onChange={(e) => setStagedLayer({...stagedLayer, feather: parseInt(e.target.value)})} onPointerDown={() => setIsAdjustingFeather(true)} onPointerUp={(e) => { setIsAdjustingFeather(false); e.currentTarget.blur(); pushLayerHistory(stagedLayer); }} className="w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 outline-none transition-all" />
                     </div>
                     <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-6 text-right font-mono">{stagedLayer.feather}</span>
                   </div>
                 ) : (
                   <>
                     <div className="flex flex-1 items-center gap-2"><span className="material-symbols-rounded text-gray-500 text-sm">circle</span><div className="flex-1 flex flex-col"><span className="text-[10px] font-bold uppercase text-gray-500">{t.size}</span><input type="range" min="5" max="100" value={eraserSettings.size} onChange={(e) => setEraserSettings({...eraserSettings, size: parseInt(e.target.value)})} className="w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 outline-none" /></div></div>
                     <div className="flex flex-1 items-center gap-2"><span className="material-symbols-rounded text-gray-500 text-sm">blur_linear</span><div className="flex-1 flex flex-col"><span className="text-[10px] font-bold uppercase text-gray-500">{t.softness}</span><input type="range" min="0" max="100" value={eraserSettings.softness} onChange={(e) => setEraserSettings({...eraserSettings, softness: parseInt(e.target.value)})} className="w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 outline-none" /></div></div>
                   </>
                 )}
              </div>
              <div className="h-6 w-[1px] bg-gray-300 dark:bg-white/10 shrink-0 mx-2 hidden sm:block"></div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" onClick={() => setStagedLayer(null)} className="!px-3 !py-1.5 !h-9 !text-sm !font-bold !rounded-xl border border-gray-200 dark:border-white/10 shadow-none hover:bg-gray-50 dark:hover:bg-white/5">{t.cancel}</Button>
                <Button variant="primary" onClick={onApplyLayer} className="!px-5 !py-1.5 !h-9 !text-sm !font-bold !rounded-xl shadow-md bg-gradient-to-r from-pink-500 to-purple-600">{t.apply}</Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-4xl gap-2 items-end">
              <div className="flex-1 flex items-center gap-1 pr-2 bg-white/60 dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-white/10 focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all shadow-inner overflow-hidden min-h-[48px]">
                {selection && (
                  <div className="flex items-center gap-1 pl-2 border-r border-gray-300 dark:border-white/10 mr-2 pr-2">
                     <button onClick={() => setDrawingMode('BRUSH')} className={`p-1.5 rounded-lg transition-colors ${drawingMode === 'BRUSH' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:text-purple-500'}`} title={t.brush}><span className="material-symbols-rounded text-xl">brush</span></button>
                     <button onClick={() => setDrawingMode('ERASER')} className={`p-1.5 rounded-lg transition-colors ${drawingMode === 'ERASER' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:text-purple-500'}`} title={t.eraser}><span className="material-symbols-rounded text-xl">ink_eraser</span></button>
                  </div>
                )}
                {!selection && (<span className="pl-3 text-purple-600 dark:text-purple-300 material-symbols-rounded text-xl shrink-0 select-none">auto_awesome</span>)}
                
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={selection ? (hasTransforms ? t.describeChanges : t.promptPlaceholder) : t.drawBoxHint}
                  className="flex-1 bg-transparent !border-none !outline-none !ring-0 !shadow-none py-3 px-2 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-bold resize-none overflow-y-auto leading-normal scrollbar-hide !max-h-[200px]"
                  disabled={!selection || isProcessing}
                  rows={1}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onGenerate(); }}}
                />

                <div className="flex items-center justify-center shrink-0 relative w-10 h-10">
                   <div ref={micRippleRef} className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-red-500 opacity-0 pointer-events-none transition-transform duration-75"></div>
                   <button onClick={toggleRecording} className={`relative z-10 p-2 rounded-xl transition-all flex items-center justify-center ${isRecording ? 'text-red-500 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}`} title="Voice Input" disabled={!selection && !prompt && !isRecording}>
                      {isTranscribing ? (<svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : (<span className="material-symbols-rounded text-xl">{isRecording ? 'mic' : 'mic_none'}</span>)}
                   </button>
                </div>
              </div>
              <Button variant="primary" onClick={onGenerate} disabled={!selection || (!prompt && !hasTransforms) || isProcessing} isLoading={isProcessing} className={`shrink-0 font-bold bg-gradient-to-r from-pink-500 to-purple-600 !text-white !shadow-lg border-0 h-[48px] ${hasTransforms && !prompt ? 'animate-pulse' : ''}`}>{t.go}</Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
           <Button variant="secondary" onClick={onDownload} icon="download" className="!bg-white/50 dark:!bg-white/10 !text-gray-700 dark:!text-white !border-0 hover:!bg-white/80 dark:hover:!bg-white/20 shadow-none">{t.save}</Button>
        </div>
      </div>
  );
};

export default CanvasToolbar;
