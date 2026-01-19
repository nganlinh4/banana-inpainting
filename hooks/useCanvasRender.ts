
import { useEffect, useRef, RefObject } from 'react';
import { StagedLayer, SelectionBox, DrawingMode, LayerTool, MaskObject } from '../types';

interface RenderProps {
  history: ImageData[];
  historyIndex: number;
  stagedLayer: StagedLayer | null;
  selection: SelectionBox | null;
  processingRegion: SelectionBox | null;
  transform: { scale: number, x: number, y: number };
  isAdjustingFeather: boolean;
  activeHandle: string | null;
  lastNudgeTime: number;
  maskObjects: MaskObject[];
  selectedMaskId: string | null;
  hoverMaskId: string | null;
  currentPath: {x: number, y: number}[];
  drawingMode: DrawingMode;
  layerTool: LayerTool;
  eraserSettings?: { size: number, softness: number };
  isLayerErasing?: boolean;
  maskCanvasRef?: RefObject<HTMLCanvasElement | null>;
}

export const useCanvasRender = (
  canvasRef: RefObject<HTMLCanvasElement>,
  props: RenderProps
) => {
  const propsRef = useRef(props);
  const historyCacheRef = useRef<HTMLCanvasElement | null>(null);
  const layerCacheRef = useRef<HTMLCanvasElement | null>(null);
  
  const lastRenderedState = useRef<{
     historyIndex: number;
     historyRef: ImageData[];
     width: number;
     height: number;
  } | null>(null);

  const lastLayerState = useRef<{
     image: HTMLImageElement;
     maskImage: HTMLImageElement | null;
     feather: number;
     width: number;
     height: number;
     isErasing: boolean;
     maskRefVersion: number;
  } | null>(null);

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const { 
        history, 
        historyIndex, 
        stagedLayer, 
        selection, 
        processingRegion, 
        transform, 
        isAdjustingFeather,
        activeHandle,
        lastNudgeTime,
        maskObjects,
        selectedMaskId,
        hoverMaskId,
        currentPath,
        drawingMode,
        layerTool,
        maskCanvasRef,
        isLayerErasing
      } = propsRef.current;

      const currentCanvas = canvasRef.current;
      if (!currentCanvas || history.length === 0) {
         animationFrameId = requestAnimationFrame(render);
         return;
      }

      const ctx = currentCanvas.getContext('2d');
      if (!ctx) {
         animationFrameId = requestAnimationFrame(render);
         return;
      }

      // --- 1. Draw Clean History (Optimized) ---
      if (historyIndex >= 0 && history[historyIndex]) {
          const currentImageData = history[historyIndex];
          let cache = historyCacheRef.current;
          
          const isCacheInvalid = !cache || 
                                 !lastRenderedState.current ||
                                 lastRenderedState.current.historyIndex !== historyIndex ||
                                 lastRenderedState.current.historyRef !== history ||
                                 lastRenderedState.current.width !== currentImageData.width ||
                                 lastRenderedState.current.height !== currentImageData.height;

          if (isCacheInvalid) {
              if (!cache) {
                  cache = document.createElement('canvas');
                  historyCacheRef.current = cache;
              }
              if (cache.width !== currentImageData.width || cache.height !== currentImageData.height) {
                  cache.width = currentImageData.width;
                  cache.height = currentImageData.height;
              }
              
              const cacheCtx = cache.getContext('2d');
              if (cacheCtx) {
                  cacheCtx.putImageData(currentImageData, 0, 0);
              }
              
              lastRenderedState.current = {
                  historyIndex,
                  historyRef: history,
                  width: currentImageData.width,
                  height: currentImageData.height
              };
          }
          
          if (cache) {
              ctx.drawImage(cache, 0, 0);
          }
      }

      // --- 2. Draw Staged Layer (Highly Optimized) ---
      if (stagedLayer) {
        // Determine if we need to regenerate the layer composition (Image + Mask + Feather)
        let shouldUpdateLayerCache = !layerCacheRef.current;
        
        if (lastLayerState.current) {
            const prev = lastLayerState.current;
            if (prev.image !== stagedLayer.image ||
                prev.maskImage !== stagedLayer.maskImage ||
                prev.feather !== stagedLayer.feather ||
                prev.width !== stagedLayer.width ||
                prev.height !== stagedLayer.height ||
                isLayerErasing // Always update during active erasing to show strokes immediately
                ) {
                shouldUpdateLayerCache = true;
            }
        } else {
            shouldUpdateLayerCache = true;
        }

        if (shouldUpdateLayerCache) {
           if (!layerCacheRef.current) {
               layerCacheRef.current = document.createElement('canvas');
           }
           const lCanvas = layerCacheRef.current;
           if (lCanvas.width !== stagedLayer.width || lCanvas.height !== stagedLayer.height) {
               lCanvas.width = stagedLayer.width;
               lCanvas.height = stagedLayer.height;
           }
           
           const lCtx = lCanvas.getContext('2d');
           if (lCtx) {
               lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);
               
               // 2.1 Draw Base Image
               lCtx.save();
               lCtx.beginPath();
               lCtx.roundRect(0, 0, stagedLayer.width, stagedLayer.height, 12);
               lCtx.clip();
               lCtx.drawImage(stagedLayer.image, 0, 0, stagedLayer.width, stagedLayer.height);
               
               // 2.2 Apply Mask
               const liveMask = maskCanvasRef?.current;
               if (liveMask || stagedLayer.maskImage) {
                    lCtx.save();
                    lCtx.filter = 'url(#banana-mask-filter)';
                    lCtx.globalCompositeOperation = 'destination-out';
                    
                    if (liveMask) {
                        lCtx.drawImage(liveMask, 0, 0, stagedLayer.width, stagedLayer.height);
                    } else if (stagedLayer.maskImage) {
                        lCtx.drawImage(stagedLayer.maskImage, 0, 0, stagedLayer.width, stagedLayer.height);
                    }
                    lCtx.restore();
               }

               // 2.3 Apply Feather
               if (stagedLayer.feather > 0) {
                  lCtx.globalCompositeOperation = 'destination-in';
                  lCtx.fillStyle = 'black';
                  lCtx.filter = `blur(${stagedLayer.feather}px)`;
                  lCtx.beginPath();
                  lCtx.roundRect(
                    stagedLayer.feather, 
                    stagedLayer.feather, 
                    Math.max(0, stagedLayer.width - (stagedLayer.feather * 2)), 
                    Math.max(0, stagedLayer.height - (stagedLayer.feather * 2)),
                    Math.max(0, 12 - stagedLayer.feather)
                  );
                  lCtx.fill();
               }
               lCtx.restore();
           }

           lastLayerState.current = {
               image: stagedLayer.image,
               maskImage: stagedLayer.maskImage,
               feather: stagedLayer.feather,
               width: stagedLayer.width,
               height: stagedLayer.height,
               isErasing: !!isLayerErasing,
               maskRefVersion: 0
           };
        }

        // Draw the cached layer canvas to main context
        if (layerCacheRef.current) {
             ctx.save();
             
             // Animation Logic
             const age = Date.now() - stagedLayer.revealStartTime;
             const duration = 1500; 
             const progress = Math.min(1, age / duration);
             const ease = 1 - Math.pow(1 - progress, 3);
             
             if (progress < 1) {
                 ctx.filter = `blur(${(1 - ease) * 30}px)`;
                 ctx.globalAlpha = ease;
             }
             
             ctx.drawImage(layerCacheRef.current, stagedLayer.x, stagedLayer.y);
             
             ctx.filter = 'none';
             ctx.globalAlpha = 1;
             
             // Draw Handles for Staged Layer
             if (!processingRegion && !isAdjustingFeather && progress > 0.8) {
                  const isInteracting = !!activeHandle; 
                  const isNudging = (Date.now() - lastNudgeTime) < 1000;

                  // Selection Border
                  if (!isInteracting && !isNudging && layerTool === 'MOVE') {
                    ctx.strokeStyle = '#b388ff';
                    ctx.lineWidth = 2 / transform.scale;
                    ctx.setLineDash([8 / transform.scale, 8 / transform.scale]);
                    ctx.beginPath();
                    ctx.roundRect(stagedLayer.x, stagedLayer.y, stagedLayer.width, stagedLayer.height, 12);
                    ctx.stroke();
                    ctx.setLineDash([]);
                  }
                  
                  // Transform Handles
                  if (layerTool === 'MOVE') {
                      const { x, y, width: w, height: h } = stagedLayer;
                      
                      const drawEdgeHandle = (hx: number, hy: number, angle: number) => {
                          const hw = 24 / transform.scale;
                          const hh = 6 / transform.scale;
                          ctx.save();
                          ctx.translate(hx, hy);
                          ctx.rotate(angle);
                          ctx.fillStyle = '#ffffff';
                          ctx.strokeStyle = '#a855f7';
                          ctx.lineWidth = 2 / transform.scale;
                          ctx.beginPath();
                          ctx.roundRect(-hw/2, -hh/2, hw, hh, 4 / transform.scale);
                          ctx.fill();
                          ctx.stroke();
                          ctx.restore();
                      };

                      drawEdgeHandle(x + w / 2, y, 0); // N
                      drawEdgeHandle(x + w, y + h / 2, Math.PI / 2); // E
                      drawEdgeHandle(x + w / 2, y + h, 0); // S
                      drawEdgeHandle(x, y + h / 2, Math.PI / 2); // W

                      const drawCornerHandle = (hx: number, hy: number) => {
                          const r = 8 / transform.scale;
                          ctx.fillStyle = '#ffffff';
                          ctx.strokeStyle = '#ec4899';
                          ctx.lineWidth = 3 / transform.scale;
                          ctx.beginPath();
                          ctx.arc(hx, hy, r, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.stroke();
                      };

                      drawCornerHandle(x, y); // NW
                      drawCornerHandle(x + w, y); // NE
                      drawCornerHandle(x + w, y + h); // SE
                      drawCornerHandle(x, y + h); // SW
                  }
             }
             ctx.restore();
        }
      } else {
        if (layerCacheRef.current) {
            layerCacheRef.current.width = 0;
            layerCacheRef.current.height = 0;
            layerCacheRef.current = null;
        }
        lastLayerState.current = null;
      }

      // --- 3. Draw Vector Mask Objects ---
      const clipBox = selection || processingRegion;
      
      const isMaskTransformed = (m: MaskObject) => {
          return Math.abs(m.transform.x) > 0.1 || 
                 Math.abs(m.transform.y) > 0.1 || 
                 Math.abs(m.transform.rotation) > 0.01 || 
                 Math.abs(m.transform.scaleX - 1) > 0.01 || 
                 Math.abs(m.transform.scaleY - 1) > 0.01;
      };

      if (clipBox) {
          ctx.save();
          // Clip to the main selection box
          ctx.beginPath();
          ctx.rect(clipBox.x, clipBox.y, clipBox.width, clipBox.height);
          ctx.clip();
          
          if (processingRegion) {
              const alpha = (Math.sin(Date.now() / 200) + 1) / 2;
              ctx.fillStyle = `rgba(255, 100, 150, ${0.4 + 0.3 * alpha})`;
              ctx.fill(); 
          }
          
          if (maskObjects.length > 0) {
              
              // 1. Draw "Holes" for Transformed Objects or Red Overlay for Pristine Objects
              maskObjects.forEach(obj => {
                  const transformed = isMaskTransformed(obj);
                  const isSelected = selectedMaskId === obj.id;
                  const isHovered = hoverMaskId === obj.id;

                  // Untransformed: Draw Red Overlay (Classic Mask)
                  if (!transformed) {
                      ctx.save();
                      const cx = clipBox.x + obj.center.x;
                      const cy = clipBox.y + obj.center.y;
                      ctx.translate(cx, cy);
                      
                      ctx.beginPath();
                      if (obj.points.length > 0) {
                          ctx.moveTo(obj.points[0].x, obj.points[0].y);
                          for (let i = 1; i < obj.points.length; i++) {
                              ctx.lineTo(obj.points[i].x, obj.points[i].y);
                          }
                      }
                      ctx.closePath();
                      
                      ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; 
                      ctx.fill();
                      
                      if (isSelected || isHovered) {
                           ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.8)';
                           ctx.lineWidth = isSelected ? 2 / transform.scale : 1 / transform.scale;
                           if (isSelected && !transformed) ctx.setLineDash([4, 4]);
                           ctx.stroke();
                      }
                      
                      ctx.restore();
                  } 
                  // Transformed: Draw Hole at Original Position
                  else {
                      ctx.save();
                      const cx = clipBox.x + obj.center.x;
                      const cy = clipBox.y + obj.center.y;
                      ctx.translate(cx, cy);
                      
                      ctx.beginPath();
                      if (obj.points.length > 0) {
                          ctx.moveTo(obj.points[0].x, obj.points[0].y);
                          for (let i = 1; i < obj.points.length; i++) {
                              ctx.lineTo(obj.points[i].x, obj.points[i].y);
                          }
                      }
                      ctx.closePath();
                      
                      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
                      ctx.fill();
                      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                      ctx.lineWidth = 1 / transform.scale;
                      ctx.stroke();
                      ctx.restore();
                  }
              });

              // 2. Draw Moved Content for Transformed Objects
              if (historyCacheRef.current) {
                  maskObjects.forEach(obj => {
                       if (!isMaskTransformed(obj)) return;
                       
                       ctx.save();
                       const cx = clipBox.x + obj.center.x + obj.transform.x;
                       const cy = clipBox.y + obj.center.y + obj.transform.y;
                       
                       ctx.translate(cx, cy);
                       ctx.rotate(obj.transform.rotation);
                       ctx.scale(obj.transform.scaleX, obj.transform.scaleY);
                       
                       ctx.beginPath();
                       if (obj.points.length > 0) {
                           ctx.moveTo(obj.points[0].x, obj.points[0].y);
                           for (let i = 1; i < obj.points.length; i++) {
                               ctx.lineTo(obj.points[i].x, obj.points[i].y);
                           }
                       }
                       ctx.closePath();
                       ctx.clip();
                       
                       // Draw image content
                       if (historyCacheRef.current) {
                            ctx.translate(-(clipBox.x + obj.center.x), -(clipBox.y + obj.center.y));
                            ctx.drawImage(historyCacheRef.current, 0, 0);
                       }
                       ctx.restore();
                  });
              }

              // 3. Draw Handles & Bounding Boxes (Overlay)
              maskObjects.forEach(obj => {
                   if (selectedMaskId !== obj.id) return;

                   const transformed = isMaskTransformed(obj);
                   
                   const cx = clipBox.x + obj.center.x + obj.transform.x;
                   const cy = clipBox.y + obj.center.y + obj.transform.y;
                   
                   let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                   obj.points.forEach(p => {
                       if (p.x < minX) minX = p.x;
                       if (p.x > maxX) maxX = p.x;
                       if (p.y < minY) minY = p.y;
                       if (p.y > maxY) maxY = p.y;
                   });
                   
                   // Draw Handles
                   ctx.save();
                   ctx.translate(cx, cy);
                   ctx.rotate(obj.transform.rotation);
                   // Invert scale for handles so they stay constant size on screen but follow object transform
                   ctx.scale(obj.transform.scaleX, obj.transform.scaleY);
                   
                   const handleScaleX = 1 / obj.transform.scaleX;
                   const handleScaleY = 1 / obj.transform.scaleY;
                   
                   // Visual Border for Object
                   ctx.save();
                   // We need to re-apply points to draw border around shape, but we are already transformed
                   // So just draw the points.
                   ctx.beginPath();
                   if (obj.points.length > 0) {
                       ctx.moveTo(obj.points[0].x, obj.points[0].y);
                       for (let i = 1; i < obj.points.length; i++) {
                           ctx.lineTo(obj.points[i].x, obj.points[i].y);
                       }
                   }
                   ctx.closePath();
                   ctx.strokeStyle = transformed ? '#ec4899' : 'rgba(255,255,255,0.8)';
                   ctx.lineWidth = 1.5 / transform.scale * Math.max(handleScaleX, handleScaleY); // Approx line width correction
                   if (!transformed) ctx.setLineDash([4, 4]);
                   ctx.stroke();
                   ctx.restore();

                   // Bounding Box
                   ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                   ctx.lineWidth = 1 / transform.scale * Math.max(handleScaleX, handleScaleY);
                   ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
                   
                   // Handle Helper Functions
                   const drawCircleHandle = (hx: number, hy: number) => {
                       const r = 5 / transform.scale;
                       ctx.save();
                       ctx.translate(hx, hy);
                       ctx.scale(handleScaleX, handleScaleY);
                       ctx.fillStyle = '#ffffff';
                       ctx.strokeStyle = '#ec4899';
                       ctx.lineWidth = 1 / transform.scale;
                       ctx.beginPath();
                       ctx.arc(0, 0, r, 0, Math.PI * 2);
                       ctx.fill();
                       ctx.stroke();
                       ctx.restore();
                   };
                   
                   const drawRectHandle = (hx: number, hy: number, angle: number) => {
                       const hw = 12 / transform.scale;
                       const hh = 4 / transform.scale;
                       ctx.save();
                       ctx.translate(hx, hy);
                       // The handle rect itself shouldn't be rotated relative to the box edge, which is already axis aligned in this local space.
                       // But "angle" is passed for N/E/S/W specific alignment if needed. 
                       // Actually, N/S/E/W handles are just aligned with the box.
                       if (angle !== 0) ctx.rotate(angle);

                       ctx.scale(handleScaleX, handleScaleY);
                       
                       ctx.fillStyle = '#ffffff';
                       ctx.strokeStyle = '#a855f7';
                       ctx.lineWidth = 1 / transform.scale;
                       ctx.beginPath();
                       ctx.roundRect(-hw/2, -hh/2, hw, hh, 2/transform.scale);
                       ctx.fill();
                       ctx.stroke();
                       ctx.restore();
                   };
                   
                   // Corners (Circles)
                   drawCircleHandle(minX, minY);
                   drawCircleHandle(maxX, minY);
                   drawCircleHandle(minX, maxY);
                   drawCircleHandle(maxX, maxY);
                   
                   // Sides (Rects)
                   drawRectHandle(minX + (maxX-minX)/2, minY, 0); // N
                   drawRectHandle(minX + (maxX-minX)/2, maxY, 0); // S
                   drawRectHandle(maxX, minY + (maxY-minY)/2, Math.PI/2); // E
                   drawRectHandle(minX, minY + (maxY-minY)/2, Math.PI/2); // W
                   
                   // Rotate Handle
                   ctx.beginPath();
                   ctx.moveTo(minX + (maxX-minX)/2, minY);
                   ctx.lineTo(minX + (maxX-minX)/2, minY - 20 * handleScaleY);
                   ctx.strokeStyle = '#ffffff';
                   ctx.lineWidth = 1 / transform.scale * Math.max(handleScaleX, handleScaleY);
                   ctx.stroke();
                   drawCircleHandle(minX + (maxX-minX)/2, minY - 20 * handleScaleY);
                   
                   ctx.restore();
              });
          }

          // Draw Current Path being drawn
          if (currentPath.length > 0) {
              ctx.save();
              ctx.translate(clipBox.x, clipBox.y);
              ctx.beginPath();
              ctx.moveTo(currentPath[0].x, currentPath[0].y);
              for(let i=1; i<currentPath.length; i++) {
                  ctx.lineTo(currentPath[i].x, currentPath[i].y);
              }
              
              if (drawingMode === 'BRUSH') {
                  ctx.closePath();
                  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                  ctx.strokeStyle = '#ff0000';
                  ctx.fill();
                  ctx.lineWidth = 1 / transform.scale;
                  ctx.stroke();
              }
              ctx.restore();
          }
          ctx.restore();
      }
      
      // Selection Box Border
      if (selection && selection.width > 0 && selection.height > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(selection.x, selection.y, selection.width, selection.height, 12);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 / transform.scale;
        ctx.setLineDash([]); 
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
};
