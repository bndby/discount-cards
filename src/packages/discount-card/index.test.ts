import {
  CardDraft,
  DiscountCard,
  validateCardDraft,
} from './index';

const validDraft: CardDraft = {
  catalogBrandId: 'evroopt',
  customBrandName: null,
  code: '123456',
  codeType: 'ean13',
  colorOverride: null,
  isFavorite: false,
  photos: [],
};

describe('скидочная карточка', () => {
  it('принимает ровно один вид бренда и непустой код', () => {
    expect(validateCardDraft(validDraft)).toEqual({});
    expect(
      validateCardDraft({
        ...validDraft,
        customBrandName: 'Другой',
      }),
    ).toMatchObject({brand: 'card.validation.brand'});
    expect(
      validateCardDraft({
        ...validDraft,
        catalogBrandId: null,
        code: '   ',
      }),
    ).toMatchObject({code: 'card.validation.code'});
  });

  it('не разрешает больше двух фотографий', () => {
    expect(
      validateCardDraft({
        ...validDraft,
        photos: ['one.jpg', 'two.jpg', 'three.jpg'],
      }),
    ).toMatchObject({photos: 'card.validation.photos'});
  });

  it('сохраняет исходное значение кода без краевых пробелов', () => {
    const errors = validateCardDraft({...validDraft, code: ' 12 34 '});
    expect(errors).toEqual({});
  });

  it('модель допускает несколько карточек одного бренда', () => {
    const first: DiscountCard = {
      ...validDraft,
      id: '1',
      code: '111',
      usageCount: 0,
      createdAt: '2026-09-17T00:00:00.000Z',
      updatedAt: '2026-09-17T00:00:00.000Z',
    };
    const second = {...first, id: '2', code: '222'};
    expect(first.catalogBrandId).toBe(second.catalogBrandId);
  });
});
