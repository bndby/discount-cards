import {
  MD3LightTheme,
  type MD3Theme,
} from 'react-native-paper';

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 5,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1f3026',
    onPrimary: '#ffffff',
    primaryContainer: '#c8f04b',
    onPrimaryContainer: '#17231d',
    secondary: '#68736c',
    background: '#f7f7f2',
    surface: '#ffffff',
    surfaceVariant: '#e7ece5',
    outline: '#dde3da',
    error: '#ba1a1a',
  },
};
