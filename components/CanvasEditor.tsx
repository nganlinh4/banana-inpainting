import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import Toast from './Toast';
import ImageCropper from './ImageCropper';
import CanvasToolbar from './CanvasToolbar';
import AssetLibrary from './AssetLibrary';
import ApiKeyModal from './ApiKeyModal';
import { SelectionBox, StagedLayer, Language, SavedProject, ReferenceAsset, DrawingMode, LayerTool, MaskObject } from '../types';
import { saveAsset, getAllAssets, deleteAsset } from '../services/db';
import { translations } from '../translations';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useCanvasRender } from '../hooks/useCanvasRender';
import { useProjectState } from '../hooks/useProjectState';
import { useGeneration } from '../hooks/useGeneration';
import { getCanvasPos, isPointInMaskObject, checkMaskHandles, checkLayerHandles, getCursorForHandle, getMaskBoundingBox, calculateMaskTransform } from '../utils/canvasMath';
import { drawManualEraser, getCompositeCanvas } from '../utils/drawUtils';

interface CanvasEditorProps {
  initialProject: Partial<SavedProject>;
  onBack: () => void;
  lang: Language;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ initialProject, onBack, lang }) => {
  const t = translations[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  
  const { history, setHistory, historyIndex, setHistoryIndex, projectId, canvasRes, transform, setTransform, isSaving } = useProjectState(initialProject, containerRef);
  const { processingRegion, setProcessingRegion, generateImage } = useGeneration();

  const [selection, setSelection] = useState<SelectionBox | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('NONE');
  const [stagedLayer, setStagedLayer] = useState<StagedLayer | null>(null);
  const [layerHistory, setLayerHistory] = useState<StagedLayer[]>([]);
  const [layerHistoryIndex, setLayerHistoryIndex] = useState(-1);
  const [layerTool, setLayerTool] = useState<LayerTool>('MOVE');
  const [eraserSettings, setEraserSettings] = useState({ size: 50, softness: 50 });
  
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastDrawPos = useRef<{x: number, y: number} | null>(null);
  const brushCacheRef = useRef<HTMLCanvasElement | null>(null);
  const brushCacheParamsRef = useRef({ radius: 0, softness: -1 });

  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [savedAssets, setSavedAssets] = useState<ReferenceAsset[]>([]); 
  const [editingAsset, setEditingAsset] = useState<ReferenceAsset | null>(null); 
  const [isLibraryDragOver, setIsLibraryDragOver] = useState(false);
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);
  
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [isLayerErasing, setIsLayerErasing] = useState(false);
  
  const [maskObjects, setMaskObjects] = useState<MaskObject[]>([]);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [hoverMaskId, setHoverMaskId] = useState<string | null>(null);
  
  const [isTransformingMask, setIsTransformingMask] = useState(false);
  const [maskTransformHandle, setMaskTransformHandle] = useState<string | null>(null); 
  const [maskInitialTransform, setMaskInitialTransform] = useState<MaskObject['transform'] | null>(null);
  const [hoverMaskHandle, setHoverMaskHandle] = useState<string | null>(null);

  // Use Ref for path to avoid re-rendering on every mouse move (optimization)
  const currentPathRef = useRef<{x: number, y: number}[]>([]);
  
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [hoverHandle, setHoverHandle] = useState<string | null>(null);
  const [initialLayerState, setInitialLayerState] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [initialTransform, setInitialTransform] = useState({ x: 0, y: 0 });
  const [isAdjustingFeather, setIsAdjustingFeather] = useState(false);

  const [groqKey, setGroqKey] = useState<string>('');
  const [showGroqModal, setShowGroqModal] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success' | 'info'} | null>(null);
  
  const transformRef = useRef(transform);
  const lastNudgeTimeRef = useRef<number>(0);
  const nudgeState = useRef({ count: 0, lastTime: 0 });

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => setToast({ message, type });
  
  const hasTransforms = useMemo(() => maskObjects.some(m => Math.abs(m.transform.x) > 0.1 || Math.abs(m.transform.y) > 0.1 || Math.abs(m.transform.rotation) > 0.01 || Math.abs(m.transform.scaleX - 1) > 0.01 || Math.abs(m.transform.scaleY - 1) > 0.01), [maskObjects]);

  const { isRecording, isTranscribing, toggleRecording, micRippleRef } = useVoiceInput({ apiKey: groqKey, onTranscriptionComplete: (text) => setPrompt(text), onError: (msg) => msg === "MISSING_KEY" ? setShowGroqModal(true) : showToast(t.errorGenerating, 'error') });

  useCanvasRender(canvasRef, { history, historyIndex, stagedLayer, selection, processingRegion, transform, isAdjustingFeather, activeHandle, lastNudgeTime: lastNudgeTimeRef.current, maskObjects, selectedMaskId, hoverMaskId, currentPath: currentPathRef.current, drawingMode, layerTool, eraserSettings, isLayerErasing, maskCanvasRef });

  useEffect(() => { transformRef.current = transform; }, [transform]);
  useEffect(() => { const savedKey = localStorage.getItem('banana_groq_key'); if (savedKey) setGroqKey(savedKey); loadAssets(); }, []);

  useEffect(() => {
      if (!stagedLayer) { maskCanvasRef.current = null; setLayerTool('MOVE'); return; }
      if (!maskCanvasRef.current || (maskCanvasRef.current.width !== stagedLayer.image.width || maskCanvasRef.current.height !== stagedLayer.image.height)) {
          const mCanvas = document.createElement('canvas');
          mCanvas.width = stagedLayer.image.width; mCanvas.height = stagedLayer.image.height;
          maskCanvasRef.current = mCanvas;
      }
      const ctx = maskCanvasRef.current?.getContext('2d');
      if (ctx) {
          ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'black'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          if (stagedLayer.maskImage && !stagedLayer.maskImage.complete) stagedLayer.maskImage.onload = () => ctx.drawImage(stagedLayer.maskImage!, 0, 0);
          else if (stagedLayer.maskImage) ctx.drawImage(stagedLayer.maskImage, 0, 0);
      }
  }, [stagedLayer]); 

  useEffect(() => { 
      if (!selection && !processingRegion) { 
          setDrawingMode('NONE'); 
          setMaskObjects([]); 
          currentPathRef.current.length = 0; // Clear path ref
          setSelectedMaskId(null); 
      } 
  }, [selection, processingRegion]);

  const loadAssets = async () => { try { setSavedAssets(await getAllAssets()); } catch (e) { console.error("Failed to load assets", e); } };

  // Sync Cursor
  useEffect(() => { if (cursorRef.current && (layerTool !== 'ERASER' || !stagedLayer || processingRegion)) cursorRef.current.style.display = 'none'; }, [layerTool, stagedLayer, processingRegion]);

  // Event Logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0005;
      const current = transformRef.current;
      const newScale = Math.max(0.05, Math.min(10, current.scale * (1 + delta)));
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
      setTransform({ scale: newScale, x: mouseX - (mouseX - current.x) * (newScale / current.scale), y: mouseY - (mouseY - current.y) * (newScale / current.scale) });
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const pushLayerHistory = (layer: StagedLayer) => { const newHistory = layerHistory.slice(0, layerHistoryIndex + 1); newHistory.push(layer); setLayerHistory(newHistory); setLayerHistoryIndex(newHistory.length - 1); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) setIsSpaceDown(true); }
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedMaskId) { setMaskObjects(prev => prev.filter(obj => obj.id !== selectedMaskId)); setSelectedMaskId(null); }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') { setIsSpaceDown(false); setIsPanning(false); } };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [selectedMaskId]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (processingRegion) return;
    const isRightClick = ('button' in e && e.button === 2);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const pos = getCanvasPos(clientX, clientY, canvasRef.current);

    if (isRightClick || isSpaceDown) { setIsPanning(true); setDragStart({ x: clientX, y: clientY }); setInitialTransform({ ...transformRef.current }); return; }
    
    if (selection && (drawingMode === 'BRUSH' || drawingMode === 'ERASER')) {
        if (selectedMaskId) {
            const m = maskObjects.find(obj => obj.id === selectedMaskId);
            if (m) {
                const handle = checkMaskHandles(pos, m, selection, transform.scale);
                if (handle) { setIsTransformingMask(true); setMaskTransformHandle(handle); setDragStart({ x: clientX, y: clientY }); setMaskInitialTransform({ ...m.transform }); return; }
            }
        }
        const clickedMask = maskObjects.slice().reverse().find(m => isPointInMaskObject(pos, m, selection));
        if (drawingMode === 'ERASER') {
             if (clickedMask) { setMaskObjects(prev => prev.filter(m => m.id !== clickedMask.id)); if (selectedMaskId === clickedMask.id) setSelectedMaskId(null); }
             setIsDrawingMask(true); return;
        }
        if (clickedMask) { setSelectedMaskId(clickedMask.id); setIsTransformingMask(true); setMaskTransformHandle('move'); setDragStart({ x: clientX, y: clientY }); setMaskInitialTransform({ ...clickedMask.transform }); return; }
        if (pos.x >= selection.x && pos.x <= selection.x + selection.width && pos.y >= selection.y && pos.y <= selection.y + selection.height) {
            setSelectedMaskId(null); setIsDrawingMask(true);
            if (drawingMode === 'BRUSH') {
                currentPathRef.current.length = 0;
                currentPathRef.current.push({x: pos.x - selection.x, y: pos.y - selection.y});
            }
            return;
        }
    }
    if (stagedLayer) {
      if (layerTool === 'ERASER') {
          const buffer = 100;
          if (pos.x >= stagedLayer.x - buffer && pos.x <= stagedLayer.x + stagedLayer.width + buffer && pos.y >= stagedLayer.y - buffer && pos.y <= stagedLayer.y + stagedLayer.height + buffer) {
              setIsLayerErasing(true); lastDrawPos.current = null;
              drawManualEraser(pos.x, pos.y, true, stagedLayer, maskCanvasRef.current, transformRef.current.scale, eraserSettings, lastDrawPos.current, brushCacheRef, brushCacheParamsRef);
              return;
          }
      } else {
          const handle = checkLayerHandles(pos.x, pos.y, stagedLayer, transform.scale);
          if (handle) { setActiveHandle(handle); setDragStart({ x: clientX, y: clientY }); setInitialLayerState({ x: stagedLayer.x, y: stagedLayer.y, w: stagedLayer.width, h: stagedLayer.height }); return; }
          if (pos.x > stagedLayer.x && pos.x < stagedLayer.x + stagedLayer.width && pos.y > stagedLayer.y && pos.y < stagedLayer.y + stagedLayer.height) { setIsPanning(true); setDragStart({ x: clientX, y: clientY }); setInitialTransform({ ...transformRef.current }); return; }
      }
    }
    if (stagedLayer) { setIsPanning(true); setDragStart({ x: clientX, y: clientY }); setInitialTransform({ ...transformRef.current }); return; }
    if (drawingMode === 'NONE') {
        setIsDrawingSelection(true); setDragStart({ x: clientX, y: clientY });
        const cx = Math.max(0, Math.min(canvasRes.w, pos.x)); const cy = Math.max(0, Math.min(canvasRes.h, pos.y));
        setInitialLayerState({ x: cx, y: cy, w: 0, h: 0 }); setSelection({ x: cx, y: cy, width: 0, height: 0 });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const currentPos = getCanvasPos(clientX, clientY, canvasRef.current);
      if (cursorRef.current && stagedLayer && layerTool === 'ERASER' && !processingRegion && !isPanning && !activeHandle) {
         const bs = eraserSettings.size; cursorRef.current.style.display = 'block'; cursorRef.current.style.width = `${bs}px`; cursorRef.current.style.height = `${bs}px`; cursorRef.current.style.transform = `translate(${clientX - bs/2}px, ${clientY - bs/2}px)`; cursorRef.current.style.borderRadius = '50%';
      } else if (cursorRef.current) cursorRef.current.style.display = 'none';

      if (processingRegion) return;
      if (isPanning) {
        const dx = clientX - dragStart.x, dy = clientY - dragStart.y;
        setTransform(prev => { const next = { ...prev, x: initialTransform.x + dx, y: initialTransform.y + dy }; transformRef.current = next; return next; });
        return;
      }
      if (isLayerErasing && stagedLayer && maskCanvasRef.current) {
          const newPos = drawManualEraser(currentPos.x, currentPos.y, false, stagedLayer, maskCanvasRef.current, transformRef.current.scale, eraserSettings, lastDrawPos.current, brushCacheRef, brushCacheParamsRef);
          if(newPos) lastDrawPos.current = newPos; return;
      }
      if (isTransformingMask && selectedMaskId && maskInitialTransform && selection && maskTransformHandle) {
          const canvas = canvasRef.current; if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const scaleToCanvas = canvas.width / rect.width;
          const dx = (clientX - dragStart.x) * scaleToCanvas, dy = (clientY - dragStart.y) * scaleToCanvas;
          
          setMaskObjects(prev => prev.map(obj => {
              if (obj.id !== selectedMaskId) return obj;
              let newTransform = { ...obj.transform };
              if (maskTransformHandle === 'move') { newTransform.x = maskInitialTransform.x + dx; newTransform.y = maskInitialTransform.y + dy; }
              else if (maskTransformHandle === 'rotate') { newTransform.rotation = maskInitialTransform.rotation + (dx * 0.01); }
              else { newTransform = calculateMaskTransform(maskTransformHandle, currentPos, selection, obj, maskInitialTransform, e.ctrlKey || e.metaKey); }
              return { ...obj, transform: newTransform };
          }));
          return;
      }
      if (isDrawingMask && selection) {
          if (drawingMode === 'BRUSH') {
              const newP = {x: currentPos.x - selection.x, y: currentPos.y - selection.y};
              const path = currentPathRef.current;
              // Throttle points to save memory/cpu on high res images (distance check > 2px)
              if (path.length > 0) {
                 const lastP = path[path.length - 1];
                 const dist = Math.hypot(newP.x - lastP.x, newP.y - lastP.y);
                 if (dist > 2) path.push(newP);
              } else {
                 path.push(newP);
              }
              // Note: We do NOT set state here. The render hook reads the mutable ref currentPathRef.
          }
          else if (drawingMode === 'ERASER') {
             const hovered = maskObjects.slice().reverse().find(m => isPointInMaskObject(currentPos, m, selection));
             if (hovered) { setMaskObjects(prev => prev.filter(m => m.id !== hovered.id)); if (selectedMaskId === hovered.id) setSelectedMaskId(null); }
          }
          return;
      }
      if (stagedLayer && activeHandle && initialLayerState) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const scaleToCanvas = canvasRef.current!.width / rect.width;
        const dx = (clientX - dragStart.x) * scaleToCanvas, dy = (clientY - dragStart.y) * scaleToCanvas;
        let newLayer = { ...stagedLayer }, { x: ix, y: iy, w: iw, h: ih } = initialLayerState;

        if (activeHandle === 'move') { newLayer.x = ix + dx; newLayer.y = iy + dy; } 
        else {
           const ar = iw / ih; const isCorner = activeHandle.length === 2; 
           let nw = iw, nh = ih, nx = ix, ny = iy;
           if (isCorner) {
              const deltaW = activeHandle.includes('e') ? dx : -dx;
              nw = Math.max(20, iw + (e.ctrlKey ? deltaW * 2 : deltaW)); nh = nw / ar;
              if (e.ctrlKey) { nx = ix + (iw - nw) / 2; ny = iy + (ih - nh) / 2; } 
              else { if (activeHandle.includes('w')) nx = ix + (iw - nw); if (activeHandle.includes('n')) ny = iy + (ih - nh); }
           } else {
              if (activeHandle === 'e' || activeHandle === 'w') {
                  const delta = activeHandle === 'e' ? dx : -dx;
                  nw = Math.max(20, iw + (e.ctrlKey ? delta * 2 : delta));
                  if (e.ctrlKey) nx = ix + (iw - nw) / 2; else if (activeHandle === 'w') nx = ix + (iw - nw);
              } else {
                  const delta = activeHandle === 's' ? dy : -dy;
                  nh = Math.max(20, ih + (e.ctrlKey ? delta * 2 : delta));
                  if (e.ctrlKey) ny = iy + (ih - nh) / 2; else if (activeHandle === 'n') ny = iy + (ih - nh);
              }
           }
           newLayer.x = nx; newLayer.y = ny; newLayer.width = nw; newLayer.height = nh;
        }
        setStagedLayer(newLayer);
      } else if (isDrawingSelection && initialLayerState) {
        const mx = Math.max(0, Math.min(canvasRes.w, currentPos.x)); const my = Math.max(0, Math.min(canvasRes.h, currentPos.y));
        const sx = initialLayerState.x; const sy = initialLayerState.y;
        setSelection({ x: mx > sx ? sx : mx, y: my > sy ? sy : my, width: Math.abs(mx - sx), height: Math.abs(my - sy) });
      }
    };
    const handleMouseUp = () => {
      if (isPanning) setTransform(transformRef.current);
      if (isLayerErasing && maskCanvasRef.current && stagedLayer) {
          const img = new Image(); img.src = maskCanvasRef.current.toDataURL();
          const ul = { ...stagedLayer, maskImage: img }; setStagedLayer(ul); pushLayerHistory(ul);
      }
      lastDrawPos.current = null;
      if (isDrawingMask && selection && drawingMode === 'BRUSH' && currentPathRef.current.length > 2) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          currentPathRef.current.forEach(p => { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; });
          const center = { x: minX + (maxX - minX)/2, y: minY + (maxY - minY)/2 };
          setMaskObjects(prev => [...prev, { id: Date.now().toString() + Math.random(), points: currentPathRef.current.map(p => ({x: p.x - center.x, y: p.y - center.y})), center, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 } }]);
      }
      setIsDrawingSelection(false); setIsDrawingMask(false); setIsLayerErasing(false); setIsTransformingMask(false); setMaskTransformHandle(null);
      currentPathRef.current.length = 0; // Clear path ref
      setActiveHandle(null); setIsPanning(false); setInitialLayerState(null);
      if (selection && (selection.width < 10 || selection.height < 10)) { setSelection(null); setDrawingMode('NONE'); setMaskObjects([]); setSelectedMaskId(null); }
      else if (selection && isDrawingSelection) { setMaskObjects([]); setSelectedMaskId(null); }
      if (stagedLayer && initialLayerState && (Math.abs(stagedLayer.x - initialLayerState.x) > 0.1 || Math.abs(stagedLayer.y - initialLayerState.y) > 0.1)) pushLayerHistory(stagedLayer);
    };
    if (isDrawingSelection || isDrawingMask || isLayerErasing || activeHandle || isPanning || (stagedLayer && layerTool === 'ERASER') || isTransformingMask) {
      window.addEventListener('mousemove', handleMouseMove); window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp); window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDrawingSelection, isDrawingMask, isLayerErasing, drawingMode, activeHandle, isPanning, dragStart, initialLayerState, initialTransform, stagedLayer, selection, processingRegion, canvasRes, transform, layerHistory, layerHistoryIndex, layerTool, eraserSettings, isTransformingMask, selectedMaskId, maskInitialTransform, maskTransformHandle]);

  const handleGenerate = async () => {
      const result = await generateImage({ selection, prompt, maskObjects, hasTransforms, history, historyIndex, canvasRes, referenceImages, t, showToast });
      if (result) {
          setSelection(null); setDrawingMode('NONE'); setStagedLayer(result); setLayerHistory([result]); setLayerHistoryIndex(0); setLayerTool('MOVE');
          setReferenceImages([]); setMaskObjects([]); setSelectedMaskId(null);
      }
  };

  const onApplyLayer = () => {
    const ctx = getCompositeCanvas(canvasRes, history, historyIndex, stagedLayer);
    if (!ctx) return;
    const newData = ctx.getImageData(0, 0, canvasRes.w, canvasRes.h);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory); setHistoryIndex(newHistory.length - 1); setStagedLayer(null); setPrompt('');
  };

  const downloadImage = () => {
    const ctx = getCompositeCanvas(canvasRes, history, historyIndex, stagedLayer);
    if (ctx) {
        const link = document.createElement('a'); link.download = `banana-inpainting-${projectId}.png`;
        link.href = ctx.canvas.toDataURL('image/png', 1.0); link.click();
    }
  };

  // Asset Helpers
  const addAsset = async (b64: string) => { const a = { id: Math.random().toString(36), data: b64, createdAt: Date.now() }; await saveAsset(a); setSavedAssets(p => [a, ...p]); };
  const handleRefFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { Array.from(e.target.files || []).forEach(f => { const r = new FileReader(); r.onload = (ev) => { if(ev.target?.result) { setReferenceImages(p => [...p, ev.target!.result as string]); addAsset(ev.target!.result as string); }}; r.readAsDataURL(f); }); e.target.value=''; };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsCanvasDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      if (selection) {
        Array.from(e.dataTransfer.files).forEach((f: File) => {
          if (f.type.startsWith('image/')) {
            const r = new FileReader();
            r.onload = (ev) => {
              if (ev.target?.result) {
                setReferenceImages(p => [...p, ev.target!.result as string]);
                addAsset(ev.target!.result as string);
              }
            };
            r.readAsDataURL(f);
          }
        });
      } else {
        showToast(t.drawBoxHint, 'info');
      }
      return;
    }
    const ad = e.dataTransfer.getData('application/x-banana-asset');
    if (ad) { if (selection) setReferenceImages(p => [...p, ad]); else { const p = getCanvasPos(e.clientX, e.clientY, canvasRef.current); const s = 512; let nx = Math.max(0, Math.min(canvasRes.w - s, p.x - s/2)), ny = Math.max(0, Math.min(canvasRes.h - s, p.y - s/2)); setSelection({ x: nx, y: ny, width: s, height: s }); setReferenceImages([ad]); showToast(t.drawBoxHint, 'success'); } }
  };

  // Paste Handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        if (!e.clipboardData || e.clipboardData.files.length === 0) return;
        
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
            e.preventDefault();
            if (selection) {
                const r = new FileReader();
                r.onload = (ev) => {
                    if (ev.target?.result) {
                        const b64 = ev.target.result as string;
                        setReferenceImages(p => [...p, b64]);
                        addAsset(b64);
                        showToast(t.savedToGallery || "Image added", 'success');
                    }
                };
                r.readAsDataURL(file);
            } else {
                showToast(t.drawBoxHint, 'info');
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selection, t]);

  let cursorStyle = 'default';
  if (processingRegion) cursorStyle = 'wait';
  else if (isPanning) cursorStyle = 'grabbing';
  else if (isSpaceDown) cursorStyle = 'grab';
  else if (isTransformingMask) cursorStyle = selectedMaskId ? getCursorForHandle(maskTransformHandle || 'default', maskObjects.find(m => m.id === selectedMaskId)?.transform.rotation) : 'default';
  else if (isDrawingMask && !selectedMaskId) cursorStyle = 'crosshair'; 
  else if (selection && selectedMaskId && hoverMaskHandle) cursorStyle = getCursorForHandle(hoverMaskHandle, maskObjects.find(m => m.id === selectedMaskId)?.transform.rotation);
  else if (selection && !isDrawingMask) cursorStyle = hoverMaskId ? 'move' : 'crosshair';
  else if (stagedLayer) cursorStyle = layerTool === 'ERASER' ? 'none' : activeHandle ? getCursorForHandle(activeHandle) : hoverHandle ? getCursorForHandle(hoverHandle) : 'grab'; 
  else if (drawingMode === 'BRUSH' || drawingMode === 'ERASER') cursorStyle = 'crosshair'; else cursorStyle = 'crosshair';

  const activeBox = selection || processingRegion;

  return (
    <div className="flex flex-col items-center w-full max-w-[1200px] mx-auto animate-float-up pb-32">
      <svg style={{ display: 'none' }}><defs><filter id="banana-mask-filter"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" /></filter></defs></svg>
      {createPortal(<div ref={cursorRef} className="pointer-events-none fixed border border-white/80 rounded-full z-[9999] shadow-[0_0_2px_rgba(0,0,0,0.8)] mix-blend-difference" style={{ display: 'none', top: 0, left: 0 }}><div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-white/80 -translate-x-1/2 -translate-y-1/2 rounded-full"></div></div>, document.body)}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {editingAsset && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"><ImageCropper src={editingAsset.data} onCancel={() => setEditingAsset(null)} onConfirm={(nd) => { setSavedAssets(p => p.map(a => a.id === editingAsset.id ? { ...a, data: nd } : a)); setEditingAsset(null); }} t={t} /></div>)}
      {showGroqModal && (<ApiKeyModal t={t} onCancel={() => setShowGroqModal(false)} onSave={(k) => { localStorage.setItem('banana_groq_key', k); setGroqKey(k); setShowGroqModal(false); showToast('Key Saved', 'success'); }} />)}
      
      <CanvasToolbar onBack={onBack} onUndo={() => { setHistoryIndex(i => Math.max(0, i - 1)); setStagedLayer(null); setSelection(null); setReferenceImages([]); }} onRedo={() => { setHistoryIndex(i => Math.min(history.length - 1, i + 1)); setStagedLayer(null); setSelection(null); setReferenceImages([]); }} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1} isProcessing={!!processingRegion} stagedLayer={stagedLayer} setStagedLayer={setStagedLayer} onApplyLayer={onApplyLayer} setIsAdjustingFeather={setIsAdjustingFeather} pushLayerHistory={pushLayerHistory} layerTool={layerTool} setLayerTool={setLayerTool} eraserSettings={eraserSettings} setEraserSettings={setEraserSettings} selection={selection} prompt={prompt} setPrompt={setPrompt} onGenerate={handleGenerate} isRecording={isRecording} isTranscribing={isTranscribing} toggleRecording={toggleRecording} micRippleRef={micRippleRef} onDownload={downloadImage} t={t} drawingMode={drawingMode} setDrawingMode={setDrawingMode} hasTransforms={hasTransforms} />

      <div ref={containerRef} onContextMenu={(e) => e.preventDefault()} className="relative shadow-2xl bg-[#0f0f13] border border-white/10 overflow-hidden select-none touch-none rounded-2xl group" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown} onMouseMove={(e) => { if (!isDrawingSelection && !isDrawingMask && !isLayerErasing && !activeHandle && !isPanning && !processingRegion && !isTransformingMask) { const pos = getCanvasPos(e.clientX, e.clientY, canvasRef.current); setHoverHandle(stagedLayer && layerTool === 'MOVE' ? checkLayerHandles(pos.x, pos.y, stagedLayer, transform.scale) : null); if (selection && maskObjects.length > 0) { if (selectedMaskId) { const m = maskObjects.find(obj => obj.id === selectedMaskId); if (m) { const h = checkMaskHandles(pos, m, selection, transform.scale); setHoverMaskHandle(h); if (h) return; } } else setHoverMaskHandle(null); const hovered = maskObjects.slice().reverse().find(m => isPointInMaskObject(pos, m, selection)); setHoverMaskId(hovered ? hovered.id : null); } else { setHoverMaskId(null); setHoverMaskHandle(null); } } }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!isCanvasDragOver) setIsCanvasDragOver(true); }} onDrop={handleDrop} onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsCanvasDragOver(false); }} style={{ width: '100%', height: '70vh', cursor: cursorStyle }}>
        <div ref={contentRef} className="origin-top-left" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
            <canvas ref={canvasRef} width={canvasRes.w} height={canvasRes.h} className="block bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#1a1b26]" />
            {activeBox && (<div className={`absolute flex items-center gap-2 z-40 transition-all duration-200 ${processingRegion ? 'pointer-events-none' : ''}`} style={{ left: `${activeBox.x}px`, top: activeBox.y > 70 ? `${activeBox.y - 50}px` : `${activeBox.y + activeBox.height + 10}px`, transform: `scale(${1/transform.scale})`, transformOrigin: 'top left' }} onMouseDown={(e) => e.stopPropagation()}>
                    {referenceImages.map((imgSrc, idx) => (<div key={idx} className={`w-10 h-10 rounded-lg shadow-clay overflow-hidden relative cursor-pointer border border-white/20 bg-white ${processingRegion ? 'animate-pulse-slow scale-110 shadow-[0_0_15px_rgba(179,136,255,0.6)]' : 'hover:scale-105 transition-transform'}`} onClick={() => !processingRegion && setReferenceImages(prev => prev.filter((_, i) => i !== idx))}><img src={imgSrc} alt="Ref" className="w-full h-full object-cover" />{!processingRegion && (<div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center"><span className="material-symbols-rounded text-white text-sm">close</span></div>)}</div>))}
                    {!processingRegion && (<label className="w-10 h-10 rounded-lg shadow-clay bg-white dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform border border-white/40 hover:border-purple/50 group"><input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleRefFileSelect} /><div className="relative"><span className="material-symbols-rounded text-purple-500 dark:text-purple-400 text-xl">image</span><span className="absolute -top-1 -right-1 bg-pink text-[8px] text-white w-3 h-3 flex items-center justify-center rounded-full font-bold shadow-sm">+</span></div></label>)}
            </div>)}
            {processingRegion && (<div className="absolute pointer-events-none" style={{ left: `${processingRegion.x}px`, top: `${processingRegion.y}px`, width: `${processingRegion.width}px`, height: `${processingRegion.height}px` }}><div className="ai-glow-border"></div><div className="ai-glow-surface"></div></div>)}
        </div>
        {isCanvasDragOver && (<div className="absolute inset-0 z-[60] flex items-center justify-center bg-purple-500/20 backdrop-blur-sm border-4 border-purple-400 border-dashed rounded-2xl pointer-events-none animate-in fade-in duration-200"><div className="flex flex-col items-center justify-center text-white bg-black/40 p-6 rounded-3xl backdrop-blur-md shadow-clay"><span className="material-symbols-rounded text-6xl mb-2 animate-bounce">add_photo_alternate</span><span className="text-xl font-bold">{t.libraryDragHint || "Drop reference image"}</span></div></div>)}
        {stagedLayer && (<div className="absolute bottom-6 right-6 flex gap-3 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300"><Button variant="secondary" onClick={() => { if (layerHistoryIndex > 0) { setLayerHistoryIndex(i => i-1); setStagedLayer(layerHistory[layerHistoryIndex-1]); }}} disabled={layerHistoryIndex <= 0} className="!p-0 !w-12 !h-12 !rounded-full !shadow-lg !bg-white/80 dark:!bg-gray-800/80 !text-gray-800 dark:!text-white backdrop-blur-sm border border-white/20"><span className="material-symbols-rounded">undo</span></Button><Button variant="secondary" onClick={() => { if (layerHistoryIndex < layerHistory.length - 1) { setLayerHistoryIndex(i => i+1); setStagedLayer(layerHistory[layerHistoryIndex+1]); }}} disabled={layerHistoryIndex >= layerHistory.length - 1} className="!p-0 !w-12 !h-12 !rounded-full !shadow-lg !bg-white/80 dark:!bg-gray-800/80 !text-gray-800 dark:!text-white backdrop-blur-sm border border-white/20"><span className="material-symbols-rounded">redo</span></Button></div>)}
      </div>

      <div className="mt-4 w-full grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-gray-500 dark:text-gray-400 opacity-90"><div className="flex items-center gap-1"><span className="material-symbols-rounded text-base">mouse</span><span>{t.zoomHint}</span></div><div className="flex items-center gap-1"><span className="material-symbols-rounded text-base">pan_tool</span><span>{t.panHint}</span></div>{stagedLayer ? (<><div className="flex items-center gap-1 animate-pulse-slow"><span className="material-symbols-rounded text-base">open_with</span><span>{t.moveHint}</span></div><div className="flex items-center gap-1 animate-pulse-slow"><span className="material-symbols-rounded text-base">keyboard_arrow_up</span><span>{t.nudgeHint}</span></div><div className="flex items-center gap-1 animate-pulse-slow"><span className="material-symbols-rounded text-base">aspect_ratio</span><span>{t.resizeHint}</span></div><div className="flex items-center gap-1 text-purple-400"><span className="material-symbols-rounded text-base">keyboard_command_key</span><span>{t.ctrlResize}</span></div></>) : <div className="flex items-center gap-1"><span className="material-symbols-rounded text-base">drag_click</span><span>{selection ? t.maskHint : t.drawHint}</span></div>}</div>
        <div className="flex flex-col items-end gap-1 text-sm font-bold">{isRecording && <span className="text-red-500 dark:text-red-400 animate-pulse flex items-center gap-1"><span className="material-symbols-rounded text-base">mic</span> {t.listening}</span>}{isTranscribing && <span className="text-purple-500 dark:text-purple-400 animate-pulse flex items-center gap-1"><span className="material-symbols-rounded text-base">graphic_eq</span> {t.transcribing}</span>}{isSaving && <div className="text-purple-500 dark:text-purple-400 flex items-center gap-1 animate-pulse"><span className="material-symbols-rounded text-base">cloud_upload</span>{t.savedToGallery}</div>}</div>
      </div>

      <AssetLibrary 
        assets={savedAssets} 
        isDragOver={isLibraryDragOver} 
        t={t} 
        onDragOver={(e) => { e.preventDefault(); setIsLibraryDragOver(true); }} 
        onDragLeave={() => setIsLibraryDragOver(false)} 
        onDrop={(e) => { 
          e.preventDefault(); 
          e.stopPropagation(); 
          setIsLibraryDragOver(false); 
          if (e.dataTransfer.types.includes('application/x-banana-asset')) return; 
          if (e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach((f: File) => {
              const r = new FileReader(); 
              r.onload = (ev) => { 
                if(ev.target?.result) addAsset(ev.target!.result as string); 
              }; 
              r.readAsDataURL(f); 
            }); 
          }
        }} 
        onUpload={(e) => { if (e.target.files && e.target.files.length > 0) Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = (ev) => { if(ev.target?.result) addAsset(ev.target!.result as string); }; r.readAsDataURL(f); }); e.target.value = ''; }} 
        onEdit={setEditingAsset} 
        onDelete={async (id) => { await deleteAsset(id); setSavedAssets(p => p.filter(a => a.id !== id)); }} 
        onDragStart={(e, data) => { e.dataTransfer.setData('application/x-banana-asset', data); e.dataTransfer.effectAllowed = 'copy'; }} 
      />
    </div>
  );
};

export default CanvasEditor;