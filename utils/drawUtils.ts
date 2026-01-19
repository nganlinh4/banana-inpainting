
import { StagedLayer } from "../types";

export const drawManualEraser = (
    cx: number, 
    cy: number, 
    isStarting: boolean,
    stagedLayer: StagedLayer | null,
    maskCanvas: HTMLCanvasElement | null,
    transformScale: number,
    eraserSettings: { size: number, softness: number },
    lastDrawPos: { x: number, y: number } | null,
    brushCacheRef: { current: HTMLCanvasElement | null },
    brushCacheParamsRef: { current: { radius: number, softness: number } }
): { x: number, y: number } | null => {
    if (!maskCanvas || !stagedLayer) return lastDrawPos;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return lastDrawPos;

    const brushSizeLayerCss = eraserSettings.size / transformScale;
    const scaleX = stagedLayer.image.width / stagedLayer.width;
    const scaleY = stagedLayer.image.height / stagedLayer.height;
    const scaleToImage = (scaleX + scaleY) / 2;
    
    const brushDiameterImage = brushSizeLayerCss * scaleToImage;
    const radius = brushDiameterImage / 2;

    if (!brushCacheRef.current || 
        Math.abs(brushCacheParamsRef.current.radius - radius) > 0.5 || 
        brushCacheParamsRef.current.softness !== eraserSettings.softness) {
        
        const size = Math.ceil(radius * 2) + 4;
        const cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = size;
        cacheCanvas.height = size;
        const bCtx = cacheCanvas.getContext('2d');
        
        if (bCtx) {
            const center = size / 2;
            let innerRadius = radius * (1 - eraserSettings.softness / 100);
            if (innerRadius >= radius - 0.5) innerRadius = Math.max(0, radius - 1);
    
            const grad = bCtx.createRadialGradient(center, center, innerRadius, center, center, radius);
            if (eraserSettings.softness > 0) {
                 grad.addColorStop(0, '#FFFFFF'); 
                 grad.addColorStop(0.25, '#EEEEEE'); 
                 grad.addColorStop(0.5, '#AAAAAA'); 
                 grad.addColorStop(0.75, '#555555'); 
                 grad.addColorStop(1, '#000000');
            } else {
                 grad.addColorStop(0, '#FFFFFF');
                 grad.addColorStop(1, '#000000');
            }
            bCtx.fillStyle = grad;
            bCtx.beginPath();
            bCtx.arc(center, center, radius, 0, Math.PI * 2);
            bCtx.fill();
        }
        
        brushCacheRef.current = cacheCanvas;
        brushCacheParamsRef.current = { radius, softness: eraserSettings.softness };
    }

    const drawPoint = (x: number, y: number) => {
        if (!brushCacheRef.current) return;
        const size = brushCacheRef.current.width;
        const offset = size / 2;
        ctx.drawImage(brushCacheRef.current, x - offset, y - offset);
    };

    ctx.globalCompositeOperation = 'lighten';

    const lx = (cx - stagedLayer.x) * scaleX;
    const ly = (cy - stagedLayer.y) * scaleY;

    if (isStarting || !lastDrawPos) {
        drawPoint(lx, ly);
    } else {
        const dist = Math.hypot(lx - lastDrawPos.x, ly - lastDrawPos.y);
        const step = Math.max(1, radius * 0.25); 
        const angle = Math.atan2(ly - lastDrawPos.y, lx - lastDrawPos.x);
        
        for (let i = 0; i < dist; i += step) {
            const ix = lastDrawPos.x + Math.cos(angle) * i;
            const iy = lastDrawPos.y + Math.sin(angle) * i;
            drawPoint(ix, iy);
        }
        drawPoint(lx, ly);
    }
    
    return { x: lx, y: ly };
};

export const getCompositeCanvas = (
    canvasRes: {w: number, h: number},
    history: ImageData[],
    historyIndex: number,
    stagedLayer: StagedLayer | null
) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRes.w; tempCanvas.height = canvasRes.h;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    if (historyIndex >= 0 && history[historyIndex]) ctx.putImageData(history[historyIndex], 0, 0);
    if (stagedLayer) {
      ctx.save();
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = stagedLayer.width; layerCanvas.height = stagedLayer.height;
      const lCtx = layerCanvas.getContext('2d');
      if (lCtx) {
          lCtx.drawImage(stagedLayer.image, 0, 0, stagedLayer.width, stagedLayer.height);
          
          if (stagedLayer.maskImage) {
              lCtx.save();
              lCtx.filter = 'url(#banana-mask-filter)';
              lCtx.globalCompositeOperation = 'destination-out';
              lCtx.drawImage(stagedLayer.maskImage, 0, 0, stagedLayer.width, stagedLayer.height);
              lCtx.restore();
          }
          
          if (stagedLayer.feather > 0) {
              lCtx.globalCompositeOperation = 'destination-in';
              lCtx.fillStyle = 'black';
              lCtx.filter = `blur(${stagedLayer.feather}px)`;
              lCtx.fillRect(stagedLayer.feather, stagedLayer.feather, stagedLayer.width - stagedLayer.feather * 2, stagedLayer.height - stagedLayer.feather * 2);
          }
      }
      ctx.drawImage(layerCanvas, stagedLayer.x, stagedLayer.y);
      ctx.restore();
    }
    return ctx;
};
