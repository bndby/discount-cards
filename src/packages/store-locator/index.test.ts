import {
  findNearestStore,
  haversineDistanceMeters,
  StoreSnapshot,
} from './index';

const snapshot: StoreSnapshot = {
  generatedAt: '2026-09-17T00:00:00.000Z',
  stores: [
    {id: 'near', catalogBrandId: 'green', name: 'Green', latitude: 53.9, longitude: 27.56},
    {id: 'far', catalogBrandId: 'green', name: 'Грин', latitude: 54, longitude: 27.56},
    {id: 'other', catalogBrandId: 'evroopt', name: 'Евроопт', latitude: 53.901, longitude: 27.56},
  ],
};

describe('снимок магазинов', () => {
  it('выбирает ближайший магазин бренда в круге 5 км', () => {
    expect(
      findNearestStore('green', {latitude: 53.899, longitude: 27.56}, snapshot)
        ?.store.id,
    ).toBe('near');
  });

  it('не возвращает точку за пределами круга', () => {
    expect(
      findNearestStore('green', {latitude: 53.7, longitude: 27.56}, snapshot),
    ).toBeNull();
  });

  it('считает расстояние по гаверсинусу', () => {
    expect(
      haversineDistanceMeters(
        {latitude: 0, longitude: 0},
        {latitude: 0, longitude: 1},
      ),
    ).toBeCloseTo(111_195, -2);
  });
});
