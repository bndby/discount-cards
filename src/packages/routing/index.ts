import type {Coordinates} from '../store-locator';

export type TravelMode = 'walking' | 'driving';

const TRAVEL_MODES: Record<
  TravelMode,
  {orsProfile: string; appleFlag: string}
> = {
  walking: {orsProfile: 'foot-walking', appleFlag: 'w'},
  driving: {orsProfile: 'driving-car', appleFlag: 'd'},
};

export type Route = {
  coordinates: Coordinates[];
  durationMinutes: number;
};

type OrsResponse = {
  features?: Array<{
    geometry?: {coordinates?: [number, number][]};
    properties?: {summary?: {duration?: number}};
  }>;
};

export class OrsDirections {
  constructor(
    private readonly apiKey: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async route(
    from: Coordinates,
    to: Coordinates,
    mode: TravelMode,
  ): Promise<Route | null> {
    if (!this.apiKey) {
      return null;
    }
    const modeConfig = TRAVEL_MODES[mode];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await this.request(
        `https://api.heigit.org/v2/directions/${modeConfig.orsProfile}/geojson`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/geo+json',
            Authorization: this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: [
              [from.longitude, from.latitude],
              [to.longitude, to.latitude],
            ],
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as OrsResponse;
      const feature = payload.features?.[0];
      const duration = feature?.properties?.summary?.duration;
      const coordinates = feature?.geometry?.coordinates;
      if (!duration || !coordinates) {
        return null;
      }
      return {
        durationMinutes: Math.max(1, Math.round(duration / 60)),
        coordinates: coordinates.map(([longitude, latitude]) => ({
          latitude,
          longitude,
        })),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function buildExternalMapUrl(
  platform: 'ios' | 'android',
  destination: Coordinates,
  mode: TravelMode,
): string {
  const coordinates = `${destination.latitude},${destination.longitude}`;
  if (platform === 'ios') {
    return `https://maps.apple.com/?daddr=${coordinates}&dirflg=${TRAVEL_MODES[mode].appleFlag}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${coordinates}&travelmode=${mode}`;
}
