import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Brush,
  Check,
  Circle,
  Copy,
  Crop,
  Download,
  Droplet,
  Eraser,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  Grid,
  Hand,
  History,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Lock,
  Maximize2,
  Move,
  PaintBucket,
  Palette,
  Pipette,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Share2,
  Sliders,
  Sparkles,
  Square,
  Stamp,
  Sun,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Upload,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PosterRecord, ParticipantRecord } from '../types.ts';

export type PhotoshopToolId =
  | 'MOVE'
  | 'MARQUEE'
  | 'CROP'
  | 'EYEDROPPER'
  | 'BRUSH'
  | 'CLONE_HEAL'
  | 'ERASER'
  | 'GRADIENT_BUCKET'
  | 'BLUR_SHARPEN'
  | 'DODGE_BURN'
  | 'TEXT'
  | 'SHAPE'
  | 'IMAGE_LAYER'
  | 'STAMP'
  | 'HAND'
  | 'ZOOM';

export type BlendModeType =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'luminosity';

export interface StudioParticipantCard {
  id: number;
  fullName: string;
  photoUrl: string;
  classCode: string;
  categoryName: string;
  ownTopic?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  photoScale: number;
  photoOffsetX: number;
  photoOffsetY: number;
  flipX: boolean;
  flipY: boolean;
  visible: boolean;
  locked: boolean;
  borderColor?: string;
  nameBgColor?: string;
}

export interface CustomOverlayLayer {
  id: string;
  type: 'TEXT' | 'BADGE';
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string;
  showBgPill: boolean;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  rotation: number;
  opacity: number;
  blendMode: BlendModeType;
  visible: boolean;
  locked: boolean;
}

export interface StudioShapeLayer {
  id: string;
  shapeType:
    | 'ROUNDED_RECT'
    | 'RECTANGLE'
    | 'CIRCLE'
    | 'ARCH'
    | 'LINE'
    | 'STAR'
    | 'GOLD_RIBBON';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
  blendMode: BlendModeType;
  visible: boolean;
  locked: boolean;
}

export interface StudioImageLayer {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
  flipX: boolean;
  flipY: boolean;
  blendMode: BlendModeType;
  visible: boolean;
  locked: boolean;
}

export interface BrushStroke {
  points: Array<{ x: number; y: number }>;
  color: string;
  size: number;
  opacity: number;
  brushStyle:
    | 'SOFT_ROUND'
    | 'HARD_ROUND'
    | 'CALLIGRAPHY'
    | 'GOLD_SHIMMER'
    | 'NEON_GLOW'
    | 'SPRAY'
    | 'HEAL_PATCH'
    | 'DODGE_LIGHT'
    | 'BURN_SHADOW'
    | 'BLUR_GLOW';
}

export interface StudioStateSnapshot {
  historyLabel: string;
  canvasWidth: number;
  canvasHeight: number;
  title: string;
  subtitle: string;
  motto: string;
  programDetails: string;
  bgTheme:
    | 'BOTANICAL_BLUSH'
    | 'UPLOADED_POSTER'
    | 'OBSIDIAN_GOLD'
    | 'ROYAL_NAVY'
    | 'IMPERIAL_EMERALD'
    | 'VELVET_CRIMSON'
    | 'CYBER_NEON_AZURE'
    | 'ROYAL_AMETHYST'
    | 'DESERT_SANDSTONE'
    | 'ARCTIC_FROST_SLATE'
    | 'SUNSET_AMBER_CORAL'
    | 'MIDNIGHT_TITANIUM'
    | 'AI_ISLAMIC_ILLUMINATION'
    | 'AI_EMERALD_MIHRAB'
    | 'AI_ROYAL_SAPPHIRE'
    | 'AI_VINTAGE_BOTANICAL'
    | 'AI_BAROQUE_CRIMSON'
    | 'TURQUOISE_PERSIAN'
    | 'MAJESTIC_MARBLE_GOLD'
    | 'CELESTIAL_COSMIC_GOLD'
    | 'SAHARA_GOLDEN_OASIS'
    | 'CHAMPAGNE_LUXE';
  customBgUrl: string | null;
  customBgOpacity: number;
  showCompartmentBoxes: boolean;
  showHeaderLockup: boolean;
  frameShape: 'ROUNDED' | 'CIRCLE' | 'ARCH' | 'SQUARE';
  borderThickness: number;
  goldGlow: number;
  vignette: number;
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  hueRotate: number;
  blurPx: number;
  exposure: number;
  noiseGrain: number;
  titleFont: string;
  titleSize: number;
  titleColor: string;
  cards: StudioParticipantCard[];
  imageLayers: StudioImageLayer[];
  shapes: StudioShapeLayer[];
  overlays: CustomOverlayLayer[];
  strokes: BrushStroke[];
}

