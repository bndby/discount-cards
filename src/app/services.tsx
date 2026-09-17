import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {DiscountCard} from '../packages/discount-card';
import type {CardRepository} from '../packages/card-repository';
import {
  openCardDatabase,
  SQLiteCardRepository,
} from '../packages/card-repository/sqlite';
import {GeoSession} from '../packages/geo-session';
import {
  requestForegroundLocation,
  watchForegroundLocation,
} from '../packages/geo-session/native';
import {
  findNearestStore,
  type Coordinates,
  type NearestStore,
  type StoreSnapshot,
} from '../packages/store-locator';

const snapshot = require('../assets/store-snapshot.json') as StoreSnapshot;
const repository = new SQLiteCardRepository(openCardDatabase());
const geoSession = new GeoSession();

type Services = {
  repository: CardRepository;
  cards: DiscountCard[];
  ready: boolean;
  reloadCards(): Promise<void>;
  position: Coordinates | null;
  nearestByBrandId: ReadonlyMap<string, NearestStore>;
  locationError: boolean;
};

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({children}: React.PropsWithChildren) {
  const [cards, setCards] = useState<DiscountCard[]>([]);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState(false);

  const reloadCards = useCallback(async () => {
    setCards(await repository.list());
  }, []);

  useEffect(() => {
    repository
      .initialize()
      .then(reloadCards)
      .finally(() => setReady(true));
  }, [reloadCards]);

  const hasCatalogCards = cards.some(card => card.catalogBrandId);
  useEffect(() => {
    if (!hasCatalogCards) {
      return;
    }
    let stop: (() => void) | undefined;
    requestForegroundLocation()
      .then(granted => {
        if (!granted) {
          setLocationError(true);
          return;
        }
        stop = watchForegroundLocation(
          nextPosition => {
            const isFirstPosition = geoSession.currentPosition() === null;
            const movedBeyondCache = geoSession.updatePosition(nextPosition);
            if (isFirstPosition || movedBeyondCache) {
              setPosition(nextPosition);
            }
            setLocationError(false);
          },
          () => setLocationError(true),
        );
      })
      .catch(() => setLocationError(true));
    return () => stop?.();
  }, [hasCatalogCards]);

  const nearestByBrandId = useMemo(() => {
    const nearest = new Map<string, NearestStore>();
    if (!position) {
      return nearest;
    }
    for (const card of cards) {
      const brandId = card.catalogBrandId;
      if (brandId && !nearest.has(brandId)) {
        const found = findNearestStore(brandId, position, snapshot);
        if (found) {
          nearest.set(brandId, found);
        }
      }
    }
    return nearest;
  }, [cards, position]);

  return (
    <ServicesContext.Provider
      value={{
        repository,
        cards,
        ready,
        reloadCards,
        position,
        nearestByBrandId,
        locationError,
      }}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('ServicesProvider is missing');
  }
  return services;
}
