export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Store = Coordinates & {
  id: string;
  catalogBrandId: string;
  name: string;
};

export type StoreSnapshot = {
  generatedAt: string;
  stores: Store[];
};

export type NearestStore = {
  store: Store;
  distanceMeters: number;
};

const EARTH_RADIUS_METERS = 6_371_000;
export const NEARBY_RADIUS_METERS = 5_000;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  from: Coordinates,
  to: Coordinates,
): number {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const startLatitude = radians(from.latitude);
  const endLatitude = radians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function findNearestStore(
  catalogBrandId: string,
  position: Coordinates,
  snapshot: StoreSnapshot,
): NearestStore | null {
  let nearest: NearestStore | null = null;
  for (const store of snapshot.stores) {
    if (store.catalogBrandId !== catalogBrandId) {
      continue;
    }
    const distanceMeters = haversineDistanceMeters(position, store);
    if (
      distanceMeters <= NEARBY_RADIUS_METERS &&
      (!nearest || distanceMeters < nearest.distanceMeters)
    ) {
      nearest = {store, distanceMeters};
    }
  }
  return nearest;
}
