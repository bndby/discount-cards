import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  Menu,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {useTranslation} from 'react-i18next';

import type {RootStackParamList} from '../app/navigation';
import {useServices} from '../app/services';
import {
  findCatalogBrands,
  getCatalogBrand,
  getSelectableCatalogBrands,
} from '../packages/catalog';
import {
  CODE_TYPES,
  normalizeDraft,
  validateCardDraft,
  type CardDraft,
  type CardValidationErrors,
  type DiscountCard,
} from '../packages/discount-card';
import {
  absolutePhotoPath,
  deleteCardPhoto,
  importCardPhoto,
} from '../packages/card-repository/media';

type Props = NativeStackScreenProps<RootStackParamList, 'CardForm'>;

const EMPTY_DRAFT: CardDraft = {
  catalogBrandId: null,
  customBrandName: null,
  code: '',
  codeType: 'text',
  colorOverride: null,
  isFavorite: false,
  photos: [],
};

export function CardFormScreen({navigation, route}: Props) {
  const {t} = useTranslation();
  const {repository, reloadCards} = useServices();
  const id = route.params?.id;
  const [draft, setDraft] = useState<CardDraft>(EMPTY_DRAFT);
  const [initial, setInitial] = useState<CardDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<CardValidationErrors>({});
  const [brandQuery, setBrandQuery] = useState('');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [duplicate, setDuplicate] = useState<DiscountCard | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const importedPhotos = useRef(new Set<string>());
  const allowExit = useRef(false);

  useEffect(() => {
    navigation.setOptions({
      title: t(id ? 'card.editTitle' : 'card.newTitle'),
    });
  }, [id, navigation, t]);

  useEffect(() => {
    if (!id) {
      return;
    }
    repository.get(id).then(card => {
      if (card) {
        const loaded: CardDraft = {
          catalogBrandId: card.catalogBrandId,
          customBrandName: card.customBrandName,
          code: card.code,
          codeType: card.codeType,
          colorOverride: card.colorOverride,
          isFavorite: card.isFavorite,
          photos: card.photos,
        };
        setDraft(loaded);
        setInitial(loaded);
      }
    });
  }, [id, repository]);

  useEffect(() => {
    if (route.params?.scannedCode && route.params.scannedType) {
      setDraft(current => ({
        ...current,
        code: route.params?.scannedCode ?? current.code,
        codeType: route.params?.scannedType ?? current.codeType,
      }));
      navigation.setParams({
        id,
        scannedCode: undefined,
        scannedType: undefined,
      });
    }
  }, [
    id,
    navigation,
    route.params?.scannedCode,
    route.params?.scannedType,
  ]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (!isDirty || allowExit.current) {
          return;
        }
        event.preventDefault();
        Alert.alert(t('card.discardConfirm'), undefined, [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('common.notSave'),
            style: 'destructive',
            onPress: () => {
              const original = new Set(initial.photos);
              importedPhotos.current.forEach(photo => {
                if (!original.has(photo)) {
                  void deleteCardPhoto(photo);
                }
              });
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      }),
    [initial.photos, isDirty, navigation, t],
  );

  const visibleBrands = useMemo(
    () =>
      brandQuery
        ? findCatalogBrands(brandQuery)
        : getSelectableCatalogBrands(),
    [brandQuery],
  );

  const pickPhoto = async (
    source: 'camera' | 'library',
  ): Promise<string | null> => {
    if (
      source === 'camera' &&
      Platform.OS === 'android' &&
      (await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      )) !== PermissionsAndroid.RESULTS.GRANTED
    ) {
      Alert.alert(t('card.cameraDenied'), undefined, [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.settings'),
          onPress: () => void Linking.openSettings(),
        },
      ]);
      return null;
    }
    const result =
      source === 'camera'
        ? await launchCamera({mediaType: 'photo', includeBase64: false})
        : await launchImageLibrary({mediaType: 'photo', includeBase64: false});
    if (result.errorCode === 'permission') {
      Alert.alert(t('card.cameraDenied'), undefined, [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.settings'),
          onPress: () => void Linking.openSettings(),
        },
      ]);
      return null;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return null;
    }
    const extension = asset.fileName?.split('.').pop() ?? 'jpg';
    const relativePath = await importCardPhoto(asset.uri, extension);
    importedPhotos.current.add(relativePath);
    return relativePath;
  };

  const addPhoto = async (source: 'camera' | 'library') => {
    setPhotoMenuOpen(false);
    if (draft.photos.length >= 2) {
      setErrors(current => ({...current, photos: 'card.validation.photos'}));
      return;
    }
    const relativePath = await pickPhoto(source);
    if (!relativePath) {
      return;
    }
    setDraft(current => ({
      ...current,
      photos: [...current.photos, relativePath],
    }));
  };

  const replacePhoto = async (
    oldPhoto: string,
    source: 'camera' | 'library',
  ) => {
    const relativePath = await pickPhoto(source);
    if (!relativePath) {
      return;
    }
    setDraft(current => ({
      ...current,
      photos: current.photos.map(photo =>
        photo === oldPhoto ? relativePath : photo,
      ),
    }));
  };

  const chooseReplacementSource = (photo: string) => {
    Alert.alert(t('card.replacePhoto'), undefined, [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('card.takePhoto'),
        onPress: () => void replacePhoto(photo, 'camera'),
      },
      {
        text: t('card.choosePhoto'),
        onPress: () => void replacePhoto(photo, 'library'),
      },
    ]);
  };

  const removePhoto = (photo: string) => {
    setDraft(current => ({
      ...current,
      photos: current.photos.filter(item => item !== photo),
    }));
  };

  const save = async (ignoreDuplicate = false) => {
    const normalized = normalizeDraft(draft);
    const validation = validateCardDraft(normalized);
    setErrors(validation);
    if (Object.keys(validation).length) {
      return;
    }
    const matches = await repository.findByCode(normalized.code, id);
    if (matches.length && !ignoreDuplicate) {
      setDuplicate(matches[0]);
      return;
    }
    if (id) {
      await repository.update(id, normalized);
    } else {
      await repository.create(normalized);
    }
    const retained = new Set(normalized.photos);
    await Promise.all(
      initial.photos
        .filter(photo => !retained.has(photo))
        .map(deleteCardPhoto),
    );
    await Promise.all(
      [...importedPhotos.current]
        .filter(photo => !retained.has(photo))
        .map(deleteCardPhoto),
    );
    importedPhotos.current.clear();
    allowExit.current = true;
    setInitial(normalized);
    await reloadCards();
    navigation.navigate('Home', {message: t('card.saved')});
  };

  const selectedBrand = draft.catalogBrandId
    ? getCatalogBrand(draft.catalogBrandId)
    : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text variant="titleMedium">{t('card.brand')}</Text>
      <Chip
        selected={!draft.catalogBrandId}
        onPress={() =>
          setDraft(current => ({
            ...current,
            catalogBrandId: null,
            customBrandName: current.customBrandName ?? '',
          }))
        }>
        {t('card.otherBrand')}
      </Chip>
      {!draft.catalogBrandId && (
        <TextInput
          label={t('card.brandName')}
          value={draft.customBrandName ?? ''}
          error={Boolean(errors.brand)}
          onChangeText={customBrandName =>
            setDraft(current => ({...current, customBrandName}))
          }
        />
      )}
      <TextInput
        label={t('card.searchBrand')}
        value={brandQuery}
        onChangeText={setBrandQuery}
      />
      <View style={styles.chips}>
        {visibleBrands.map(brand => (
          <Chip
            key={brand.id}
            selected={draft.catalogBrandId === brand.id}
            onPress={() =>
              setDraft(current => ({
                ...current,
                catalogBrandId: brand.id,
                customBrandName: null,
              }))
            }>
            {brand.name}
          </Chip>
        ))}
      </View>
      <HelperText type="error" visible={Boolean(errors.brand)}>
        {errors.brand ? t(errors.brand) : ''}
      </HelperText>

      <TextInput
        label={t('card.code')}
        value={draft.code}
        error={Boolean(errors.code)}
        autoCapitalize="none"
        onChangeText={code => setDraft(current => ({...current, code}))}
        right={
          <TextInput.Icon
            icon="barcode-scan"
            onPress={() => navigation.navigate('Scanner', {cardId: id})}
          />
        }
      />
      <HelperText type="error" visible={Boolean(errors.code)}>
        {errors.code ? t(errors.code) : ''}
      </HelperText>

      <Menu
        visible={typeMenuOpen}
        onDismiss={() => setTypeMenuOpen(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setTypeMenuOpen(true)}>
            {t(`codeTypes.${draft.codeType}`)}
          </Button>
        }>
        {CODE_TYPES.map(type => (
          <Menu.Item
            key={type}
            title={t(`codeTypes.${type}`)}
            onPress={() => {
              setDraft(current => ({...current, codeType: type}));
              setTypeMenuOpen(false);
            }}
          />
        ))}
      </Menu>

      <TextInput
        label={t('card.color')}
        placeholder={selectedBrand?.color ?? '#68736c'}
        value={draft.colorOverride ?? ''}
        onChangeText={colorOverride =>
          setDraft(current => ({
            ...current,
            colorOverride: colorOverride || null,
          }))
        }
        right={
          draft.colorOverride ? (
            <TextInput.Icon
              icon="restore"
              onPress={() =>
                setDraft(current => ({...current, colorOverride: null}))
              }
            />
          ) : null
        }
      />
      <View style={styles.switchRow}>
        <Text>{t('card.favorite')}</Text>
        <Switch
          value={draft.isFavorite}
          onValueChange={isFavorite =>
            setDraft(current => ({...current, isFavorite}))
          }
        />
      </View>

      <View style={styles.photos}>
        {draft.photos.map(photo => (
          <View key={photo}>
            <Image
              source={{uri: `file://${absolutePhotoPath(photo)}`}}
              style={styles.photo}
            />
            <Button onPress={() => removePhoto(photo)}>
              {t('card.removePhoto')}
            </Button>
            <Button onPress={() => chooseReplacementSource(photo)}>
              {t('card.replacePhoto')}
            </Button>
          </View>
        ))}
      </View>
      <Menu
        visible={photoMenuOpen}
        onDismiss={() => setPhotoMenuOpen(false)}
        anchor={
          <Button
            icon="camera"
            disabled={draft.photos.length >= 2}
            onPress={() => setPhotoMenuOpen(true)}>
            {t('card.addPhoto')}
          </Button>
        }>
        <Menu.Item
          title={t('card.takePhoto')}
          onPress={() => void addPhoto('camera')}
        />
        <Menu.Item
          title={t('card.choosePhoto')}
          onPress={() => void addPhoto('library')}
        />
      </Menu>
      <HelperText type="error" visible={Boolean(errors.photos)}>
        {errors.photos ? t(errors.photos) : ''}
      </HelperText>

      {duplicate && (
        <View style={styles.duplicate}>
          <Text>{t('card.duplicate')}</Text>
          <Button
            onPress={() => navigation.navigate('Card', {id: duplicate.id})}>
            {t('card.openDuplicate')}
          </Button>
          <Button mode="contained" onPress={() => void save(true)}>
            {t('common.save')}
          </Button>
        </View>
      )}
      <Button mode="contained" onPress={() => void save()}>
        {t('common.save')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f7f2'},
  content: {gap: 12, padding: 20, paddingBottom: 48},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photos: {flexDirection: 'row', gap: 12},
  photo: {width: 130, height: 90, borderRadius: 14},
  duplicate: {gap: 8, borderRadius: 16, backgroundColor: '#eeeae0', padding: 14},
});