interface PosterPhotoshopStudioProps {
  poster: PosterRecord;
  liveParticipants?: ParticipantRecord[];
  onClose: () => void;
  onSavePoster: (
    posterId: number,
    updatedDataUrl: string,
    title: string,
    subtitle: string,
    participantsSnapshot: string
  ) => Promise<void>;
  onPostToFeed: (
    poster: PosterRecord,
    renderedDataUrl: string,
    caption: string
  ) => Promise<void>;
}

const CATEGORY_ORDER = [
  'Qirat',
  'Naat',
  'Speech',
  'Table Topic',
  'Evolution',
  'Aah Counter',
  'Marshal',
  'Grammarian',
];

function normalizeCat(cat: string): string {
  const c = (cat || '').trim().toLowerCase();
  if (c === 'qirath' || c === 'qirat') return 'Qirat';
  if (c === 'singer' || c === 'singers' || c === 'naat') return 'Naat';
  if (c === 'speaker' || c === 'speakers' || c === 'speech') return 'Speech';
  if (
    c === 'evaluator' ||
    c === 'evaluators' ||
    c === 'evolution' ||
    c === 'evaluation'
  )
    return 'Evolution';
  if (c === 'ah counter' || c === 'aah counter' || c === 'ah-counter')
    return 'Aah Counter';
  if (c === 'table topic' || c === 'table topics') return 'Table Topic';
  if (c === 'marshal' || c === 'marshall') return 'Marshal';
  if (c === 'grammarian') return 'Grammarian';
  return cat;
}

