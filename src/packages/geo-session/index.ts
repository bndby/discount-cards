import {
  haversineDistanceMeters,
  type Coordinates,
} from '../store-locator';

const CACHE_MOVEMENT_METERS = 500;

export class GeoSession {
  private position: Coordinates | null = null;
  private cacheAnchor: Coordinates | null = null;

  updatePosition(position: Coordinates): boolean {
    const moved =
      this.cacheAnchor !== null &&
      haversineDistanceMeters(this.cacheAnchor, position) >
        CACHE_MOVEMENT_METERS;
    this.position = position;
    if (!this.cacheAnchor || moved) {
      this.cacheAnchor = position;
    }
    return moved;
  }

  currentPosition(): Coordinates | null {
    return this.position;
  }

  clear(): void {
    this.position = null;
    this.cacheAnchor = null;
  }
}
