import {
  CATALOG_BRANDS,
  findCatalogBrands,
  getCatalogBrand,
  getSelectableCatalogBrands,
} from './index';

describe('каталог', () => {
  it('содержит десять брендов без служебного custom', () => {
    expect(CATALOG_BRANDS).toHaveLength(10);
    expect(CATALOG_BRANDS.some(brand => brand.id === 'custom')).toBe(false);
  });

  it('ищет по каноническому имени без учёта регистра', () => {
    expect(findCatalogBrands('СОС').map(brand => brand.id)).toEqual(['sosedi']);
  });

  it('скрытый бренд остаётся разрешимым, но не выбирается', () => {
    const hiddenCatalog = CATALOG_BRANDS.map(brand =>
      brand.id === 'varka' ? {...brand, isHidden: true} : brand,
    );
    expect(getCatalogBrand('varka', hiddenCatalog)?.name).toBe('VARKA');
    expect(
      getSelectableCatalogBrands(hiddenCatalog).some(
        brand => brand.id === 'varka',
      ),
    ).toBe(false);
  });
});
