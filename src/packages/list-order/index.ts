import type {DiscountCard} from '../discount-card';

export function sortCards(
  cards: readonly DiscountCard[],
  distanceByBrandId: ReadonlyMap<string, number>,
  displayName: (card: DiscountCard) => string,
): DiscountCard[] {
  return [...cards].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return left.isFavorite ? -1 : 1;
    }

    const leftDistance = left.catalogBrandId
      ? distanceByBrandId.get(left.catalogBrandId)
      : undefined;
    const rightDistance = right.catalogBrandId
      ? distanceByBrandId.get(right.catalogBrandId)
      : undefined;

    if (leftDistance !== undefined || rightDistance !== undefined) {
      if (leftDistance === undefined) {
        return 1;
      }
      if (rightDistance === undefined) {
        return -1;
      }
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
    }

    if (left.usageCount !== right.usageCount) {
      return right.usageCount - left.usageCount;
    }

    const nameOrder = displayName(left).localeCompare(
      displayName(right),
      'ru',
    );
    if (nameOrder !== 0) {
      return nameOrder;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
}
