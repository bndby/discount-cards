import {execFileSync} from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {join} from 'node:path';

const sourceRoot =
  process.env.PWA_ROOT ?? '/home/by/opennext-skidki';
const targetRoot = join(process.cwd(), 'src/assets/brands');
const brands = [
  'evroopt',
  'gippo',
  'green',
  'korona',
  'oma',
  'ostin',
  'prostore',
  'sosedi',
  'tri-ceny',
  'varka',
];

mkdirSync(targetRoot, {recursive: true});

for (const brand of brands) {
  const svg = join(sourceRoot, 'content/stores', brand, 'logo.svg');
  const png = join(sourceRoot, 'content/stores', brand, 'logo.png');
  let input = existsSync(svg) ? svg : png;
  let temporaryInput;

  if (brand === 'varka') {
    temporaryInput = join(targetRoot, '.varka-logo.svg');
    const firstLogo = `${readFileSync(svg, 'utf8').split('</svg>')[0]}</svg>`;
    writeFileSync(temporaryInput, firstLogo);
    input = temporaryInput;
  }

  for (const [suffix, size] of [
    ['', '96x96'],
    ['@2x', '192x192'],
    ['@3x', '288x288'],
  ]) {
    execFileSync('magick', [
      input,
      '-background',
      'none',
      '-gravity',
      'center',
      '-resize',
      `${size}>`,
      '-extent',
      size,
      join(targetRoot, `${brand}${suffix}.png`),
    ]);
  }

  if (temporaryInput) {
    unlinkSync(temporaryInput);
  }
}
