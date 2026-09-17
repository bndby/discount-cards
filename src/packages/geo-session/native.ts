import Geolocation, {
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import {
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import type {Coordinates} from '../store-locator';

export async function requestForegroundLocation(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return (
      (await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      )) === PermissionsAndroid.RESULTS.GRANTED
    );
  }
  return new Promise(resolve => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    );
  });
}

export function watchForegroundLocation(
  onPosition: (position: Coordinates) => void,
  onError: (error: Error) => void,
): () => void {
  const watchId = Geolocation.watchPosition(
    (position: GeolocationResponse) =>
      onPosition({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
    error => onError(new Error(error.message)),
    {
      enableHighAccuracy: true,
      distanceFilter: 50,
      timeout: 10_000,
      maximumAge: 15_000,
    },
  );
  return () => Geolocation.clearWatch(watchId);
}

export async function openApplicationSettings(): Promise<void> {
  await Linking.openSettings();
}
