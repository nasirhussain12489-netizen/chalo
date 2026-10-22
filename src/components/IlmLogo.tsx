import React, { useId } from 'react';
import { PosterRecord } from '../types.ts';
import { buildIlmPosterSvg } from '../lib/posterSvg.ts';

interface IlmLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const IlmLogo: React.FC<IlmLogoProps> = ({
  size = 'md',
  showSubtitle = true,
}) => {
  const uid = useId().replace(/:/g, '');
  const mainGradId = `ilmMainGrad_${uid}`;
  const tailGradId = `ilmTailGrad_${uid}`;

  const iconSizeClass =
    size === 'sm'
      ? 'w-9 h-8'
      : size === 'lg'
      ? 'w-16 h-14'
      : 'w-11 h-10';
  const titleClass =
    size === 'sm'
      ? 'text-xl tracking-wide'
      : size === 'lg'
      ? 'text-4xl tracking-wide'
      : 'text-2xl tracking-wide';
  const subtitleClass =
    size === 'sm'
      ? 'text-[9.5px]'
      : size === 'lg'
      ? 'text-xs'
      : 'text-[10.5px]';

  return (
    <div className="inline-flex items-center gap-2.5 select-none shrink-0 bg-transparent">
      {/* Transparent-background official ILM Soundwave Pebble Icon */}
      <svg
        viewBox="0 0 190 168"
        className={`${iconSizeClass} shrink-0 overflow-visible`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={mainGradId} x1="8%" y1="8%" x2="92%" y2="90%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="48%" stopColor="#0A58FF" />
            <stop offset="100%" stopColor="#6A11CB" />
          </linearGradient>
          <linearGradient id={tailGradId} x1="0%" y1="15%" x2="95%" y2="85%">
            <stop offset="0%" stopColor="#00C8FF" />
            <stop offset="55%" stopColor="#0948DB" />
            <stop offset="100%" stopColor="#4A0D80" />
          </linearGradient>
        </defs>
        {/* Lower Tail Fold */}
        <path
          d="M 70 112 C 68 138, 74 158, 88 162 C 106 166, 150 126, 172 94 Z"
          fill={`url(#${tailGradId})`}
        />
        {/* Main 3D Organic Speech-Pebble Shape */}
        <path
          d="M 84 10 C 140 10, 186 42, 186 78 C 186 114, 136 130, 80 130 C 32 130, 10 102, 10 66 C 10 30, 38 10, 84 10 Z"
          fill={`url(#${mainGradId})`}
        />
        {/* 7 White Rounded Pill/Arch Soundwave Bars */}
        {/* Outer Left Pill */}
        <rect
          x="40"
          y="64"
          width="8"
          height="22"
          rx="4"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
        {/* Middle Left Pill */}
        <rect
          x="54"
          y="54"
          width="8"
          height="38"
          rx="4"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
        {/* Inner Left Pill */}
        <rect
          x="68"
          y="44"
          width="8"
          height="54"
          rx="4"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
        {/* Central Double-Wall Arch */}
        <path
          d="M 84 100 L 84 48 C 84 34, 108 34, 108 48 L 108 100 M 91 100 L 91 49 C 91 41, 101 41, 101 49 L 101 100"
          stroke="#FFFFFF"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {/* Inner Right Pill */}
        <rect
          x="116"
          y="44"
          width="8"
          height="54"
          rx="4"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
        {/* Middle Right Pill */}
        <rect
          x="130"
          y="54"
          width="8"
          height="38"
          rx="4"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
        {/* Outer Right Pill */}
        <rect
          x="144"
          y="64"
          width="8"
          height="22"
          rx="4"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
      </svg>

      {/* Right Text Lockup (ILM + Integrated Learning Master) */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-sans font-extrabold text-[#1E6BFF] leading-none ${titleClass} whitespace-nowrap`}
        >
          ILM
        </span>
        {showSubtitle && (
          <span
            className={`${subtitleClass} text-neutral-200 tracking-tight mt-1 whitespace-nowrap`}
          >
            <strong className="font-bold text-white">I</strong>ntegrated{' '}
            <strong className="font-bold text-white">L</strong>earning{' '}
            <strong className="font-bold text-white">M</strong>aster
          </span>
        )}
      </div>
    </div>
  );
};

async function imageUrlToDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || url));
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export async function rasterizePosterToPngDataUrl(
  poster: PosterRecord
): Promise<string> {
  if (
    poster.posterImageUrl &&
    !poster.posterImageUrl.startsWith('data:image/svg+xml')
  ) {
    return poster.posterImageUrl;
  }

  let participantsList: Array<{
    id: number;
    admissionNo?: string | null;
    fullName: string;
    photoUrl: string;
    classCode: string;
    categoryName: string;
    ownTopic?: string | null;
  }> = [];

  try {
    participantsList = JSON.parse(poster.participantsSnapshot || '[]');
  } catch {
    participantsList = [];
  }

  const inlinedParticipants = await Promise.all(
    participantsList.map(async (p) => ({
      ...p,
      photoUrl: await imageUrlToDataUrl(p.photoUrl),
    }))
  );

  const svgString = buildIlmPosterSvg({
    classCode: poster.classCode,
    categoryName: poster.categoryName,
    title: poster.title,
    subtitle: poster.subtitle,
    participants: inlinedParticipants,
  });

  const svgBlob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 1130;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#FFF5F5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png', 0.95));
      };
      img.onerror = () => reject(new Error('SVG image load error'));
      img.src = url;
    });
  } catch {
    return poster.posterImageUrl;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}

export async function downloadPosterAsPng(poster: PosterRecord): Promise<void> {
  const safeName = `ILM_${poster.classCode}_${poster.categoryName.replace(
    /\s+/g,
    '_'
  )}_Poster.png`;

  if (
    poster.posterImageUrl &&
    !poster.posterImageUrl.startsWith('data:image/svg+xml')
  ) {
    const dataOrUrl = await imageUrlToDataUrl(poster.posterImageUrl);
    const link = document.createElement('a');
    link.download = safeName;
    link.href = dataOrUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  try {
    const pngUrl = await rasterizePosterToPngDataUrl(poster);
    const link = document.createElement('a');
    link.download = safeName;
    link.href = pngUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    const link = document.createElement('a');
    link.download = `ILM_${poster.classCode}_${poster.categoryName.replace(
      /\s+/g,
      '_'
    )}_Poster.svg`;
    link.href = poster.posterImageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
