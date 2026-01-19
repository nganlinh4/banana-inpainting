import React, { useState, useEffect } from 'react';
import { SavedProject } from '../types';
import { saveProject } from '../services/db';

const MAX_CANVAS_DIM = 3072;

export const useProjectState = (initialProject: Partial<SavedProject>, containerRef: React.RefObject<HTMLDivElement>) => {
    const [projectId] = useState<string>(initialProject.id || Date.now().toString());
    const [canvasRes, setCanvasRes] = useState({ w: initialProject.width || 0, h: initialProject.height || 0 });
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isSaving, setIsSaving] = useState(false);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

    useEffect(() => {
        const init = async () => {
          if (initialProject.history && initialProject.history.length > 0) {
            const w = initialProject.width!;
            const h = initialProject.height!;
            setCanvasRes({ w, h });
            
            const loadedHistory: ImageData[] = [];
            const tempC = document.createElement('canvas');
            tempC.width = w;
            tempC.height = h;
            const ctx = tempC.getContext('2d');
            
            if (ctx) {
                for (const b64 of initialProject.history) {
                    const img = new Image();
                    img.src = b64;
                    await new Promise(r => img.onload = r);
                    ctx.clearRect(0,0,w,h);
                    ctx.drawImage(img, 0, 0);
                    loadedHistory.push(ctx.getImageData(0,0,w,h));
                }
                setHistory(loadedHistory);
                setHistoryIndex(initialProject.historyIndex ?? (loadedHistory.length - 1));
                
                if (containerRef.current) {
                    const cw = containerRef.current.clientWidth;
                    const scale = Math.min(1, cw / w);
                    const tx = (cw - w * scale) / 2;
                    setTransform({ scale: scale > 0 ? scale : 1, x: tx, y: 20 });
                }
            }
          } else if (initialProject.thumbnail) {
            const img = new Image();
            img.src = initialProject.thumbnail;
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
                  const ratio = Math.min(MAX_CANVAS_DIM / w, MAX_CANVAS_DIM / h);
                  w = Math.floor(w * ratio);
                  h = Math.floor(h * ratio);
                }
                setCanvasRes({ w, h });
    
                if (containerRef.current) {
                  const cw = containerRef.current.clientWidth;
                  const scale = Math.min(1, cw / w);
                  const tx = (cw - w * scale) / 2;
                  setTransform({ scale: scale > 0 ? scale : 1, x: tx, y: 20 });
                }
    
                const tempC = document.createElement('canvas');
                tempC.width = w;
                tempC.height = h;
                const ctx = tempC.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, w, h);
                  setHistory([ctx.getImageData(0, 0, w, h)]);
                  setHistoryIndex(0);
                }
            };
          }
        };
        init();
    }, [initialProject]);

    // Auto Save
    useEffect(() => {
        if (history.length === 0 || historyIndex === -1) return;
        const timeout = setTimeout(async () => {
            setIsSaving(true);
            try {
                const historyStrings: string[] = [];
                const tempC = document.createElement('canvas');
                tempC.width = canvasRes.w;
                tempC.height = canvasRes.h;
                const ctx = tempC.getContext('2d');
                
                if (ctx) {
                    for (let i = 0; i <= historyIndex; i++) { 
                        if (history[i]) {
                          ctx.putImageData(history[i], 0, 0);
                          historyStrings.push(tempC.toDataURL('image/png'));
                        }
                    }
                }
                
                let thumbnail = '';
                if (ctx && historyIndex >= 0 && history[historyIndex]) {
                     ctx.putImageData(history[historyIndex], 0, 0);
                     const thumbC = document.createElement('canvas');
                     const ar = canvasRes.w / canvasRes.h;
                     thumbC.width = 400;
                     thumbC.height = 400 / ar;
                     const tCtx = thumbC.getContext('2d');
                     tCtx?.drawImage(tempC, 0, 0, thumbC.width, thumbC.height);
                     thumbnail = thumbC.toDataURL('image/jpeg', 0.7);
                     thumbC.width = 0; thumbC.height = 0;
                }
                tempC.width = 0; tempC.height = 0;
    
                await saveProject({
                    id: projectId,
                    createdAt: initialProject.createdAt || Date.now(),
                    updatedAt: Date.now(),
                    thumbnail,
                    history: historyStrings,
                    historyIndex,
                    width: canvasRes.w,
                    height: canvasRes.h
                });
            } catch (e) { console.error("Auto save failed", e); } 
            finally { setIsSaving(false); }
        }, 1500); 
        return () => clearTimeout(timeout);
    }, [history, historyIndex, projectId, canvasRes]);

    return {
        history, setHistory,
        historyIndex, setHistoryIndex,
        projectId,
        canvasRes, setCanvasRes,
        transform, setTransform,
        isSaving
    };
};