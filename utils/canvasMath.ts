
import { MaskObject, SelectionBox, StagedLayer } from "../types";

export const getCanvasPos = (clientX: number, clientY: number, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
};

export const isPointInPoly = (p: {x:number, y:number}, polygon: {x:number, y:number}[]) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if ( (polygon[i].y > p.y) !== (polygon[j].y > p.y) &&
             p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x ) {
            isInside = !isInside;
        }
    }
    return isInside;
};

export const isPointInMaskObject = (p: {x: number, y: number}, mask: MaskObject, selectionBox: SelectionBox) => {
    const cx = mask.center.x;
    const cy = mask.center.y;
    
    const relX = p.x - selectionBox.x;
    const relY = p.y - selectionBox.y;
    
    const tx = relX - cx - mask.transform.x;
    const ty = relY - cy - mask.transform.y;
    
    const cos = Math.cos(-mask.transform.rotation);
    const sin = Math.sin(-mask.transform.rotation);
    const rx = tx * cos - ty * sin;
    const ry = tx * sin + ty * cos;
    
    const sx = rx / mask.transform.scaleX;
    const sy = ry / mask.transform.scaleY;
    
    return isPointInPoly({ x: sx, y: sy }, mask.points);
};

export const getMaskBoundingBox = (mask: MaskObject) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    mask.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

export const checkMaskHandles = (p: {x: number, y: number}, mask: MaskObject, selectionBox: SelectionBox, scale: number) => {
    const bounds = getMaskBoundingBox(mask);
    const cx = mask.center.x; 
    const cy = mask.center.y;
    
    const transformPoint = (px: number, py: number) => {
        const dx = px; 
        const dy = py;
        const sX = dx * mask.transform.scaleX;
        const sY = dy * mask.transform.scaleY;
        const rX = sX * Math.cos(mask.transform.rotation) - sY * Math.sin(mask.transform.rotation);
        const rY = sX * Math.sin(mask.transform.rotation) + sY * Math.cos(mask.transform.rotation);
        return {
            x: cx + rX + mask.transform.x + selectionBox.x,
            y: cy + rY + mask.transform.y + selectionBox.y
        };
    };
    
    const corners = {
        nw: transformPoint(bounds.x, bounds.y),
        ne: transformPoint(bounds.x + bounds.w, bounds.y),
        sw: transformPoint(bounds.x, bounds.y + bounds.h),
        se: transformPoint(bounds.x + bounds.w, bounds.y + bounds.h),
        n: transformPoint(bounds.x + bounds.w/2, bounds.y),
        s: transformPoint(bounds.x + bounds.w/2, bounds.y + bounds.h),
        e: transformPoint(bounds.x + bounds.w, bounds.y + bounds.h/2),
        w: transformPoint(bounds.x, bounds.y + bounds.h/2),
        rotate: transformPoint(bounds.x + bounds.w/2, bounds.y - 20)
    };
    
    const dist = (p1: {x:number, y:number}, p2: {x:number, y:number}) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const radius = 15 / scale;
    
    if (dist(p, corners.rotate) < radius) return 'rotate';
    if (dist(p, corners.nw) < radius) return 'nw';
    if (dist(p, corners.ne) < radius) return 'ne';
    if (dist(p, corners.sw) < radius) return 'sw';
    if (dist(p, corners.se) < radius) return 'se';
    
    if (dist(p, corners.n) < radius) return 'n';
    if (dist(p, corners.s) < radius) return 's';
    if (dist(p, corners.e) < radius) return 'e';
    if (dist(p, corners.w) < radius) return 'w';
    
    return null;
};

export const checkLayerHandles = (x: number, y: number, stagedLayer: StagedLayer | null, scale: number) => {
    if (!stagedLayer) return null;
    const handleRadius = 20 / scale; 
    const { x: lx, y: ly, width: lw, height: lh } = stagedLayer;
    if (Math.hypot(x - lx, y - ly) < handleRadius) return 'nw';
    if (Math.hypot(x - (lx + lw), y - ly) < handleRadius) return 'ne';
    if (Math.hypot(x - (lx + lw), y - (ly + lh)) < handleRadius) return 'se';
    if (Math.hypot(x - lx, y - (ly + lh)) < handleRadius) return 'sw';
    if (Math.abs(x - (lx + lw / 2)) < handleRadius && Math.abs(y - ly) < handleRadius) return 'n';
    if (Math.abs(x - (lx + lw)) < handleRadius && Math.abs(y - (ly + lh / 2)) < handleRadius) return 'e';
    if (Math.abs(x - (lx + lw / 2)) < handleRadius && Math.abs(y - (ly + lh)) < handleRadius) return 's';
    if (Math.abs(x - lx) < handleRadius && Math.abs(y - (ly + lh / 2)) < handleRadius) return 'w';
    if (x > lx && x < lx + lw && y > ly && y < ly + lh) return 'move';
    return null;
};

