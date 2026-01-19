
import React, { useState, useRef, useEffect } from 'react';
import Button from './Button';
import Card from './Card';

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  src: string;
  onConfirm: (base64: string) => void;
  onCancel: () => void;
  t: any; // Translations
}

const ImageCropper: React.FC<ImageCropperProps> = ({ src, onConfirm, onCancel, t }) => {
  const [crop, setCrop] = useState<Selection | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Initialize with full image crop or empty? Empty lets user draw.
  
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCrop({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const container = containerRef.current;
    if (!container) return;

    // Clamp to container
    const x = Math.max(0, Math.min(container.clientWidth, pos.x));
    const y = Math.max(0, Math.min(container.clientHeight, pos.y));
    
    const w = x - startPos.x;
    const h = y - startPos.y;

    setCrop({
      x: w > 0 ? startPos.x : x,
      y: h > 0 ? startPos.y : y,
      width: Math.abs(w),
      height: Math.abs(h)
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleCrop = () => {
    if (!crop || !imgRef.current) {
        // If no crop selected, confirm with original
        onConfirm(src);
        return;
    }
    
    // Check if crop is significant
    if (crop.width < 5 || crop.height < 5) {
        onConfirm(src);
        return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        imgRef.current,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      onConfirm(canvas.toDataURL('image/png'));
    }
  };

  return (
    <Card className="flex flex-col max-w-4xl w-full max-h-[90vh] p-4 overflow-hidden relative shadow-2xl animate-bounce-in">
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t.cropTitle}</h3>
             <button onClick={onCancel} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                 <span className="material-symbols-rounded">close</span>
             </button>
        </div>
        
        <div className="flex-1 overflow-hidden relative bg-black/5 dark:bg-black/50 rounded-xl flex items-center justify-center cursor-crosshair select-none touch-none">
             <div 
                ref={containerRef} 
                className="relative inline-block"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp}
                onMouseLeave={handleMouseUp}
             >
                 <img 
                    ref={imgRef}
                    src={src} 
                    alt="To Crop" 
                    className="max-h-[60vh] object-contain block pointer-events-none select-none"
                    draggable={false}
                 />
                 
                 {crop && (
                     <>
                        {/* Dim Overlay */}
                        <div className="absolute inset-0 bg-black/50 pointer-events-none" 
                             style={{ 
                                clipPath: `polygon(0% 0%, 0% 100%, ${crop.x}px 100%, ${crop.x}px ${crop.y}px, ${crop.x + crop.width}px ${crop.y}px, ${crop.x + crop.width}px ${crop.y + crop.height}px, ${crop.x}px ${crop.y + crop.height}px, ${crop.x}px 100%, 100% 100%, 100% 0%)` 
                             }}>
                        </div>
                        {/* Selection Border */}
                        <div 
                            className="absolute border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
                            style={{
                                left: crop.x,
                                top: crop.y,
                                width: crop.width,
                                height: crop.height
                            }}
                        >
                            {/* Grid of thirds */}
                            <div className="absolute inset-0 flex flex-col">
                                <div className="flex-1 border-b border-white/30"></div>
                                <div className="flex-1 border-b border-white/30"></div>
                                <div className="flex-1"></div>
                            </div>
                            <div className="absolute inset-0 flex">
                                <div className="flex-1 border-r border-white/30"></div>
                                <div className="flex-1 border-r border-white/30"></div>
                                <div className="flex-1"></div>
                            </div>
                        </div>
                     </>
                 )}
             </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={onCancel}>{t.cancel}</Button>
            <Button variant="primary" onClick={handleCrop}>{t.confirmCrop}</Button>
        </div>
    </Card>
  );
};

export default ImageCropper;
