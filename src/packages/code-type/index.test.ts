import {barcodeRendererName, normalizeScannedType} from './index';

describe('тип кода', () => {
  it.each([
    ['ean-13', 'ean13'],
    ['qr-code', 'qr'],
    ['data-matrix', 'datamatrix'],
    ['pdf-417', 'pdf417'],
  ] as const)('нормализует %s в %s', (nativeType, expected) => {
    expect(normalizeScannedType(nativeType)).toBe(expected);
  });

  it('не сохраняет неподдерживаемый тип', () => {
    expect(normalizeScannedType('unknown')).toBeNull();
  });

  it('не подменяет неизвестный формат Code 128', () => {
    expect(barcodeRendererName('text')).toBeNull();
    expect(barcodeRendererName('ean13')).toBe('ean13');
  });
});
