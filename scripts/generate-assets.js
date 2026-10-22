import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'src/assets/images');
fs.mkdirSync(dir, { recursive: true });

function createScholarSvg(name, gender, bgGrad1, bgGrad2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGrad1}" />
        <stop offset="100%" stop-color="${bgGrad2}" />
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#bg)" />
    <!-- Avatar Head & Robe Silhouette -->
    <circle cx="200" cy="150" r="70" fill="#FDE0D7" />
    ${gender === 'female' ? `
      <!-- Hijab / Scarf -->
      <path d="M 110 150 C 110 80, 290 80, 290 150 C 290 230, 260 270, 200 270 C 140 270, 110 230, 110 150 Z" fill="#2E384D" opacity="0.9" />
      <circle cx="200" cy="155" r="48" fill="#FCE5DD" />
      <path d="M 120 270 C 120 240, 280 240, 280 270 L 330 400 L 70 400 Z" fill="#1C2333" />
    ` : `
      <!-- Male Cap / Keffiyeh & Robe -->
      <rect x="135" y="80" width="130" height="35" rx="8" fill="#F1F5F9" />
      <path d="M 120 260 C 120 220, 280 220, 280 260 L 340 400 L 60 400 Z" fill="#1E293B" />
      <!-- Collar -->
      <path d="M 180 230 L 200 270 L 220 230 Z" fill="#F8FAFC" />
    `}
    <!-- Gold Border Ring -->
    <circle cx="200" cy="200" r="190" fill="none" stroke="#D4AF37" stroke-width="6" opacity="0.6" />
    <!-- Name Label -->
    <rect x="50" y="340" width="300" height="38" rx="19" fill="#0B0D14" fill-opacity="0.85" stroke="#D4AF37" stroke-width="1.5" />
    <text x="200" y="364" text-anchor="middle" fill="#F3D068" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="700">${name}</text>
  </svg>`;
}

function createTemplateSvg(title, bg1, bg2, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1130" width="1600" height="1130">
    <defs>
      <linearGradient id="tbg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
    </defs>
    <rect width="1600" height="1130" fill="url(#tbg)" />
    <!-- Arch Outline -->
    <path d="M 80 1080 L 80 400 C 80 150, 1520 150, 1520 400 L 1520 1080 Z" fill="none" stroke="${accent}" stroke-width="5" opacity="0.4" />
    <circle cx="800" cy="565" r="380" fill="none" stroke="${accent}" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.3" />
    <text x="800" y="120" text-anchor="middle" fill="${accent}" font-family="'Cinzel', serif" font-size="32" font-weight="700" letter-spacing="4">${title}</text>
  </svg>`;
}

const assets = [
  {
    file: 'scholar_portrait_ayesha_1791787508872.jpg',
    content: createScholarSvg('Ayesha Khan', 'female', '#3B1D28', '#160910'),
  },
  {
    file: 'scholar_portrait_ahmed_1791787523001.jpg',
    content: createScholarSvg('Ahmed Raza', 'male', '#14213D', '#0A0F1D'),
  },
  {
    file: 'scholar_portrait_zainab_1791787533783.jpg',
    content: createScholarSvg('Zainab Fatima', 'female', '#1C312E', '#091513'),
  },
  {
    file: 'scholar_portrait_faizan_1791787544478.jpg',
    content: createScholarSvg('Faizan Ali', 'male', '#2D1E12', '#140C07'),
  },
  {
    file: 'template_islamic_gold_1791886419127.jpg',
    content: createTemplateSvg('ISLAMIC GOLD ILLUMINATION', '#0F121C', '#07080E', '#F3D068'),
  },
  {
    file: 'template_emerald_arch_1791886441980.jpg',
    content: createTemplateSvg('EMERALD MIHRAB ARCH', '#052219', '#02100B', '#10B981'),
  },
  {
    file: 'template_sapphire_gold_1791886464289.jpg',
    content: createTemplateSvg('SAPPHIRE ROYAL AWARD', '#0B1E3F', '#040B18', '#60A5FA'),
  },
  {
    file: 'template_rose_botanical_1791886488823.jpg',
    content: createTemplateSvg('VINTAGE ROSE BOTANICAL', '#FFF5F5', '#FCE8E6', '#C88A65'),
  },
  {
    file: 'template_ruby_crimson_1791886521533.jpg',
    content: createTemplateSvg('BAROQUE RUBY CRIMSON', '#2A080E', '#120205', '#F43F5E'),
  },
];

for (const a of assets) {
  const p = path.join(dir, a.file);
  fs.writeFileSync(p, a.content, 'utf8');
}

console.log('All 9 asset placeholders successfully written to src/assets/images/');