function computeCompartmentCards(
  rawParticipants: Array<{
    id: number;
    fullName: string;
    photoUrl: string;
    classCode: string;
    categoryName: string;
    ownTopic?: string | null;
  }>
): StudioParticipantCard[] {
  const result: StudioParticipantCard[] = [];
  const byCat = (target: string) =>
    rawParticipants.filter((p) => normalizeCat(p.categoryName) === target);

  // 1. Marshal (Top-left compartment)
  const marshals = byCat('Marshal');
  marshals.slice(0, 1).forEach((p) => {
    result.push({
      id: p.id,
      fullName: p.fullName,
      photoUrl: p.photoUrl,
      classCode: p.classCode,
      categoryName: 'Marshal',
      ownTopic: p.ownTopic || undefined,
      x: 112,
      y: 282,
      width: 245,
      height: 280,
      rotation: 0,
      opacity: 1,
      photoScale: 1,
      photoOffsetX: 0,
      photoOffsetY: 0,
      flipX: false,
      flipY: false,
      visible: true,
      locked: false,
    });
  });

  // 2. Qirat (Top-center compartment)
  const qirats = byCat('Qirat');
  qirats.slice(0, 1).forEach((p) => {
    result.push({
      id: p.id,
      fullName: p.fullName,
      photoUrl: p.photoUrl,
      classCode: p.classCode,
      categoryName: 'Qirat',
      ownTopic: p.ownTopic || undefined,
      x: 560,
      y: 282,
      width: 245,
      height: 280,
      rotation: 0,
      opacity: 1,
      photoScale: 1,
      photoOffsetX: 0,
      photoOffsetY: 0,
      flipX: false,
      flipY: false,
      visible: true,
      locked: false,
    });
  });

  // 3. Grammarian, Aah Counter, Table Topic (Top-right compartment)
  const grammarians = byCat('Grammarian').slice(0, 1);
  const aahCounters = byCat('Aah Counter').slice(0, 1);
  const tableTopics = byCat('Table Topic').slice(0, 5);

  grammarians.forEach((p) => {
    result.push({
      id: p.id,
      fullName: p.fullName,
      photoUrl: p.photoUrl,
      classCode: p.classCode,
      categoryName: 'Grammarian',
      ownTopic: p.ownTopic || undefined,
      x: 1020,
      y: 266,
      width: 145,
      height: 158,
      rotation: 0,
      opacity: 1,
      photoScale: 1,
      photoOffsetX: 0,
      photoOffsetY: 0,
      flipX: false,
      flipY: false,
      visible: true,
      locked: false,
    });
  });

  aahCounters.forEach((p) => {
    result.push({
      id: p.id,
      fullName: p.fullName,
      photoUrl: p.photoUrl,
      classCode: p.classCode,
      categoryName: 'Aah Counter',
      ownTopic: p.ownTopic || undefined,
      x: 1185,
      y: 266,
      width: 145,
      height: 158,
      rotation: 0,
      opacity: 1,
      photoScale: 1,
      photoOffsetX: 0,
      photoOffsetY: 0,
      flipX: false,
      flipY: false,
      visible: true,
      locked: false,
    });
  });

  tableTopics.forEach((p, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    result.push({
      id: p.id,
      fullName: p.fullName,
      photoUrl: p.photoUrl,
      classCode: p.classCode,
      categoryName: 'Table Topic',
      ownTopic: p.ownTopic || undefined,
      x: 1015 + col * 158,
      y: 432 + row * 82,
      width: 145,
      height: 78,
      rotation: 0,
      opacity: 1,
      photoScale: 1,
      photoOffsetX: 0,
      photoOffsetY: 0,
      flipX: false,
      flipY: false,
      visible: true,
      locked: false,
    });
  });

  // Helper for Bottom 3 Compartments
  const placeBottomFive = (
    items: typeof rawParticipants,
    catLabel: string,
    compX: number,
    compY: number,
    compW: number
  ) => {
    const positions = [
      { x: compX + 26, y: compY + 62, w: 185, h: 132 },
      { x: compX + compW - 211, y: compY + 62, w: 185, h: 132 },
      { x: compX + 26, y: compY + 206, w: 185, h: 132 },
      { x: compX + compW - 211, y: compY + 206, w: 185, h: 132 },
      { x: compX + Math.round((compW - 200) / 2), y: compY + 348, w: 200, h: 126 },
    ];
    items.slice(0, 5).forEach((p, i) => {
      const pos = positions[i] || positions[0];
      result.push({
        id: p.id,
        fullName: p.fullName,
        photoUrl: p.photoUrl,
        classCode: p.classCode,
        categoryName: catLabel,
        ownTopic: p.ownTopic || undefined,
        x: pos.x,
        y: pos.y,
        width: pos.w,
        height: pos.h,
        rotation: 0,
        opacity: 1,
        photoScale: 1,
        photoOffsetX: 0,
        photoOffsetY: 0,
        flipX: false,
        flipY: false,
        visible: true,
        locked: false,
      });
    });
  };

  placeBottomFive(byCat('Speech'), 'Speech', 60, 600, 440);
  placeBottomFive(byCat('Naat'), 'Naat', 540, 600, 480);
  placeBottomFive(byCat('Evolution'), 'Evolution', 1060, 600, 480);

  return result;
}

