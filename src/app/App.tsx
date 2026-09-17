import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar} from 'react-native';

import './i18n';
import type {RootStackParamList} from './navigation';
import {ServicesProvider} from './services';
import {appTheme} from './theme';
import {HomeScreen} from '../features/HomeScreen';
import {CardScreen} from '../features/CardScreen';
import {CardFormScreen} from '../features/CardFormScreen';
import {ScannerScreen} from '../features/ScannerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <ServicesProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" />
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShadowVisible: false,
                headerStyle: {backgroundColor: '#f7f7f2'},
                contentStyle: {backgroundColor: '#f7f7f2'},
              }}>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{headerShown: false}}
              />
              <Stack.Screen name="Card" component={CardScreen} />
              <Stack.Screen name="CardForm" component={CardFormScreen} />
              <Stack.Screen
                name="Scanner"
                component={ScannerScreen}
                options={{presentation: 'fullScreenModal'}}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </ServicesProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
