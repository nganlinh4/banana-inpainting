

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
}

export interface StagedLayer {
  image: HTMLImageElement;
  maskImage: HTMLImageElement | null; // The erasure mask
  x: number;
  y: number;
  width: number;
  height: number;
  feather: number;
  revealStartTime: number; // For animation
}

export interface SavedProject {
  id: string;
  thumbnail: string; // Base64 for gallery display
  createdAt: number;
  updatedAt: number;
  history: string[]; // Array of Base64 strings representing the stack for undo/redo
  historyIndex: number;
  width: number;
  height: number;
}

export interface ReferenceAsset {
  id: string;
  data: string; // Base64
  createdAt: number;
}

export interface MaskObject {
  id: string;
  points: {x: number, y: number}[]; // Points relative to the center
  center: {x: number, y: number}; // Pivot point relative to selection box top-left
  transform: {
    x: number; // Translation relative to center
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number; // Radians
  };
}

export enum ToolMode {
  SELECT = 'SELECT',
  EDIT_LAYER = 'EDIT_LAYER'
}

export type DrawingMode = 'NONE' | 'BRUSH' | 'ERASER';

export type LayerTool = 'MOVE' | 'ERASER';

export type Language = 'en' | 'vi' | 'ko';
export type Theme = 'light' | 'dark' | 'auto';