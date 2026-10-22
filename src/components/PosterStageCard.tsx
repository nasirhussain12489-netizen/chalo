import React, { useState, useMemo, useId } from 'react';
import {
  Download,
  Maximize2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Send,
  Upload,
  Share2,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { PosterRecord, ParticipantRecord } from '../types.ts';
import {
  IlmLogo,
  downloadPosterAsPng,
  rasterizePosterToPngDataUrl,
} from './IlmLogo.tsx';
import { buildIlmPosterSvg, CATEGORY_ORDER } from '../lib/posterSvg.ts';
import { safeFetchJson, formatErrorMessage } from '../lib/api.ts';

function getPosterAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const sessionToken = sessionStorage.getItem('ilm_admin_session_token');
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }
  return headers;
}

interface PosterStageCardProps {
  poster: PosterRecord;
  liveParticipants?: ParticipantRecord[];
  isHero?: boolean;
  canManage?: boolean;
  onChangePoster?: () => void;
  onPrevPoster?: () => void;
  totalPostersCount?: number;
  currentPosterIndex?: number;
  onInspectPoster?: (poster: PosterRecord) => void;
  onEditStudio?: (poster: PosterRecord) => void;
  onOpenStudio?: (poster: PosterRecord) => void;
  onRegenerate?: () => void;
  onPostToFeed?: (poster: PosterRecord) => void;
  onPosterUpdated?: (updatedPoster?: PosterRecord) => void;
}

