export const CODE_TYPES = [
  'ean13',
  'ean8',
  'upca',
  'upce',
  'code128',
  'code39',
  'code93',
  'itf',
  'codabar',
  'qr',
  'datamatrix',
  'pdf417',
  'aztec',
  'text',
] as const;

export type CodeType = (typeof CODE_TYPES)[number];

export type CardDraft = {
  catalogBrandId: string | null;
  customBrandName: string | null;
  code: string;
  codeType: CodeType;
  colorOverride: string | null;
  isFavorite: boolean;
  photos: string[];
};

export type DiscountCard = CardDraft & {
  id: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CardValidationErrors = Partial<
  Record<'brand' | 'code' | 'photos', string>
>;

export function validateCardDraft(
  draft: CardDraft,
): CardValidationErrors {
  const errors: CardValidationErrors = {};
  const hasCatalogBrand = Boolean(draft.catalogBrandId);
  const hasCustomBrand = Boolean(draft.customBrandName?.trim());

  if (hasCatalogBrand === hasCustomBrand) {
    errors.brand = 'card.validation.brand';
  }
  if (!draft.code.trim()) {
    errors.code = 'card.validation.code';
  }
  if (draft.photos.length > 2) {
    errors.photos = 'card.validation.photos';
  }

  return errors;
}

export function normalizeDraft(draft: CardDraft): CardDraft {
  return {
    ...draft,
    catalogBrandId: draft.catalogBrandId || null,
    customBrandName: draft.customBrandName?.trim() || null,
    code: draft.code.trim(),
    colorOverride: draft.colorOverride || null,
    photos: draft.photos.slice(0, 2),
  };
}
