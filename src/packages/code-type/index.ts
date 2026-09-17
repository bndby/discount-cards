import type {BarcodeFormat} from 'react-native-vision-camera-barcode-scanner';

import type {CodeType} from '../discount-card';

const SCANNED_TYPES: Record<
  Exclude<BarcodeFormat, 'unknown'>,
  Exclude<CodeType, 'text'>
> = {
  'ean-13': 'ean13',
  'ean-8': 'ean8',
  'upc-a': 'upca',
  'upc-e': 'upce',
  'code-128': 'code128',
  'code-39': 'code39',
  'code-93': 'code93',
  itf: 'itf',
  codabar: 'codabar',
  'qr-code': 'qr',
  'data-matrix': 'datamatrix',
  'pdf-417': 'pdf417',
  aztec: 'aztec',
};

const BWIP_TYPES: Record<Exclude<CodeType, 'text'>, string> = {
  ean13: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  upce: 'upce',
  code128: 'code128',
  code39: 'code39',
  code93: 'code93',
  itf: 'interleaved2of5',
  codabar: 'rationalizedCodabar',
  qr: 'qrcode',
  datamatrix: 'datamatrix',
  pdf417: 'pdf417',
  aztec: 'azteccode',
};

export function normalizeScannedType(
  type: BarcodeFormat,
): Exclude<CodeType, 'text'> | null {
  return type === 'unknown' ? null : SCANNED_TYPES[type];
}

export function barcodeRendererName(type: CodeType): string | null {
  return type === 'text' ? null : BWIP_TYPES[type];
}

export const SCANNER_FORMATS = Object.keys(SCANNED_TYPES) as Exclude<
  BarcodeFormat,
  'unknown'
>[];
