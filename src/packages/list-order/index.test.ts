import type {DiscountCard} from '../discount-card';
import {sortCards} from './index';

function card(
  id: string,
  options: Partial<DiscountCard> = {},
): DiscountCard {
  return {
    id,
    catalogBrandId: id,
    customBrandName: null,
    code: id,
    codeType: 'text',
    colorOverride: null,
    isFavorite: false,
    photos: [],
    usageCount: 0,
    createdAt: `2026-09-${id.padStart(2, '0')}T00:00:00.000Z`,
    updatedAt: '2026-09-17T00:00:00.000Z',
    ...options,
  };
}

describe('порядок списка', () => {
  it('без гео ставит избранные выше частых', () => {
    const cards = [
      card('1', {usageCount: 10}),
      card('2', {isFavorite: true}),
      card('3', {usageCount: 5}),
    ];
    expect(sortCards(cards, new Map(), value => value.id).map(item => item.id))
      .toEqual(['2', '1', '3']);
  });

  it('после избранных ставит найденные магазины по расстоянию', () => {
    const cards = [
      card('1', {usageCount: 100}),
      card('2'),
      card('3', {isFavorite: true}),
    ];
    const distances = new Map([
      ['1', 4000],
      ['2', 500],
    ]);
    expect(sortCards(cards, distances, value => value.id).map(item => item.id))
      .toEqual(['3', '2', '1']);
  });

  it('карточки одного бренда делят расстояние', () => {
    const cards = [
      card('1', {catalogBrandId: 'green', usageCount: 1}),
      card('2', {catalogBrandId: 'green', usageCount: 2}),
    ];
    const distances = new Map([['green', 250]]);
    expect(
      sortCards(cards, distances, () => 'Green').map(item => item.id),
    ).toEqual(['2', '1']);
  });
});
