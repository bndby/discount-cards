import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useRef, useState} from 'react';
import {
  AppState,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  IconButton,
  Text,
} from 'react-native-paper';
import {
  Camera,
  useCameraPermission,
  useCameraDevice,
} from 'react-native-vision-camera';
import {
  useBarcodeScannerOutput,
  type Barcode,
} from 'react-native-vision-camera-barcode-scanner';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Torch from 'react-native-torch';
import {useTranslation} from 'react-i18next';

import type {RootStackParamList} from '../app/navigation';
import {
  normalizeScannedType,
  SCANNER_FORMATS,
} from '../packages/code-type';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

export function ScannerScreen({navigation, route}: Props) {
  const {t} = useTranslation();
  const device = useCameraDevice('back');
  const isFocused = useIsFocused();
  const {
    hasPermission,
    canRequestPermission,
    requestPermission,
  } = useCameraPermission();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const [appActive, setAppActive] = useState(
    AppState.currentState === 'active',
  );
  const accepted = useRef(false);
  const lastSeen = useRef<{key: string; count: number} | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setAppActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  const accept = (barcodes: Barcode[]) => {
    if (accepted.current) {
      return;
    }
    const barcode = barcodes.find(item => item.rawValue);
    if (!barcode?.rawValue) {
      return;
    }
    const key = `${barcode.format}:${barcode.rawValue}`;
    lastSeen.current =
      lastSeen.current?.key === key
        ? {key, count: lastSeen.current.count + 1}
        : {key, count: 1};
    if (lastSeen.current.count < 2) {
      return;
    }
    const codeType = normalizeScannedType(barcode.format);
    if (!codeType) {
      setError(t('scanner.unsupported'));
      return;
    }
    accepted.current = true;
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.popTo('CardForm', {
      id: route.params.cardId,
      scannedCode: barcode.rawValue,
      scannedType: codeType,
    });
  };

  const scannerOutput = useBarcodeScannerOutput({
    barcodeFormats: SCANNER_FORMATS,
    onBarcodeScanned: accept,
    onError: () => setError(t('scanner.unavailable')),
  });

  const toggleTorch = () => {
    const nextValue = !torch;
    Torch.switchState(nextValue);
    setTorch(nextValue);
  };

  useEffect(
    () => () => {
      Torch.switchState(false);
    },
    [],
  );

  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text variant="bodyLarge">{t('scanner.permission')}</Text>
        {canRequestPermission ? (
          <Button mode="contained" onPress={() => void requestPermission()}>
            {t('card.scan')}
          </Button>
        ) : (
          <Button onPress={() => void Linking.openSettings()}>
            {t('common.settings')}
          </Button>
        )}
        <Button onPress={() => navigation.goBack()}>
          {t('scanner.manual')}
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallback}>
        <Text>{t('scanner.unavailable')}</Text>
        <Button onPress={() => navigation.goBack()}>
          {t('scanner.manual')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && appActive && !accepted.current}
        outputs={[scannerOutput]}
      />
      <View style={styles.frame} />
      <View style={styles.controls}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <IconButton
          icon={torch ? 'flashlight-off' : 'flashlight'}
          mode="contained"
          accessibilityLabel={t('scanner.torch')}
          onPress={toggleTorch}
        />
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}>
          {t('scanner.manual')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#000000'},
  fallback: {flex: 1, justifyContent: 'center', gap: 16, padding: 28},
  frame: {
    position: 'absolute',
    top: '28%',
    left: '10%',
    width: '80%',
    height: '35%',
    borderWidth: 3,
    borderColor: '#c8f04b',
    borderRadius: 24,
  },
  controls: {
    position: 'absolute',
    right: 20,
    bottom: 36,
    left: 20,
    alignItems: 'center',
    gap: 10,
  },
  error: {
    color: '#ffffff',
    backgroundColor: '#8b1a1a',
    borderRadius: 12,
    padding: 10,
  },
});