function computeGridCards(
  rawParticipants: Array<{
    id: number;
    fullName: string;
    photoUrl: string;
    classCode: string;
    categoryName: string;
    ownTopic?: string | null;
  }>,
  forcedCols?: number,
  canvasWidth = 1600
): StudioParticipantCard[] {
  const sorted = [...rawParticipants].sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(normalizeCat(a.categoryName));
    const idxB = CATEGORY_ORDER.indexOf(normalizeCat(b.categoryName));
    const orderA = idxA === -1 ? 99 : idxA;
    const orderB = idxB === -1 ? 99 : idxB;
    if (orderA !== orderB) return orderA - orderB;
    return a.id - b.id;
  });

  const count = sorted.length;
  const cols =
    forcedCols ||
    (count <= 2
      ? 2
      : count <= 6
      ? 3
      : count <= 12
      ? 4
      : count <= 18
      ? 5
      : 6);
  const gapX = 24;
  const gapY = 20;
  const usableW = canvasWidth - 140;
  const cardWidth = Math.min(260, Math.floor((usableW - (cols - 1) * gapX) / cols));
  const cardHeight = Math.round(cardWidth * 0.92);
  const rows = Math.ceil(Math.max(count, 1) / cols);
  const startY = 265;

  return sorted.map((p, idx) => {
    const row = Math.floor(idx / cols);
    const itemsInRow =
      row === rows - 1 && count % cols !== 0 ? count % cols : cols;
    const col = idx % cols;
    const totalRowW = itemsInRow * cardWidth + (itemsInRow - 1) * gapX;
    const startX = (canvasWidth - totalRowW) / 2;

    return {
      id: p.id,
      fullName: p.fullName,
      photoUrl: p.photoUrl,
      classCode: p.classCode,
      categoryName: normalizeCat(p.categoryName),
      ownTopic: p.ownTopic || undefined,
      x: Math.round(startX + col * (cardWidth + gapX)),
      y: Math.round(startY + row * (cardHeight + gapY)),
      width: cardWidth,
      height: cardHeight,
      rotation: 0,
      opacity: 1,
      photoScale: 1,
      photoOffsetX: 0,
      photoOffsetY: 0,
      flipX: false,
      flipY: false,
      visible: true,
      locked: false,
    };
  });
}

