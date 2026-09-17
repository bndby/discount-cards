import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import * as bwipjs from '@bwip-js/react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type LineLayerStyle,
} from '@maplibre/maplibre-react-native';
import {
  getBrightnessLevel,
  setBrightnessLevel,
} from 'react-native-brightness-newarch';
import {useKeepAwake} from '@sayem314/react-native-keep-awake';
import Config from 'react-native-config';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Surface,
  Text,
} from 'react-native-paper';
import {useTranslation} from 'react-i18next';

import type {RootStackParamList} from '../app/navigation';
import {useServices} from '../app/services';
import {
  absolutePhotoPath,
  deleteCardPhotos,
} from '../packages/card-repository/media';
import type {DiscountCard} from '../packages/discount-card';
import {barcodeRendererName} from '../packages/code-type';
import {
  buildExternalMapUrl,
  OrsDirections,
  type Route,
  type TravelMode,
} from '../packages/routing';
import {BrandLogo, cardDisplayName} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'Card'>;
const OPEN_FREE_MAP_STYLE =
  'https://tiles.openfreemap.org/styles/liberty';
const walkingLineStyle: LineLayerStyle = {
  lineColor: '#1c78d0',
  lineWidth: 5,
};
const drivingLineStyle: LineLayerStyle = {
  lineColor: '#d05a1c',
  lineWidth: 5,
};

