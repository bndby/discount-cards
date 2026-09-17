import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {BRAND_LOGOS} from '../assets/brandLogos';
import {
  getCatalogBrand,
  type CatalogBrand,
} from '../packages/catalog';
import type {DiscountCard} from '../packages/discount-card';

export function cardBrand(card: DiscountCard): CatalogBrand | null {
  return card.catalogBrandId
    ? getCatalogBrand(card.catalogBrandId) ?? null
    : null;
}

export function cardDisplayName(card: DiscountCard): string {
  return cardBrand(card)?.name ?? card.customBrandName ?? '';
}

export function cardDisplayColor(card: DiscountCard): string {
  return card.colorOverride ?? cardBrand(card)?.color ?? '#68736c';
}

export function BrandLogo({
  card,
  size = 48,
}: {
  card: DiscountCard;
  size?: number;
}) {
  const brand = cardBrand(card);
  const name = cardDisplayName(card);
  return (
    <View
      style={[
        styles.logo,
        {width: size, height: size, backgroundColor: cardDisplayColor(card)},
      ]}>
      {brand ? (
        <Image
          source={BRAND_LOGOS[brand.logoKey]}
          resizeMode="contain"
          style={{width: size - 10, height: size - 10}}
        />
      ) : (
        <Text style={styles.initials}>
          {name
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toLocaleUpperCase('ru')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  initials: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
});
