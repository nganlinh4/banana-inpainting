
import { useState } from 'react';
import { generateRegionEdit } from '../services/geminiService';
import { SelectionBox, MaskObject, StagedLayer } from '../types';

interface GenerationProps {
    selection: SelectionBox | null;
    prompt: string;
    maskObjects: MaskObject[];
    hasTransforms: boolean;
    history: ImageData[];
    historyIndex: number;
    canvasRes: {w: number, h: number};
    referenceImages: string[];
    t: any;
    showToast: (msg: string, type: 'error' | 'success') => void;
}

export const useGeneration = () => {
    const [processingRegion, setProcessingRegion] = useState<SelectionBox | null>(null);

    const generateImage = async (props: GenerationProps): Promise<StagedLayer | null> => {
        const { selection, prompt, maskObjects, hasTransforms, history, historyIndex, canvasRes, referenceImages, t, showToast } = props;
        
        if (!selection || (!prompt.trim() && !hasTransforms)) return null;

        const savedSelection = { ...selection };
        setProcessingRegion({ ...selection });

        try {
            const currentImageData = history[historyIndex];
            const baseCanvas = document.createElement('canvas');
            baseCanvas.width = savedSelection.width;
            baseCanvas.height = savedSelection.height;
            const bCtx = baseCanvas.getContext('2d');
            if (!bCtx) throw new Error("Context error");

            const sx = Math.floor(savedSelection.x), sy = Math.floor(savedSelection.y);
            const sw = Math.floor(savedSelection.width), sh = Math.floor(savedSelection.height);

            const tempFull = document.createElement('canvas');
            tempFull.width = canvasRes.w; tempFull.height = canvasRes.h;
            tempFull.getContext('2d')?.putImageData(currentImageData, 0, 0);
            bCtx.drawImage(tempFull, sx, sy, sw, sh, 0, 0, sw, sh);

            // Cut and Paste Logic
            if (maskObjects.length > 0 && hasTransforms) {
                const extractions = maskObjects.map(obj => {
                    const objC = document.createElement('canvas');
                    objC.width = sw; objC.height = sh;
                    const oCtx = objC.getContext('2d');
                    if (!oCtx) return null;
                    oCtx.save();
                    oCtx.translate(obj.center.x, obj.center.y);
                    oCtx.beginPath();
                    if (obj.points.length > 0) {
                        oCtx.moveTo(obj.points[0].x, obj.points[0].y);
                        for(let i=1; i<obj.points.length; i++) oCtx.lineTo(obj.points[i].x, obj.points[i].y);
                    }
                    oCtx.closePath();
                    oCtx.clip();
                    oCtx.translate(-obj.center.x, -obj.center.y);
                    oCtx.drawImage(tempFull, sx, sy, sw, sh, 0, 0, sw, sh);
                    oCtx.restore();
                    return { obj, canvas: objC };
                });

                bCtx.globalCompositeOperation = 'destination-out';
                bCtx.fillStyle = 'black';
                maskObjects.forEach(obj => {
                    bCtx.save();
                    bCtx.translate(obj.center.x, obj.center.y);
                    bCtx.beginPath();
                    if (obj.points.length > 0) {
                        bCtx.moveTo(obj.points[0].x, obj.points[0].y);
                        for(let i=1; i<obj.points.length; i++) bCtx.lineTo(obj.points[i].x, obj.points[i].y);
                    }
                    bCtx.closePath();
                    bCtx.fill();
                    bCtx.restore();
                });

                bCtx.globalCompositeOperation = 'source-over';
                extractions.forEach(item => {
                    if (!item) return;
                    const { obj, canvas } = item;
                    bCtx.save();
                    bCtx.translate(obj.center.x + obj.transform.x, obj.center.y + obj.transform.y);
                    bCtx.rotate(obj.transform.rotation);
                    bCtx.scale(obj.transform.scaleX, obj.transform.scaleY);
                    bCtx.drawImage(canvas, -obj.center.x, -obj.center.y);
                    bCtx.restore();
                });
            }

            const base64Image = baseCanvas.toDataURL('image/png');
            let maskBase64: string | undefined;

            if (maskObjects.length > 0 && !hasTransforms) {
                const maskTempC = document.createElement('canvas');
                maskTempC.width = sw;
                maskTempC.height = sh;
                const mtCtx = maskTempC.getContext('2d');
                if (mtCtx) {
                    mtCtx.fillStyle = 'black';
                    mtCtx.fillRect(0, 0, sw, sh);
                    mtCtx.fillStyle = 'white';
                    maskObjects.forEach(obj => {
                        mtCtx.save();
                        mtCtx.translate(obj.center.x, obj.center.y);
                        mtCtx.beginPath();
                        if (obj.points.length > 0) {
                            mtCtx.moveTo(obj.points[0].x, obj.points[0].y);
                            for(let i=1; i<obj.points.length; i++) mtCtx.lineTo(obj.points[i].x, obj.points[i].y);
                        }
                        mtCtx.closePath();
                        mtCtx.fill();
                        mtCtx.restore();
                    });
                    maskBase64 = maskTempC.toDataURL('image/png');
                }
            }

            let finalPrompt = prompt;
            if (hasTransforms) {
                finalPrompt += ". The image contains a manually moved object and a missing region. Please seamlessly blend the moved object into its new position, correcting lighting, shadows, and removing any rough cutout edges or background artifacts. Also, fill in the missing background region naturally.";
            }

            const generatedImageBase64 = await generateRegionEdit(base64Image, finalPrompt, referenceImages, maskBase64);
            const img = new Image();
            img.src = `data:image/png;base64,${generatedImageBase64}`;
            await new Promise(resolve => img.onload = resolve);

            setProcessingRegion(null);
            return { 
                image: img, 
                maskImage: null, 
                x: sx, 
                y: sy, 
                width: sw, 
                height: sh, 
                feather: 5, 
                revealStartTime: Date.now() 
            };

        } catch (err: any) {
            console.error(err);
            showToast(err.message || t.errorGenerating, 'error');
            setProcessingRegion(null);
            return null;
        }
    };

    return { processingRegion, setProcessingRegion, generateImage };
};
