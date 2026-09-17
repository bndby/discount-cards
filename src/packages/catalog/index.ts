export type CatalogBrand = {
  id: string;
  name: string;
  color: string;
  aliases: readonly string[];
  logoKey: string;
  isHidden: boolean;
};

export const CATALOG_BRANDS: readonly CatalogBrand[] = [
  {id: 'evroopt', name: 'Евроопт', color: '#8fc641', aliases: ['евроопт'], logoKey: 'evroopt', isHidden: false},
  {id: 'gippo', name: 'Гиппо', color: '#e95d1f', aliases: ['гиппо', 'gippo'], logoKey: 'gippo', isHidden: false},
  {id: 'green', name: 'Green', color: '#0da018', aliases: ['green', 'грин'], logoKey: 'green', isHidden: false},
  {id: 'korona', name: 'Корона', color: '#f9683a', aliases: ['корона'], logoKey: 'korona', isHidden: false},
  {id: 'oma', name: 'ОМА', color: '#0da018', aliases: ['ома', 'oma'], logoKey: 'oma', isHidden: false},
  {id: 'ostin', name: 'Ostin', color: '#1b1b1b', aliases: ['ostin', 'o’stin', "o'stin"], logoKey: 'ostin', isHidden: false},
  {id: 'prostore', name: 'ProStore', color: '#042d95', aliases: ['prostore', 'простор'], logoKey: 'prostore', isHidden: false},
  {id: 'sosedi', name: 'Соседи', color: '#0081c9', aliases: ['соседи'], logoKey: 'sosedi', isHidden: false},
  {id: 'tri-ceny', name: 'Три цены', color: '#0088d0', aliases: ['три цены', '3 цены'], logoKey: 'tri-ceny', isHidden: false},
  {id: 'varka', name: 'VARKA', color: '#1b1b1b', aliases: ['varka', 'варка'], logoKey: 'varka', isHidden: false},
];

export function normalizeBrandName(value: string): string {
  return value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
}

export function getCatalogBrand(
  id: string,
  catalog: readonly CatalogBrand[] = CATALOG_BRANDS,
): CatalogBrand | undefined {
  return catalog.find(brand => brand.id === id);
}

export function getSelectableCatalogBrands(
  catalog: readonly CatalogBrand[] = CATALOG_BRANDS,
): CatalogBrand[] {
  return catalog
    .filter(brand => !brand.isHidden)
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
}

export function findCatalogBrands(
  query: string,
  catalog: readonly CatalogBrand[] = CATALOG_BRANDS,
): CatalogBrand[] {
  const normalizedQuery = normalizeBrandName(query);
  return getSelectableCatalogBrands(catalog).filter(brand =>
    normalizeBrandName(brand.name).includes(normalizedQuery),
  );
}