export const PosterPhotoshopStudio: React.FC<PosterPhotoshopStudioProps> = ({
  poster,
  liveParticipants,
  onClose,
  onSavePoster,
  onPostToFeed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [activeTool, setActiveTool] = useState<PhotoshopToolId>('MOVE');
  const [rightTab, setRightTab] = useState<
    'LAYERS' | 'ADJUSTMENTS' | 'LAYOUT' | 'HISTORY'
  >('LAYERS');
  const [zoom, setZoom] = useState(0.56);
  const [showGrid, setShowGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postingFeed, setPostingFeed] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [feedCaption, setFeedCaption] = useState(
    `Official Class ${poster.classCode} Competition Poster • Marshal, Qirath, Grammarian, Ah Counter, Table Topic, Speakers, Singers (Naat) & Evaluators.`
  );
  const [showFeedPrompt, setShowFeedPrompt] = useState(false);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);

  // Foreground / Brush / Shape settings
  const [fgColor, setFgColor] = useState('#C88A65');
  const [bgColorSwatch, setBgColorSwatch] = useState('#FFF5F5');
  const [brushSize, setBrushSize] = useState(10);
  const [brushOpacity, setBrushOpacity] = useState(0.9);
  const [brushStyle, setBrushStyle] =
    useState<BrushStroke['brushStyle']>('SOFT_ROUND');
  const [shapePreset, setShapePreset] =
    useState<StudioShapeLayer['shapeType']>('ROUNDED_RECT');
  const [stampPreset, setStampPreset] = useState<string>(
    '★ BOTANICAL ROSE SEAL ★'
  );

  // Marquee Selection rectangle
  const [marqueeRect, setMarqueeRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Selected Layer IDs
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null
  );
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedImageLayerId, setSelectedImageLayerId] = useState<
    string | null
  >(null);

  // Pointer interaction ref
  const dragRef = useRef<{
    type:
      | 'CARD'
      | 'OVERLAY'
      | 'SHAPE'
      | 'IMAGE_LAYER'
      | 'BRUSH'
      | 'MARQUEE'
      | 'PAN';
    id?: number | string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Resolve initial participants
  const initialParticipants = (() => {
    if (liveParticipants && liveParticipants.length > 0) {
      const classFiltered = liveParticipants.filter(
        (p) => p.classCode === poster.classCode
      );
      if (classFiltered.length > 0) return classFiltered;
    }
    try {
      return JSON.parse(poster.participantsSnapshot || '[]');
    } catch {
      return [];
    }
  })();

  const hasInitialCustomImage = Boolean(
    poster.posterImageUrl &&
      !poster.posterImageUrl.startsWith('data:image/svg+xml')
  );

  const [studio, setStudio] = useState<StudioStateSnapshot>(() => ({
    historyLabel: 'Initial Poster Loaded',
    canvasWidth: 1600,
    canvasHeight: 1130,
    title: 'INTEGRATED LEARNING MASTER (ILM)',
    subtitle: `CLASS ${poster.classCode} OFFICIAL COMPETITION LINEUP`,
    motto: 'Together We Build Better Learners • Learn • Compete • Grow',
    programDetails: `DATE: ${new Date().toLocaleDateString('en-GB')}   |   PROGRAM NO: 07   |   VENUE: CLASS ${
      poster.classCode
    }`,
    bgTheme: hasInitialCustomImage ? 'UPLOADED_POSTER' : 'BOTANICAL_BLUSH',
    customBgUrl: hasInitialCustomImage ? poster.posterImageUrl : null,
    customBgOpacity: 100,
    showCompartmentBoxes: !hasInitialCustomImage,
    showHeaderLockup: !hasInitialCustomImage,
    frameShape: 'ROUNDED',
    borderThickness: 2.5,
    goldGlow: 35,
    vignette: 12,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    hueRotate: 0,
    blurPx: 0,
    exposure: 100,
    noiseGrain: 0,
    titleFont: 'Cinzel',
    titleSize: 38,
    titleColor: '#7A4938',
    cards: computeCompartmentCards(initialParticipants),
    imageLayers: [],
    shapes: [],
    overlays: [],
    strokes: [],
  }));

  const [history, setHistory] = useState<StudioStateSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<StudioStateSnapshot[]>([]);

  const pushHistory = useCallback(
    (nextState: StudioStateSnapshot, label = 'Edited Poster') => {
      setStudio((prev) => {
        setHistory((h) => [...h.slice(-29), prev]);
        setRedoStack([]);
        return { ...nextState, historyLabel: label };
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [studio, ...r]);
    setHistory((h) => h.slice(0, -1));
    setStudio(prev);
  }, [history, studio]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory((h) => [...h, studio]);
    setRedoStack((r) => r.slice(1));
    setStudio(next);
  }, [redoStack, studio]);

  // Preload images into cache and trigger redraw
  const [imagesTick, setImagesTick] = useState(0);
  const ensureImageLoaded = useCallback((url: string) => {
    if (!url) return null;
    const cached = imageCacheRef.current.get(url);
    if (cached && cached.complete && cached.naturalWidth > 0) return cached;
    if (!cached) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setImagesTick((t) => t + 1);
      img.onerror = () => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => setImagesTick((t) => t + 1);
        fallbackImg.src = url;
        imageCacheRef.current.set(url, fallbackImg);
      };
      img.src = url;
      imageCacheRef.current.set(url, img);
    }
    return null;
  }, []);

  const uploadFileToImgBB = async (file: File): Promise<string> => {
    setUploadingAsset(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      try {
        const sessionToken = sessionStorage.getItem('ilm_admin_session_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (sessionToken) {
          headers.Authorization = `Bearer ${sessionToken}`;
        }
        const res = await fetch('/api/public/upload-poster', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fileName: file.name,
            base64Data: dataUrl,
          }),
        });
        const json = await res.json();
        if (res.ok && json.fileUrl) {
          return String(json.fileUrl);
        }
      } catch {
        // Fallback to dataUrl
      }
      return dataUrl;
    } finally {
      setUploadingAsset(false);
    }
  };

  // MAIN PHOTOSHOP CANVAS RENDER ENGINE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { canvasWidth: cw, canvasHeight: ch } = studio;
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);

    // Filter
    const effBrightness = Math.round(
      (studio.brightness * studio.exposure) / 100
    );
    ctx.filter = `brightness(${effBrightness}%) contrast(${studio.contrast}%) saturate(${studio.saturation}%) sepia(${studio.sepia}%) hue-rotate(${studio.hueRotate}deg) blur(${studio.blurPx}px)`;

    // Background Theme
    const blushGrad = ctx.createLinearGradient(0, 0, cw, ch);
    blushGrad.addColorStop(0, '#FFFDFB');
    blushGrad.addColorStop(0.45, '#FFF3F0');
    blushGrad.addColorStop(1, '#FCE7E2');
    ctx.fillStyle = blushGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Custom Uploaded Base Poster
    if (studio.customBgUrl) {
      const customBg = ensureImageLoaded(studio.customBgUrl);
      if (customBg) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.05, Math.min(1, studio.customBgOpacity / 100));
        ctx.drawImage(customBg, 0, 0, cw, ch);
        ctx.restore();
      }
    }

    // Outer Frame Border
    if (studio.borderThickness > 0) {
      ctx.strokeStyle = '#C88A65';
      ctx.lineWidth = studio.borderThickness;
      ctx.beginPath();
      ctx.roundRect(24, 24, cw - 48, ch - 48, 22);
      ctx.stroke();
    }

    // Header Lockup
    if (studio.showHeaderLockup) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = studio.titleColor;
      ctx.font = `800 ${studio.titleSize}px '${studio.titleFont}', Georgia, serif`;
      ctx.fillText(studio.title, cw / 2, 78);

      ctx.fillStyle = 'rgba(200, 138, 101, 0.14)';
      ctx.strokeStyle = '#C88A65';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cw / 2 - 280, 94, 560, 34, 17);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#8A4F38';
      ctx.font = "700 14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(studio.subtitle, cw / 2, 116);
      ctx.restore();
    }

    // Render Participant Cards
    for (const card of studio.cards) {
      if (!card.visible) continue;
      const { x, y, width: cardW, height: cardH } = card;
      const isCompact = cardH < 105;
      const namePlateH = isCompact ? 26 : 44;
      const imgH = Math.max(36, cardH - namePlateH);

      ctx.save();
      ctx.globalAlpha = card.opacity ?? 1;
      ctx.fillStyle = '#FFFDFB';
      ctx.strokeStyle = selectedCardId === card.id ? '#00D4FF' : '#C88A65';
      ctx.lineWidth = selectedCardId === card.id ? 3.5 : 2;

      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 14);
      ctx.fill();
      ctx.stroke();

      // Portrait Clip Region
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, cardW - 8, imgH - 4, 10);
      ctx.clip();

      const pImg = ensureImageLoaded(card.photoUrl);
      if (pImg) {
        ctx.drawImage(pImg, x + 4, y + 4, cardW - 8, imgH - 4);
      } else {
        ctx.fillStyle = '#F5E6E0';
        ctx.fillRect(x + 4, y + 4, cardW - 8, imgH - 4);
      }
      ctx.restore();

      // Name Badge
      ctx.fillStyle = '#8A4F38';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + imgH + 2, cardW - 8, namePlateH - 6, 8);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 12px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(card.fullName, x + cardW / 2, y + imgH + 19);
      ctx.restore();
    }

    ctx.restore();
  }, [studio, selectedCardId, imagesTick, ensureImageLoaded]);

  const exportCanvasDataUrl = (
    mimeType: 'image/png' | 'image/jpeg' = 'image/png'
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL(mimeType, 0.95);
  };

  const handleSaveToDatabase = async () => {
    setSaving(true);
    try {
      const dataUrl = exportCanvasDataUrl('image/png');
      const snapshotJson = JSON.stringify(
        studio.cards.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          photoUrl: c.photoUrl,
          classCode: c.classCode,
          categoryName: c.categoryName,
          ownTopic: c.ownTopic || null,
        }))
      );
      await onSavePoster(
        poster.id,
        dataUrl,
        studio.title,
        studio.subtitle,
        snapshotJson
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050609] text-neutral-100 flex flex-col overflow-hidden select-none">
      <header className="h-14 px-4 bg-[#0B0D14] border-b border-neutral-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3D068] font-display font-bold text-xs shrink-0">
            PS • ILM PHOTOSHOP STUDIO
          </span>
          <span className="text-xs text-neutral-300 font-semibold truncate hidden sm:inline">
            Class {poster.classCode} • Poster Editor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer shadow"
          >
            {saving ? 'Saving...' : 'Save Poster'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div
          ref={viewportRef}
          className="flex-1 bg-[#050609] overflow-auto flex items-center justify-center p-6"
        >
          <canvas
            ref={canvasRef}
            width={studio.canvasWidth}
            height={studio.canvasHeight}
            style={{
              width: `${Math.round(studio.canvasWidth * zoom)}px`,
              height: `${Math.round(studio.canvasHeight * zoom)}px`,
            }}
            className="border border-neutral-800 shadow-2xl block"
          />
        </div>
      </div>
    </div>
  );
};
