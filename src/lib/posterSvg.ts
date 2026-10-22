export interface PosterParticipantItem {
  id: number;
  admissionNo?: string | null;
  fullName: string;
  photoUrl: string;
  classCode: string;
  categoryName: string;
  ownTopic?: string | null;
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const CATEGORY_ORDER = [
  'Qirat',
  'Naat',
  'Speech',
  'Table Topic',
  'Evolution',
  'Aah Counter',
  'Marshal',
  'Grammarian',
] as const;

function renderHeading3D(
  text: string,
  x: number,
  y: number,
  fontSize = 34
): string {
  const safe = escapeXml(text);
  return `
    <g>
      <text x="${x - 2}" y="${y + 2}" text-anchor="middle" fill="#7DD3FC" fill-opacity="0.7" font-family="'Plus Jakarta Sans', 'Montserrat', sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="1.5">${safe}</text>
      <text x="${x + 1.5}" y="${y - 1}" text-anchor="middle" fill="#FDA4AF" fill-opacity="0.55" font-family="'Plus Jakarta Sans', 'Montserrat', sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="1.5">${safe}</text>
      <text x="${x}" y="${y}" text-anchor="middle" fill="#374151" font-family="'Plus Jakarta Sans', 'Montserrat', sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="1.5">${safe}</text>
    </g>
  `;
}

function truncateText(str: string, maxLen: number): string {
  const clean = String(str || '').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1).trim() + '…';
}

function renderPortraitSlot(params: {
  uidPrefix: string;
  idKey: string;
  person?: PosterParticipantItem | null;
  cx: number;
  cy: number;
  w: number;
  h: number;
  placeholderRole: string;
  showName?: boolean;
}): string {
  const {
    uidPrefix,
    idKey,
    person,
    cx,
    cy,
    w,
    h,
    placeholderRole,
    showName = true,
  } = params;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  const clipId = `clip-${uidPrefix}-${idKey}`;
  const rx = Math.round(w * 0.16);

  if (!person || !person.photoUrl) {
    return `
      <g transform="translate(${x}, ${y})">
        <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="#FFFFFF" fill-opacity="0.55" stroke="#E5C1BD" stroke-width="1.5" stroke-dasharray="6 4" />
        <circle cx="${w / 2}" cy="${h * 0.38}" r="${Math.min(w, h) * 0.17}" fill="#D6B4B0" fill-opacity="0.45" />
        <path d="M ${w * 0.22} ${h * 0.8} C ${w * 0.22} ${h * 0.58}, ${w * 0.78} ${h * 0.58}, ${w * 0.78} ${h * 0.8} Z" fill="#D6B4B0" fill-opacity="0.45" />
        <rect x="${-6}" y="${h - 6}" width="${w + 12}" height="22" rx="11" fill="#FFFFFF" fill-opacity="0.75" stroke="#E5C1BD" stroke-width="1" />
        <text x="${w / 2}" y="${h + 9}" text-anchor="middle" fill="#8C7370" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700">${escapeXml(placeholderRole)}</text>
      </g>
    `;
  }

  const safePhoto = escapeXml(person.photoUrl);
  const displayName = escapeXml(
    truncateText(person.fullName, w >= 180 ? 22 : w >= 115 ? 16 : 13)
  );
  const namePillW = Math.max(w + 18, Math.min(w + 38, person.fullName.length * 7.8 + 20));
  const namePillX = Math.round((w - namePillW) / 2);
  const nameFontSize = w >= 180 ? 15 : w >= 115 ? 12 : 10.5;
  const pillH = w >= 180 ? 28 : 23;

  return `
    <g transform="translate(${x}, ${y})">
      <defs>
        <clipPath id="${clipId}">
          <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" />
        </clipPath>
      </defs>
      <!-- Soft Halo Behind Portrait -->
      <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.54}" ry="${h * 0.52}" fill="#FFFFFF" fill-opacity="0.82" />
      <!-- Portrait Frame Base -->
      <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="#F8E7E5" />
      <!-- Uploaded Participant Photo -->
      <image href="${safePhoto}" xlink:href="${safePhoto}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${clipId})" />
      <!-- Crisp Gold/Rose Portrait Border -->
      <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="#C58B76" stroke-width="2.2" />
      ${
        showName
          ? `
        <!-- Participant Name Badge -->
        <rect x="${namePillX}" y="${h - Math.round(pillH * 0.42)}" width="${namePillW}" height="${pillH}" rx="${Math.round(pillH / 2)}" fill="#FFFFFF" fill-opacity="0.96" stroke="#C58B76" stroke-width="1.5" />
        <text x="${w / 2}" y="${h - Math.round(pillH * 0.42) + Math.round(pillH * 0.68)}" text-anchor="middle" fill="#111827" font-family="'Plus Jakarta Sans', sans-serif" font-size="${nameFontSize}" font-weight="800">${displayName}</text>
      `
          : ''
      }
    </g>
  `;
}