export function CardScreen({navigation, route}: Props) {
  useKeepAwake();
  const {t} = useTranslation();
  const {
    repository,
    reloadCards,
    position,
    nearestByBrandId,
  } = useServices();
  const [card, setCard] = useState<DiscountCard | null>(null);
  const [barcodeUri, setBarcodeUri] = useState<string | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [walking, setWalking] = useState<Route | null>(null);
  const [driving, setDriving] = useState<Route | null>(null);
  const [mapAvailable, setMapAvailable] = useState(true);
  const previousBrightness = useRef<number | null>(null);

  const load = useCallback(async () => {
    const found = await repository.get(route.params.id);
    setCard(found);
  }, [repository, route.params.id]);

  useFocusEffect(
    useCallback(() => {
      void repository.recordPresentationOpen(route.params.id).then(async () => {
        await load();
        await reloadCards();
      });
    }, [load, reloadCards, repository, route.params.id]),
  );

  useEffect(() => {
    if (!card) {
      return;
    }
    navigation.setOptions({title: cardDisplayName(card)});
    const renderer = barcodeRendererName(card.codeType);
    if (!renderer) {
      return;
    }
    bwipjs
      .toDataURL({
        bcid: renderer,
        text: card.code,
        scale: card.codeType === 'qr' ? 5 : 3,
        height: 18,
        includetext: false,
        padding: 8,
        backgroundcolor: 'FFFFFF',
      })
      .then(result => setBarcodeUri(result.uri))
      .catch(() => setRenderFailed(true));
  }, [card, navigation]);

  const nearest = card?.catalogBrandId
    ? nearestByBrandId.get(card.catalogBrandId)
    : undefined;

  useEffect(() => {
    if (!nearest || !position) {
      setWalking(null);
      setDriving(null);
      return;
    }
    const directions = new OrsDirections(Config.ORS_API_KEY ?? '');
    void Promise.all([
      directions.route(position, nearest.store, 'walking'),
      directions.route(position, nearest.store, 'driving'),
    ]).then(([walkingRoute, drivingRoute]) => {
      setWalking(walkingRoute);
      setDriving(drivingRoute);
    });
  }, [nearest, position]);

  useFocusEffect(
    useCallback(
      () => () => {
        if (previousBrightness.current !== null) {
          setBrightnessLevel(previousBrightness.current);
          previousBrightness.current = null;
        }
      },
      [],
    ),
  );

  if (!card) {
    return <ActivityIndicator style={styles.loading} />;
  }

  const increaseBrightness = async () => {
    previousBrightness.current ??= await getBrightnessLevel();
    setBrightnessLevel(1);
  };

  const openRoute = async (mode: TravelMode) => {
    if (!nearest) {
      return;
    }
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await Linking.openURL(buildExternalMapUrl(platform, nearest.store, mode));
  };

  const remove = () => {
    Alert.alert(t('card.deleteConfirm'), undefined, [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void repository.delete(card.id).then(async () => {
            await deleteCardPhotos(card.photos);
            await reloadCards();
            navigation.popTo('Home', {message: t('card.deleted')});
          });
        },
      },
    ]);
  };

  const routeFeature = (routeValue: Route) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: routeValue.coordinates.map(point => [
        point.longitude,
        point.latitude,
      ]),
    },
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}>
      <Surface style={styles.codeCard} elevation={1}>
        <View style={styles.brand}>
          <BrandLogo card={card} size={58} />
          <Text variant="headlineSmall">{cardDisplayName(card)}</Text>
          <IconButton
            icon={card.isFavorite ? 'heart' : 'heart-outline'}
            iconColor="#e44961"
            onPress={() =>
              void repository
                .update(card.id, {...card, isFavorite: !card.isFavorite})
                .then(load)
            }
          />
        </View>
        {barcodeUri ? (
          <Image
            source={{uri: barcodeUri}}
            resizeMode="contain"
            style={styles.barcode}
          />
        ) : null}
        <Text selectable variant="headlineMedium" style={styles.code}>
          {card.code}
        </Text>
        {(renderFailed || card.codeType === 'text') && card.codeType !== 'text' ? (
          <Text>{t('card.renderUnavailable')}</Text>
        ) : null}
        <Button icon="brightness-7" onPress={() => void increaseBrightness()}>
          {t('card.increaseBrightness')}
        </Button>
      </Surface>

      {card.photos.length ? (
        <ScrollView horizontal contentContainerStyle={styles.photos}>
          {card.photos.map(photo => (
            <Image
              key={photo}
              source={{uri: `file://${absolutePhotoPath(photo)}`}}
              style={styles.photo}
            />
          ))}
        </ScrollView>
      ) : null}

      {nearest ? (
        <View style={styles.mapContainer}>
          {mapAvailable ? (
            <Map
              mapStyle={OPEN_FREE_MAP_STYLE}
              style={styles.map}
              onDidFailLoadingMap={() => setMapAvailable(false)}>
              <Camera
                initialViewState={{
                  center: [
                    nearest.store.longitude,
                    nearest.store.latitude,
                  ],
                  zoom: 14,
                }}
              />
              <Marker
                id="store"
                lngLat={[
                  nearest.store.longitude,
                  nearest.store.latitude,
                ]}>
                <View style={styles.marker} />
              </Marker>
              {walking ? (
                <GeoJSONSource id="walking" data={routeFeature(walking)}>
                  <Layer
                    id="walking-line"
                    type="line"
                    style={walkingLineStyle}
                  />
                </GeoJSONSource>
              ) : null}
              {driving ? (
                <GeoJSONSource id="driving" data={routeFeature(driving)}>
                  <Layer
                    id="driving-line"
                    type="line"
                    style={drivingLineStyle}
                  />
                </GeoJSONSource>
              ) : null}
            </Map>
          ) : null}
          <View style={styles.routes}>
            <Button onPress={() => void openRoute('walking')}>
              {walking
                ? t('card.walking', {minutes: walking.durationMinutes})
                : t('card.walkingOpen')}
            </Button>
            <Button onPress={() => void openRoute('driving')}>
              {driving
                ? t('card.driving', {minutes: driving.durationMinutes})
                : t('card.drivingOpen')}
            </Button>
          </View>
        </View>
      ) : (
        <Text style={styles.unavailable}>{t('card.routeUnavailable')}</Text>
      )}

      <View style={styles.actions}>
        <Button
          mode="contained"
          icon="pencil"
          onPress={() => navigation.navigate('CardForm', {id: card.id})}>
          {t('common.edit')}
        </Button>
        <Button textColor="#ba1a1a" icon="delete" onPress={remove}>
          {t('common.delete')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f7f2'},
  content: {gap: 18, padding: 20, paddingBottom: 42},
  loading: {flex: 1},
  codeCard: {gap: 18, borderRadius: 24, padding: 18},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 12},
  barcode: {width: '100%', height: 190},
  code: {textAlign: 'center', fontWeight: '700'},
  photos: {gap: 12},
  photo: {width: 260, height: 180, borderRadius: 20},
  mapContainer: {overflow: 'hidden', borderRadius: 22},
  map: {height: 280},
  routes: {backgroundColor: '#ffffff', padding: 10},
  unavailable: {textAlign: 'center', color: '#68736c', padding: 24},
  actions: {gap: 8},
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#e44961',
  },
});