export const PosterStageCard: React.FC<PosterStageCardProps> = ({
  poster,
  liveParticipants,
  isHero = false,
  canManage = false,
  onChangePoster,
  onPrevPoster,
  totalPostersCount = 1,
  currentPosterIndex = 0,
  onInspectPoster,
  onEditStudio,
  onOpenStudio,
  onPostToFeed,
  onPosterUpdated,
}) => {
  const studioHandler = onEditStudio || onOpenStudio;
  const [downloading, setDownloading] = useState(false);
  const [uploadingCustom, setUploadingCustom] = useState(false);
  const [resettingAuto, setResettingAuto] = useState(false);
  const [localPosterUrl, setLocalPosterUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'CUSTOM' | 'AUTO'>('CUSTOM');

  // Share to Feed & Socials Modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTitle, setShareTitle] = useState(
    `Class ${poster.classCode} Official Competition Poster`
  );
  const [shareCaption, setShareCaption] = useState(
    `Official Class ${poster.classCode} Competition Lineup Poster • Marshal, Qirath, Grammarian, Ah Counter, Table Topic, Speakers, Singers (Naat) & Evaluators.`
  );
  const [sharingToFeed, setSharingToFeed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusToast, setStatusToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const instanceUid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const effectivePosterUrl = localPosterUrl ?? poster.posterImageUrl;
  const hasCustomPosterImage = Boolean(
    effectivePosterUrl && !effectivePosterUrl.startsWith('data:image/svg+xml')
  );

  const parsedParticipants = useMemo(() => {
    if (liveParticipants !== undefined) {
      return liveParticipants
        .filter((p) => p.classCode === poster.classCode)
        .map((p) => ({
          id: p.id,
          admissionNo: p.admissionNo || null,
          fullName: p.fullName,
          photoUrl: p.photoUrl,
          classCode: p.classCode,
          categoryName: p.categoryName,
          ownTopic: p.ownTopic || null,
        }));
    }
    try {
      return JSON.parse(poster.participantsSnapshot || '[]');
    } catch {
      return [];
    }
  }, [liveParticipants, poster.classCode, poster.participantsSnapshot]);

  // Render inline SVG markup directly in the DOM
  const inlinePosterSvg = useMemo(() => {
    const rawSvg = buildIlmPosterSvg({
      classCode: poster.classCode,
      categoryName: poster.categoryName,
      title: poster.title,
      subtitle: poster.subtitle,
      participants: parsedParticipants,
    });
    const basePrefix = String(poster.classCode || 'cls').replace(
      /[^a-zA-Z0-9]/g,
      ''
    );
    return rawSvg.replace(
      new RegExp(
        `(clip|blushBg|watercolorSplash1|watercolorSplash2|leafBronze|leafRose|ilmMainGrad|ilmTailGrad|softShadow)-${basePrefix}`,
        'g'
      ),
      `$1-${basePrefix}-${instanceUid}`
    );
  }, [
    poster.classCode,
    poster.categoryName,
    poster.title,
    poster.subtitle,
    parsedParticipants,
    instanceUid,
  ]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const effectivePoster: PosterRecord = {
        ...poster,
        posterImageUrl:
          hasCustomPosterImage && previewMode === 'CUSTOM'
            ? effectivePosterUrl
            : `data:image/svg+xml;utf8,${encodeURIComponent(inlinePosterSvg)}`,
        participantsSnapshot: JSON.stringify(parsedParticipants),
      };
      await downloadPosterAsPng(effectivePoster);
    } finally {
      setDownloading(false);
    }
  };

  // Upload a pre-made custom poster image directly to ImgBB and set as this class's poster
  const handleUploadPreMadePoster = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCustom(true);
    setStatusToast(null);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      const headers = await getPosterAuthHeaders();
      const uploadRes = await fetch('/api/public/upload-poster', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileName: file.name,
          base64Data,
        }),
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || 'Failed to upload custom poster.');
      }

      const patchRes = await fetch(`/api/public/posters/${poster.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          posterImageUrl: uploadJson.fileUrl,
          participantsSnapshot: JSON.stringify(parsedParticipants),
        }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchJson.error || 'Failed to save uploaded poster.');
      }

      setLocalPosterUrl(uploadJson.fileUrl);
      setPreviewMode('CUSTOM');
      setStatusToast({
        type: 'success',
        text: `Uploaded pre-made poster for Class ${poster.classCode} (Hosted on ImgBB)!`,
      });
      if (onPosterUpdated) {
        onPosterUpdated(patchJson.poster);
      }
    } catch (err: any) {
      setStatusToast({
        type: 'error',
        text: err.message || 'Could not upload pre-made poster.',
      });
    } finally {
      setUploadingCustom(false);
      e.target.value = '';
    }
  };

  // Reset back to the automatic live-participant Botanical Blush-Cream SVG Poster
  const handleResetToAutoPoster = async () => {
    setResettingAuto(true);
    setStatusToast(null);
    try {
      const headers = await getPosterAuthHeaders();
      const res = await fetch(`/api/public/posters/${poster.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ resetToAuto: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to restore auto poster.');
      }
      setLocalPosterUrl(json.poster.posterImageUrl);
      setPreviewMode('AUTO');
      setStatusToast({
        type: 'success',
        text: `Restored live auto-generated participant poster for Class ${poster.classCode}.`,
      });
      if (onPosterUpdated) {
        onPosterUpdated(json.poster);
      }
    } catch (err: any) {
      setStatusToast({
        type: 'error',
        text: err.message || 'Could not reset poster.',
      });
    } finally {
      setResettingAuto(false);
    }
  };

  // Publish & Share this poster to the Community Feed
  const handleConfirmShareToFeed = async () => {
    setSharingToFeed(true);
    setStatusToast(null);
    try {
      const effectivePoster: PosterRecord = {
        ...poster,
        posterImageUrl:
          hasCustomPosterImage && previewMode === 'CUSTOM'
            ? effectivePosterUrl
            : `data:image/svg+xml;utf8,${encodeURIComponent(inlinePosterSvg)}`,
        participantsSnapshot: JSON.stringify(parsedParticipants),
      };
      const pngOrCustomUrl = await rasterizePosterToPngDataUrl(effectivePoster);

      const headers = await getPosterAuthHeaders();
      const { ok, data: json, error: apiErr } = await safeFetchJson<any>(
        `/api/public/posters/${poster.id}/share-to-feed`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: shareTitle.trim(),
            caption: shareCaption.trim(),
            mediaUrl: pngOrCustomUrl,
            submittedByName: `Class ${poster.classCode} Official Poster`,
          }),
        }
      );
      if (!ok) {
        throw new Error(apiErr || 'Failed to share poster to Feed.');
      }
      setShowShareModal(false);
      setStatusToast({
        type: 'success',
        text: `Class ${poster.classCode} Poster shared to the Public Feed!`,
      });
      if (onPosterUpdated) {
        onPosterUpdated();
      }
      if (onPostToFeed) {
        // Optional callback notification
      }
    } catch (err: unknown) {
      setStatusToast({
        type: 'error',
        text: formatErrorMessage(err, 'Failed to share poster to Feed.'),
      });
    } finally {
      setSharingToFeed(false);
    }
  };

  const handleCopyShareLink = async () => {
    const shareUrl =
      hasCustomPosterImage && effectivePosterUrl.startsWith('http')
        ? effectivePosterUrl
        : window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleNativeDeviceShare = async () => {
    const shareUrl =
      hasCustomPosterImage && effectivePosterUrl.startsWith('http')
        ? effectivePosterUrl
        : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareCaption,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopyShareLink();
    }
  };

  const count = parsedParticipants.length;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0E1118] via-[#090B10] to-[#07080C] border-2 border-[#D4AF37]/55 shadow-2xl ${
        isHero ? 'p-5 sm:p-8 lg:p-10' : 'p-4 sm:p-6'
      }`}
    >
      {/* Top Row: Brand Lockup + Actions */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <IlmLogo size={isHero ? 'md' : 'sm'} showSubtitle={isHero} />
        </div>

        <div className="flex items-center gap-2.5 text-xs text-neutral-300">
          <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 font-bold text-[#F3D068] tracking-widest uppercase">
            Class {poster.classCode}
          </span>
          <span aria-hidden="true">•</span>
          <span className="font-medium text-neutral-200">
            {hasCustomPosterImage && previewMode === 'CUSTOM'
              ? 'Custom / Edited Poster'
              : 'Official Designer Class Poster'}
          </span>
          <span aria-hidden="true">•</span>
          <span className="font-mono-tabular text-[#F3D068] font-semibold">
            {count} / 24 Candidates
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Edit Poster in Full Photoshop Studio (Super Admin & Admin only) */}
          {canManage && studioHandler && (
            <button
              type="button"
              onClick={() =>
                studioHandler({
                  ...poster,
                  posterImageUrl: effectivePosterUrl,
                  participantsSnapshot: JSON.stringify(parsedParticipants),
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#C89D2E] via-[#E8C55B] to-[#C89D2E] hover:brightness-110 text-neutral-950 font-bold text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer shadow"
              title="Open Full Photoshop Studio with all tools to edit this poster"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Poster (Photoshop)</span>
            </button>
          )}

          {/* 2. Upload Pre-Made Poster (Super Admin & Admin only) */}
          {canManage && (
            <label
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-500/50 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Upload a pre-made poster image from your computer or phone (Saved to ImgBB)"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {uploadingCustom ? 'Uploading...' : 'Upload Pre-Made Poster'}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploadingCustom}
                onChange={handleUploadPreMadePoster}
              />
            </label>
          )}

          {/* 3. Share to Feed & Socials (Super Admin & Admin only) */}
          {canManage && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-600/50 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Share this poster to the Community Feed or Social Media"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share to Feed</span>
            </button>
          )}

          {/* 4. Full View */}
          {onInspectPoster && (
            <button
              type="button"
              onClick={() =>
                onInspectPoster({
                  ...poster,
                  posterImageUrl: effectivePosterUrl,
                  participantsSnapshot: JSON.stringify(parsedParticipants),
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Open poster in full view"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Full View</span>
            </button>
          )}

          {/* 5. Download HD PNG */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#161922] hover:bg-[#1E2230] text-[#F3D068] border border-[#D4AF37]/40 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Exporting...' : 'Download'}</span>
          </button>
        </div>
      </div>

      {/* Status Toast if uploaded or shared */}
      {statusToast && (
        <div
          className={`relative z-10 mt-3 px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs ${
            statusToast.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-600/50 text-emerald-200'
              : 'bg-red-950/70 border-red-600/50 text-red-200'
          }`}
        >
          <span>{statusToast.text}</span>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="p-1 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Category Summary Chips + Custom vs Auto Toggle */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 my-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_ORDER.map((cat) => {
            const catCount = parsedParticipants.filter(
              (p: { categoryName: string }) =>
                p.categoryName.trim().toLowerCase() === cat.trim().toLowerCase()
            ).length;
            return (
              <span
                key={cat}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  catCount > 0
                    ? 'bg-[#151926] text-[#F3D068] border-[#D4AF37]/40'
                    : 'bg-neutral-950/60 text-neutral-500 border-neutral-800/80'
                }`}
              >
                {cat}: {catCount}
              </span>
            );
          })}
        </div>

        {canManage && hasCustomPosterImage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPreviewMode((m) => (m === 'CUSTOM' ? 'AUTO' : 'CUSTOM'))
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141926] hover:bg-[#1B2234] text-[#F3D068] border border-[#D4AF37]/40 text-[11px] font-semibold cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>
                {previewMode === 'CUSTOM'
                  ? 'Switch to Auto Template View'
                  : 'Switch to Custom Uploaded View'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleResetToAutoPoster}
              disabled={resettingAuto}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-[11px] cursor-pointer"
              title="Restore default auto-generated SVG poster"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{resettingAuto ? 'Resetting...' : 'Restore Auto'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Poster Display: Custom Uploaded/Edited Image OR Live Botanical Blush-Cream Compartmentalized SVG */}
      {hasCustomPosterImage && previewMode === 'CUSTOM' ? (
        <div
          onClick={() =>
            onInspectPoster &&
            onInspectPoster({
              ...poster,
              posterImageUrl: effectivePosterUrl,
              participantsSnapshot: JSON.stringify(parsedParticipants),
            })
          }
          className="relative z-10 my-2 rounded-xl overflow-hidden border-2 border-[#D4AF37]/50 shadow-2xl bg-[#0B0D14] cursor-pointer group w-full flex items-center justify-center"
        >
          <img
            src={effectivePosterUrl}
            alt={poster.title}
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[820px] object-contain block"
          />
        </div>
      ) : (
        <div
          onClick={() =>
            onInspectPoster &&
            onInspectPoster({
              ...poster,
              posterImageUrl: effectivePosterUrl,
              participantsSnapshot: JSON.stringify(parsedParticipants),
            })
          }
          className="relative z-10 my-2 rounded-xl overflow-hidden border-2 border-[#D4AF37]/50 shadow-2xl bg-[#FFF5F5] cursor-pointer group aspect-[1600/1130] w-full"
          dangerouslySetInnerHTML={{ __html: inlinePosterSvg }}
        />
      )}

      {/* Poster Footer & Change Poster Controls */}
      <div className="relative z-10 mt-5 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-neutral-400 tracking-wider uppercase text-center sm:text-left">
          <span className="text-[#D4AF37] font-display font-semibold">
            Class {poster.classCode} Unified Competition Poster
          </span>
          <span className="mx-2" aria-hidden="true">
            •
          </span>
          <span>
            Marshal • Qirath • Grammarian • Ah Counter • Table Topic • Speakers •
            Singers (Naat) • Evaluators
          </span>
        </div>

        {isHero && onChangePoster && (
          <div className="flex items-center gap-3">
            {onPrevPoster && totalPostersCount > 1 && (
              <button
                type="button"
                onClick={onPrevPoster}
                aria-label="Previous poster"
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onChangePoster}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#C89D2E] via-[#E8C55B] to-[#C89D2E] hover:brightness-110 text-neutral-950 font-semibold text-sm shadow-lg transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Change Class Poster</span>
            </button>
            {totalPostersCount > 1 && (
              <button
                type="button"
                onClick={onChangePoster}
                aria-label="Next poster"
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs font-mono-tabular text-neutral-400 ml-1">
              {currentPosterIndex + 1} / {Math.max(1, totalPostersCount)}
            </span>
          </div>
        )}
      </div>

      {/* Share to Feed & External Social Share Modal */}
      {showShareModal && (
        <div
          onClick={() => setShowShareModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-[#0E1118] border-2 border-[#D4AF37]/50 p-6 space-y-5 shadow-2xl text-left"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Share Class {poster.classCode} Poster to Feed & Socials
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Publish this poster directly to the Community Feed or share it externally.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Feed Post Title
                </label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141824] border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Feed Caption / Description
                </label>
                <textarea
                  rows={3}
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141824] border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            {/* Primary Action: Publish to ILM Community Feed */}
            <button
              type="button"
              disabled={sharingToFeed}
              onClick={handleConfirmShareToFeed}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C89D2E] via-[#E8C55B] to-[#C89D2E] hover:brightness-110 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {sharingToFeed
                  ? 'Rendering & Publishing to Feed...'
                  : `Publish Poster to Class ${poster.classCode} Feed`}
              </span>
            </button>

            {/* Quick External Share Actions */}
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#151924] hover:bg-[#1C2230] text-neutral-200 border border-neutral-700 text-xs font-medium cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Copy Share Link</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleNativeDeviceShare}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#151924] hover:bg-[#1C2230] text-neutral-200 border border-neutral-700 text-xs font-medium cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Share via App / Device</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#151924] hover:bg-[#1C2230] text-[#F3D068] border border-[#D4AF37]/40 text-xs font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