export function buildIlmPosterSvg(params: {
  classCode: string;
  categoryName: string;
  title: string;
  subtitle: string;
  participants: PosterParticipantItem[];
  bestSpeakerOverride?: PosterParticipantItem | null;
  dateLabel?: string;
}): string {
  const { classCode, participants, dateLabel } = params;
  const width = 1600;
  const height = 1130;
  const uidPrefix = String(classCode || 'cls').replace(/[^a-zA-Z0-9]/g, '');

  const byCat = (cat: string) =>
    participants.filter(
      (p) => p.categoryName.trim().toLowerCase() === cat.trim().toLowerCase()
    );

  const marshals = byCat('Marshal');
  const qirats = byCat('Qirat');
  const tableTopics = byCat('Table Topic');
  const grammarians = byCat('Grammarian');
  const aahCounters = byCat('Aah Counter');
  const speeches = byCat('Speech');
  const naats = byCat('Naat');
  const evolutions = byCat('Evolution');

  const todayStamp =
    dateLabel ||
    new Date()
      .toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
      .replace(/\//g, '-');

  // 5-slot dice coordinates for SPEAKERS / SPEECH (left column: x from 40 to 520, y from 680 to 1080)
  const speakerCoords = [
    { cx: 118, cy: 762 },
    { cx: 426, cy: 762 },
    { cx: 272, cy: 868 },
    { cx: 118, cy: 980 },
    { cx: 426, cy: 980 },
  ];

  // 5-slot dice coordinates for SINGERS / NAAT (middle column: x from 535 to 1045, y from 680 to 1080)
  const naatCoords = [
    { cx: 636, cy: 762 },
    { cx: 944, cy: 762 },
    { cx: 790, cy: 868 },
    { cx: 636, cy: 980 },
    { cx: 944, cy: 980 },
  ];

  // 5-slot dice coordinates for EVALUATORS / EVOLUTION (right column: x from 1060 to 1560, y from 680 to 1080)
  const evaluatorCoords = [
    { cx: 1160, cy: 762 },
    { cx: 1470, cy: 762 },
    { cx: 1315, cy: 868 },
    { cx: 1160, cy: 980 },
    { cx: 1470, cy: 980 },
  ];

  // 5-slot coordinates for TABLE TOPIC in Upper-Right Compartment (x from 1060 to 1590, y from 315 to 615)
  const tableTopicCoords = [
    { cx: 1150, cy: 388 },
    { cx: 1325, cy: 388 },
    { cx: 1500, cy: 388 },
    { cx: 1235, cy: 540 },
    { cx: 1415, cy: 540 },
  ];

  const speakersSvg = speakerCoords
    .map((pt, i) =>
      renderPortraitSlot({
        uidPrefix,
        idKey: `spk-${i}`,
        person: speeches[i] || null,
        cx: pt.cx,
        cy: pt.cy,
        w: 120,
        h: 144,
        placeholderRole: `Speaker ${i + 1}`,
      })
    )
    .join('\n');

  const naatsSvg = naatCoords
    .map((pt, i) =>
      renderPortraitSlot({
        uidPrefix,
        idKey: `naat-${i}`,
        person: naats[i] || null,
        cx: pt.cx,
        cy: pt.cy,
        w: 120,
        h: 144,
        placeholderRole: `Naat ${i + 1}`,
      })
    )
    .join('\n');

  const evaluatorsSvg = evaluatorCoords
    .map((pt, i) =>
      renderPortraitSlot({
        uidPrefix,
        idKey: `eval-${i}`,
        person: evolutions[i] || null,
        cx: pt.cx,
        cy: pt.cy,
        w: 120,
        h: 144,
        placeholderRole: `Evaluator ${i + 1}`,
      })
    )
    .join('\n');

  const tableTopicsSvg = tableTopicCoords
    .map((pt, i) =>
      renderPortraitSlot({
        uidPrefix,
        idKey: `tt-${i}`,
        person: tableTopics[i] || null,
        cx: pt.cx,
        cy: pt.cy,
        w: 96,
        h: 114,
        placeholderRole: `Topic ${i + 1}`,
      })
    )
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
    <defs>
      <!-- Soft Blush-Cream Watercolor Background matching reference image -->
      <linearGradient id="blushBg-${uidPrefix}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCE8E6" />
        <stop offset="35%" stop-color="#FFF7F6" />
        <stop offset="70%" stop-color="#FDF0EE" />
        <stop offset="100%" stop-color="#F9DFDC" />
      </linearGradient>

      <radialGradient id="watercolorSplash1-${uidPrefix}" cx="25%" cy="20%" r="40%">
        <stop offset="0%" stop-color="#F8C8C4" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="watercolorSplash2-${uidPrefix}" cx="75%" cy="65%" r="45%">
        <stop offset="0%" stop-color="#F6C2BE" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
      </radialGradient>

      <linearGradient id="leafBronze-${uidPrefix}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#C88A70" />
        <stop offset="50%" stop-color="#A56953" />
        <stop offset="100%" stop-color="#7C4B3A" />
      </linearGradient>

      <linearGradient id="leafRose-${uidPrefix}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E5B2A8" />
        <stop offset="100%" stop-color="#B97B6E" />
      </linearGradient>

      <!-- Official ILM Soundwave Pebble Logo Gradients -->
      <linearGradient id="ilmMainGrad-${uidPrefix}" x1="8%" y1="8%" x2="92%" y2="90%">
        <stop offset="0%" stop-color="#00D4FF" />
        <stop offset="48%" stop-color="#0A58FF" />
        <stop offset="100%" stop-color="#6A11CB" />
      </linearGradient>
      <linearGradient id="ilmTailGrad-${uidPrefix}" x1="0%" y1="15%" x2="95%" y2="85%">
        <stop offset="0%" stop-color="#00C8FF" />
        <stop offset="55%" stop-color="#0948DB" />
        <stop offset="100%" stop-color="#4A0D80" />
      </linearGradient>

      <filter id="softShadow-${uidPrefix}" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.22" />
      </filter>
    </defs>

    <!-- Base Watercolor Canvas -->
    <rect width="${width}" height="${height}" fill="url(#blushBg-${uidPrefix})" />
    <circle cx="400" cy="240" r="520" fill="url(#watercolorSplash1-${uidPrefix})" />
    <circle cx="1180" cy="740" r="560" fill="url(#watercolorSplash2-${uidPrefix})" />
    <circle cx="800" cy="520" r="460" fill="#FFFFFF" fill-opacity="0.55" />

    <!-- Top-Left Botanical Leaves & Calligraphic Class Script -->
    <g opacity="0.88">
      <path d="M -10 -10 Q 120 40 240 160" stroke="#9C604C" stroke-width="2.5" fill="none" />
      <path d="M 0 0 Q 180 10 380 45" stroke="#9C604C" stroke-width="2" fill="none" />
      <path d="M 10 0 Q 40 140 60 360" stroke="#9C604C" stroke-width="2" fill="none" />
      <path d="M 60 20 C 95 -5, 145 10, 165 45 C 125 55, 85 45, 60 20 Z" fill="url(#leafBronze-${uidPrefix})" />
      <path d="M 150 25 C 195 0, 250 18, 275 55 C 230 68, 180 55, 150 25 Z" fill="url(#leafRose-${uidPrefix})" />
      <path d="M 255 15 C 300 -8, 355 10, 385 45 C 340 58, 290 45, 255 15 Z" fill="url(#leafBronze-${uidPrefix})" opacity="0.85" />
      <path d="M 20 95 C 55 75, 95 110, 105 155 C 65 150, 35 125, 20 95 Z" fill="url(#leafRose-${uidPrefix})" />
      <path d="M 15 210 C 48 195, 82 235, 88 285 C 50 275, 25 245, 15 210 Z" fill="url(#leafBronze-${uidPrefix})" />
      <path d="M 5 330 C 35 315, 68 355, 72 405 C 38 395, 15 365, 5 330 Z" fill="url(#leafRose-${uidPrefix})" />
      <circle cx="420" cy="28" r="5" fill="#B86B52" />
      <circle cx="438" cy="36" r="4" fill="#D08870" />
      <circle cx="195" cy="145" r="5" fill="#B86B52" />
    </g>

    <!-- Bottom-Right Botanical Leaves -->
    <g opacity="0.88" transform="translate(1600, 1130) scale(-1, -1)">
      <path d="M -10 -10 Q 120 40 240 160" stroke="#9C604C" stroke-width="2.5" fill="none" />
      <path d="M 10 0 Q 40 140 60 360" stroke="#9C604C" stroke-width="2" fill="none" />
      <path d="M 60 20 C 95 -5, 145 10, 165 45 C 125 55, 85 45, 60 20 Z" fill="url(#leafBronze-${uidPrefix})" />
      <path d="M 150 25 C 195 0, 250 18, 275 55 C 230 68, 180 55, 150 25 Z" fill="url(#leafRose-${uidPrefix})" />
      <path d="M 20 95 C 55 75, 95 110, 105 155 C 65 150, 35 125, 20 95 Z" fill="url(#leafRose-${uidPrefix})" />
      <path d="M 15 210 C 48 195, 82 235, 88 285 C 50 275, 25 245, 15 210 Z" fill="url(#leafBronze-${uidPrefix})" />
      <path d="M 5 330 C 35 315, 68 355, 72 405 C 38 395, 15 365, 5 330 Z" fill="url(#leafRose-${uidPrefix})" />
    </g>

    <!-- Calligraphic Class Emblem in Top-Left (e.g., U1, U2, U3...) -->
    <text x="125" y="138" text-anchor="middle" fill="none" stroke="#C58B76" stroke-width="3" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-style="italic" font-size="112" font-weight="700" opacity="0.85">${escapeXml(classCode)}</text>
    <text x="122" y="135" text-anchor="middle" fill="#D89E88" fill-opacity="0.35" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-style="italic" font-size="112" font-weight="700">${escapeXml(classCode)}</text>

    <!-- Center-Top Official ILM Logo Icon + "ILM" Classic Serif Title Lockup -->
    <g filter="url(#softShadow-${uidPrefix})">
      <!-- Official ILM Soundwave Pebble Icon scaled and positioned beside ILM text -->
      <g transform="translate(618, 18) scale(0.56)">
        <path d="M 70 112 C 68 138, 74 158, 88 162 C 106 166, 150 126, 172 94 Z" fill="url(#ilmTailGrad-${uidPrefix})" />
        <path d="M 84 10 C 140 10, 186 42, 186 78 C 186 114, 136 130, 80 130 C 32 130, 10 102, 10 66 C 10 30, 38 10, 84 10 Z" fill="url(#ilmMainGrad-${uidPrefix})" />
        <rect x="40" y="64" width="8" height="22" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
        <rect x="54" y="54" width="8" height="38" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
        <rect x="68" y="44" width="8" height="54" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
        <path d="M 84 100 L 84 48 C 84 34, 108 34, 108 48 L 108 100 M 91 100 L 91 49 C 91 41, 101 41, 101 49 L 101 100" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" />
        <rect x="116" y="44" width="8" height="54" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
        <rect x="130" y="54" width="8" height="38" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
        <rect x="144" y="64" width="8" height="22" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
      </g>
      <text x="738" y="92" text-anchor="start" fill="#111111" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="84" font-weight="700" letter-spacing="4">ILM</text>
      <text x="740" y="114" text-anchor="start" fill="#6E473B" font-family="'Plus Jakarta Sans', sans-serif" font-size="13.5" font-weight="800" letter-spacing="1.6">INTEGRATED LEARNING MASTER</text>
    </g>

    <!-- =====================================================================
         STRUCTURAL VERTICAL DIVIDER LINES
         ===================================================================== -->
    <line x1="1050" y1="0" x2="1050" y2="615" stroke="#111111" stroke-width="3" />
    <line x1="532" y1="670" x2="532" y2="1130" stroke="#111111" stroke-width="3" />
    <line x1="1048" y1="635" x2="1048" y2="1130" stroke="#111111" stroke-width="3" />

    <!-- =====================================================================
         UPPER-LEFT SECTION: MARSHAL (Max 1)
         ===================================================================== -->
    ${renderHeading3D('MARSHAL', 280, 235, 50)}
    ${renderPortraitSlot({
      uidPrefix,
      idKey: 'marshal-main',
      person: marshals[0] || null,
      cx: 280,
      cy: 430,
      w: 240,
      h: 285,
      placeholderRole: 'Class Marshal',
    })}

    <!-- =====================================================================
         UPPER-CENTER SECTION: QIRATH (Max 1)
         ===================================================================== -->
    ${renderHeading3D('QIRATH', 810, 235, 50)}
    ${renderPortraitSlot({
      uidPrefix,
      idKey: 'qirath-main',
      person: qirats[0] || null,
      cx: 810,
      cy: 430,
      w: 240,
      h: 285,
      placeholderRole: 'Qirat Reciter',
    })}
    <!-- Vertical Date Stamp next to Qirath -->
    <text x="985" y="440" text-anchor="middle" transform="rotate(90, 985, 440)" fill="#E09F95" font-family="'Cinzel', Georgia, serif" font-style="italic" font-size="24" font-weight="700" letter-spacing="2">${escapeXml(todayStamp)}</text>

    <!-- =====================================================================
         UPPER-RIGHT PANEL: GRAMMARIAN (1), AH COUNTER (1) & TABLE TOPIC (5)
         ===================================================================== -->
    ${renderHeading3D('GRAMMARIAN', 1195, 58, 25)}
    ${renderPortraitSlot({
      uidPrefix,
      idKey: 'grammarian-1',
      person: grammarians[0] || null,
      cx: 1195,
      cy: 155,
      w: 118,
      h: 140,
      placeholderRole: 'Grammarian',
    })}

    ${renderHeading3D('AH COUNTER', 1455, 58, 25)}
    ${renderPortraitSlot({
      uidPrefix,
      idKey: 'ah-counter-1',
      person: aahCounters[0] || null,
      cx: 1455,
      cy: 155,
      w: 118,
      h: 140,
      placeholderRole: 'Aah Counter',
    })}

    ${renderHeading3D('TABLE TOPIC', 1325, 298, 28)}
    ${tableTopicsSvg}

    <!-- =====================================================================
         LOWER THREE COLUMNS: SPEAKERS (5) | SINGERS - NAAT (5) | EVALUATORS (5)
         ===================================================================== -->
    <!-- Column 1: SPEAKERS (Speech) -->
    ${renderHeading3D('SPEAKERS', 272, 662, 36)}
    ${speakersSvg}

    <!-- Column 2: SINGERS - NAAT -->
    ${renderHeading3D('SINGERS - NAAT', 790, 662, 34)}
    ${naatsSvg}

    <!-- Column 3: EVALUATORS (Evolution) -->
    ${renderHeading3D('EVALUATORS', 1315, 662, 36)}
    ${evaluatorsSvg}
  </svg>`;
}

export function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}
