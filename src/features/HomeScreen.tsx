import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  FAB,
  Snackbar,
  Surface,
  Text,
} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import type {RootStackParamList} from '../app/navigation';
import {useServices} from '../app/services';
import {sortCards} from '../packages/list-order';
import {
  openApplicationSettings,
} from '../packages/geo-session/native';
import {
  BrandLogo,
  cardDisplayColor,
  cardDisplayName,
} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation, route}: Props) {
  const {t} = useTranslation();
  const {
    cards,
    ready,
    reloadCards,
    nearestByBrandId,
    locationError,
  } = useServices();

  useFocusEffect(
    useCallback(() => {
      void reloadCards();
    }, [reloadCards]),
  );

  const distances = new Map(
    [...nearestByBrandId].map(([brandId, nearest]) => [
      brandId,
      nearest.distanceMeters,
    ]),
  );
  const sorted = sortCards(cards, distances, cardDisplayName);

  if (!ready) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text variant="labelLarge" style={styles.eyebrow}>
          {t('home.eyebrow')}
        </Text>
        <Text variant="displaySmall" style={styles.title}>
          {t('home.title')}
        </Text>
      </View>
      {locationError && (
        <Pressable onPress={() => void openApplicationSettings()}>
          <Surface style={styles.notice} elevation={0}>
            <Text>{t('home.geoDenied')}</Text>
            <Text style={styles.noticeAction}>{t('common.settings')}</Text>
          </Surface>
        </Pressable>
      )}
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyLarge">{t('home.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={card => card.id}
          contentContainerStyle={styles.list}
          renderItem={({item}) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Card', {id: item.id})}>
              <Surface
                elevation={1}
                style={[
                  styles.card,
                  {borderLeftColor: cardDisplayColor(item)},
                ]}>
                <BrandLogo card={item} />
                <View style={styles.cardText}>
                  <Text variant="titleMedium">{cardDisplayName(item)}</Text>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item.code}
                  </Text>
                </View>
                <Text style={styles.favorite}>
                  {item.isFavorite ? '♥' : '♡'}
                </Text>
              </Surface>
            </Pressable>
          )}
        />
      )}
      <FAB
        icon="plus"
        label={t('home.add')}
        style={styles.fab}
        onPress={() => navigation.navigate('CardForm')}
      />
      <Snackbar
        visible={Boolean(route.params?.message)}
        onDismiss={() => navigation.setParams({message: undefined})}>
        {route.params?.message ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f7f2'},
  loading: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12},
  eyebrow: {
    color: '#68736c',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {fontWeight: '800', letterSpacing: -1.5},
  list: {gap: 12, padding: 20, paddingBottom: 110},
  card: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderLeftWidth: 7,
    padding: 16,
  },
  cardText: {flex: 1, gap: 4, marginLeft: 14},
  favorite: {color: '#e44961', fontSize: 25},
  empty: {flex: 1, justifyContent: 'center', padding: 32},
  notice: {marginHorizontal: 20, borderRadius: 16, padding: 14},
  noticeAction: {fontWeight: '700', marginTop: 4},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    backgroundColor: '#c8f04b',
  },
});
