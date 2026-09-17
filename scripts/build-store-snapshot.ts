import {readFileSync, writeFileSync} from 'node:fs';

import {
  CATALOG_BRANDS,
  normalizeBrandName,
} from '../src/packages/catalog';

type OsmElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: {lat: number; lon: number};
  tags?: {brand?: string; name?: string};
};

const [, , inputPath, outputPath = 'src/assets/store-snapshot.json'] =
  process.argv;

if (!inputPath) {
  throw new Error(
    'Usage: npm run assets:stores -- <overpass.json> [output.json]',
  );
}

const aliases = new Map(
  CATALOG_BRANDS.flatMap(brand =>
    [brand.name, ...brand.aliases].map(
      alias => [normalizeBrandName(alias), brand.id] as const,
    ),
  ),
);

const input = JSON.parse(readFileSync(inputPath, 'utf8')) as {
  elements: OsmElement[];
};
const stores = input.elements.flatMap(element => {
  const name = element.tags?.brand ?? element.tags?.name;
  const normalizedName = name && normalizeBrandName(name);
  const catalogBrandId = normalizedName && aliases.get(normalizedName);
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (!name || !catalogBrandId || latitude == null || longitude == null) {
    return [];
  }
  return [
    {
      id: `${element.type}/${element.id}`,
      catalogBrandId,
      name,
      latitude,
      longitude,
    },
  ];
});

writeFileSync(
  outputPath,
  `${JSON.stringify(
    {generatedAt: new Date().toISOString(), stores},
    null,
    2,
  )}\n`,
);