export const getCursorForHandle = (h: string, rotation: number = 0) => {
    let baseAngle = 0;
    switch(h) {
        case 'e': baseAngle = 0; break;
        case 'se': baseAngle = 45; break;
        case 's': baseAngle = 90; break;
        case 'sw': baseAngle = 135; break;
        case 'w': baseAngle = 180; break;
        case 'nw': baseAngle = 225; break;
        case 'n': baseAngle = 270; break;
        case 'ne': baseAngle = 315; break;
        case 'move': return 'move';
        case 'rotate': return 'grab';
        default: return 'default';
    }
    const totalAngle = (baseAngle + (rotation * 180 / Math.PI)) % 360;
    const normalized = (totalAngle + 360) % 360;
    
    if (normalized < 22.5 || normalized >= 337.5) return 'ew-resize';
    if (normalized < 67.5) return 'nwse-resize';
    if (normalized < 112.5) return 'ns-resize';
    if (normalized < 157.5) return 'nesw-resize';
    if (normalized < 202.5) return 'ew-resize';
    if (normalized < 247.5) return 'nwse-resize';
    if (normalized < 292.5) return 'ns-resize';
    return 'nesw-resize';
};

export const calculateMaskTransform = (
    handle: string,
    currentPos: {x: number, y: number},
    selection: SelectionBox,
    mask: MaskObject,
    initialTransform: MaskObject['transform'],
    isCtrl: boolean
): MaskObject['transform'] => {
    const newTransform = { ...initialTransform };
    const bounds = getMaskBoundingBox(mask);
    const initScaleX = initialTransform.scaleX;
    const initScaleY = initialTransform.scaleY;
    const initRot = initialTransform.rotation;
    const initCenterX = mask.center.x + initialTransform.x;
    const initCenterY = mask.center.y + initialTransform.y;

    const localMinX = bounds.x * initScaleX;
    const localMaxX = (bounds.x + bounds.w) * initScaleX;
    const localMinY = bounds.y * initScaleY;
    const localMaxY = (bounds.y + bounds.h) * initScaleY;
    const initWidth = localMaxX - localMinX;
    const initHeight = localMaxY - localMinY;

    const mRelX = currentPos.x - (selection.x + initCenterX);
    const mRelY = currentPos.y - (selection.y + initCenterY);
    const cos = Math.cos(-initRot);
    const sin = Math.sin(-initRot);
    const mLocalX = mRelX * cos - mRelY * sin;
    const mLocalY = mRelX * sin + mRelY * cos;

    let newMinX = localMinX;
    let newMaxX = localMaxX;
    let newMinY = localMinY;
    let newMaxY = localMaxY;

    if (handle.includes('e')) {
        newMaxX = isCtrl ? Math.abs(mLocalX) : mLocalX;
        if (isCtrl) newMinX = -newMaxX;
    }
    if (handle.includes('w')) {
        newMinX = isCtrl ? -Math.abs(mLocalX) : mLocalX;
        if (isCtrl) newMaxX = -newMinX;
    }
    if (handle.includes('s')) {
        newMaxY = isCtrl ? Math.abs(mLocalY) : mLocalY;
        if (isCtrl) newMinY = -newMaxY;
    }
    if (handle.includes('n')) {
        newMinY = isCtrl ? -Math.abs(mLocalY) : mLocalY;
        if (isCtrl) newMaxY = -newMinY;
    }

    const isCorner = handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se';
    if (isCorner) {
        const ratio = initWidth / initHeight;
        const newW = newMaxX - newMinX;
        const targetH = newW / ratio;
        
        if (handle.includes('n')) {
            if (isCtrl) newMinY = -targetH/2;
            else newMinY = newMaxY - targetH;
        } else {
            if (isCtrl) newMaxY = targetH/2;
            else newMaxY = newMinY + targetH;
        }
        
        if (isCtrl) {
            newMinY = -targetH / 2;
            newMaxY = targetH / 2;
        }
    }

    const finalW = newMaxX - newMinX;
    const finalH = newMaxY - newMinY;

    if (Math.abs(finalW) > 1 && Math.abs(finalH) > 1) {
        newTransform.scaleX = initScaleX * (finalW / initWidth);
        newTransform.scaleY = initScaleY * (finalH / initHeight);
        
        const centerOffsetX = (newMinX + newMaxX) / 2;
        const centerOffsetY = (newMinY + newMaxY) / 2;
        
        const cosR = Math.cos(initRot);
        const sinR = Math.sin(initRot);
        const worldOffsetX = centerOffsetX * cosR - centerOffsetY * sinR;
        const worldOffsetY = centerOffsetX * sinR + centerOffsetY * cosR;
        
        newTransform.x = initialTransform.x + worldOffsetX;
        newTransform.y = initialTransform.y + worldOffsetY;
    }

    return newTransform;
};
